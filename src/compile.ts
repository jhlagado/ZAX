import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { Diagnostic } from './diagnostics/types.js';
import { DiagnosticIds } from './diagnostics/types.js';
import type { CompileFn, CompilerOptions, CompileResult, PipelineDeps } from './pipeline.js';

import type { ModuleItemNode, ProgramNode, SectionItemNode } from './frontend/ast.js';
import type { ImportNode, ModuleFileNode } from './frontend/ast.js';
import { parseModuleFile } from './frontend/parser.js';
import { makeSourceFile } from './frontend/source.js';
import { stripLineComment } from './frontend/parseParserShared.js';
import { lintCaseStyle } from './lint/case_style.js';
import { emitProgram } from './lowering/emit.js';
import { STARTUP_ENTRY_LABEL } from './lowering/startupInit.js';
import type { Artifact } from './formats/types.js';
import { collectNonBankedSectionKeys } from './sectionKeys.js';
import { canonicalModuleId } from './moduleIdentity.js';
import { validateAssignmentAcceptance } from './semantics/assignmentAcceptance.js';
import { buildEnv } from './semantics/env.js';
import { validateSuccPredAcceptance } from './semantics/succPredAcceptance.js';

function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === 'error');
}

function withDefaults(
  options: CompilerOptions,
): Required<
  Pick<CompilerOptions, 'emitBin' | 'emitHex' | 'emitD8m' | 'emitListing' | 'emitAsm' | 'emitAsm80'>
> {
  const anyPrimaryEmitSpecified = [options.emitBin, options.emitHex, options.emitD8m].some(
    (v) => v !== undefined,
  );

  const emitBin = anyPrimaryEmitSpecified ? (options.emitBin ?? false) : true;
  const emitHex = anyPrimaryEmitSpecified ? (options.emitHex ?? false) : true;
  const emitD8m = anyPrimaryEmitSpecified ? (options.emitD8m ?? false) : true;

  // Listing is a sidecar artifact: default to on unless explicitly suppressed.
  const emitListing = options.emitListing ?? true;
  // ASM trace is a sidecar artifact: default to on unless explicitly suppressed.
  const emitAsm = options.emitAsm ?? true;
  const emitAsm80 = options.emitAsm80 ?? false;

  return { emitBin, emitHex, emitD8m, emitListing, emitAsm, emitAsm80 };
}

function normalizePath(p: string): string {
  return resolve(p);
}

function hasMainFunction(program: ProgramNode): boolean {
  const hasMainInItems = (items: Array<ModuleItemNode | SectionItemNode>): boolean => {
    for (const item of items) {
      if (item.kind === 'FuncDecl' && item.name.toLowerCase() === 'main') return true;
      if (item.kind === 'NamedSection' && item.section === 'code' && hasMainInItems(item.items)) return true;
    }
    return false;
  };
  return program.files.some((moduleFile) => hasMainInItems(moduleFile.items));
}

function importTargets(moduleFile: ModuleFileNode): ImportNode[] {
  return moduleFile.items.filter((i): i is ImportNode => i.kind === 'Import');
}

function importCandidatePath(imp: ImportNode): string {
  if (imp.form === 'path') return imp.specifier;
  return `${imp.specifier}.zax`;
}

function resolveImportCandidates(
  fromModulePath: string,
  imp: ImportNode,
  includeDirs: string[],
): string[] {
  const fromDir = dirname(fromModulePath);
  const candidateRel = importCandidatePath(imp);

  const out: string[] = [];
  out.push(normalizePath(resolve(fromDir, candidateRel)));
  for (const inc of includeDirs) {
    out.push(normalizePath(resolve(inc, candidateRel)));
  }
  // De-dupe while preserving order.
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
}

function resolveIncludeCandidates(
  fromModulePath: string,
  specifier: string,
  includeDirs: string[],
): string[] {
  const fromDir = dirname(fromModulePath);
  const out: string[] = [];
  out.push(normalizePath(resolve(fromDir, specifier)));
  for (const inc of includeDirs) {
    out.push(normalizePath(resolve(inc, specifier)));
  }
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
}

function isIgnorableImportProbeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

type LoadedProgram = {
  program: ProgramNode;
  sourceTexts: Map<string, string>;
  moduleTraversal: string[];
  resolvedImportGraph: Map<string, string[]>;
};

async function loadProgram(
  entryFile: string,
  diagnostics: Diagnostic[],
  options: Pick<CompilerOptions, 'includeDirs'>,
): Promise<LoadedProgram | undefined> {
  const entryPath = normalizePath(entryFile);
  const modules = new Map<string, ModuleFileNode>();
  const sourceTexts = new Map<string, string>();
  const edges = new Map<string, Map<string, { line: number; column: number }>>();
  const includeDirs = (options.includeDirs ?? []).map(normalizePath);
  const moduleIdRootDir = dirname(entryPath);

  type ExpandedSource = { text: string; lineFiles: string[]; lineBaseLines: number[] };

  const expandIncludes = async (
    modulePath: string,
    sourceText: string,
    includeStack: string[],
  ): Promise<ExpandedSource | undefined> => {
    if (!sourceTexts.has(modulePath)) sourceTexts.set(modulePath, sourceText);
    const lines = sourceText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const out: string[] = [];
    const lineFiles: string[] = [];
    const lineBaseLines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] ?? '';
      const stripped = stripLineComment(raw).trim();
      const lineNo = i + 1;
      const match = /^\s*include\s+"([^"]+)"\s*$/.exec(stripped);
      if (!match) {
        out.push(raw);
        lineFiles.push(modulePath);
        lineBaseLines.push(lineNo);
        continue;
      }

      const spec = match[1]!;
      const candidates = resolveIncludeCandidates(modulePath, spec, includeDirs);
      let resolved: string | undefined;
      let resolvedText: string | undefined;
      let hardFailure = false;

      for (const c of candidates) {
        try {
          // eslint-disable-next-line no-await-in-loop
          resolvedText = await readFile(c, 'utf8');
          resolved = c;
          if (!sourceTexts.has(c)) sourceTexts.set(c, resolvedText);
          break;
        } catch (err) {
          if (isIgnorableImportProbeError(err)) {
            continue;
          }
          diagnostics.push({
            id: DiagnosticIds.IoReadFailed,
            severity: 'error',
            message: `Failed to read include candidate "${c}" while resolving includes for "${modulePath}": ${String(
              err,
            )}`,
            file: modulePath,
            line: lineNo,
            column: raw.indexOf('include') + 1 || 1,
          });
          hardFailure = true;
          break;
        }
      }

      if (hardFailure) return undefined;

      if (!resolved || resolvedText === undefined) {
        diagnostics.push({
          id: DiagnosticIds.ImportNotFound,
          severity: 'error',
          message: `Failed to resolve include "${spec}" from "${modulePath}". Tried:\n${candidates
            .map((c) => `- ${c}`)
            .join('\n')}`,
          file: modulePath,
          line: lineNo,
          column: raw.indexOf('include') + 1 || 1,
        });
        out.push(raw);
        lineFiles.push(modulePath);
        lineBaseLines.push(lineNo);
        continue;
      }

      if (includeStack.includes(resolved)) {
        diagnostics.push({
          id: DiagnosticIds.SemanticsError,
          severity: 'error',
          message: `Include cycle detected: "${resolved}" is already active in the include stack.`,
          file: modulePath,
          line: lineNo,
          column: raw.indexOf('include') + 1 || 1,
        });
        out.push(raw);
        lineFiles.push(modulePath);
        lineBaseLines.push(lineNo);
        continue;
      }

      const expanded = await expandIncludes(resolved, resolvedText, [...includeStack, resolved]);
      if (expanded === undefined) return undefined;
      const expandedLines = expanded.text.split('\n');
      for (let j = 0; j < expandedLines.length; j++) {
        out.push(expandedLines[j]!);
        lineFiles.push(expanded.lineFiles[j] ?? resolved);
        lineBaseLines.push(expanded.lineBaseLines[j] ?? j + 1);
      }
    }

    return { text: out.join('\n'), lineFiles, lineBaseLines };
  };

  const loadModule = async (
    modulePath: string,
    importer?: string,
    preloadedText?: string,
  ): Promise<void> => {
    const p = normalizePath(modulePath);
    if (modules.has(p)) return;

    let sourceText: string;
    try {
      sourceText = preloadedText ?? (await readFile(p, 'utf8'));
    } catch (err) {
      diagnostics.push({
        id: DiagnosticIds.IoReadFailed,
        severity: 'error',
        message: importer
          ? `Failed to read imported module "${p}" (imported by "${importer}"): ${String(err)}`
          : `Failed to read entry file: ${String(err)}`,
        file: importer ?? p,
      });
      return;
    }

    if (!sourceTexts.has(p)) sourceTexts.set(p, sourceText);
    const expanded = await expandIncludes(p, sourceText, [p]);
    if (expanded === undefined) return;

    let moduleFile: ModuleFileNode;
    try {
      const sourceFile = makeSourceFile(p, expanded.text);
      sourceFile.lineFiles = expanded.lineFiles;
      sourceFile.lineBaseLines = expanded.lineBaseLines;
      moduleFile = parseModuleFile(p, expanded.text, diagnostics, sourceFile);
    } catch (err) {
      diagnostics.push({
        id: DiagnosticIds.InternalParseError,
        severity: 'error',
        message: `Internal error during parse: ${String(err)}`,
        file: p,
      });
      return;
    }

    modules.set(p, moduleFile);
    edges.set(p, new Map());

    for (const imp of importTargets(moduleFile)) {
      const candidates = resolveImportCandidates(p, imp, includeDirs);
      let resolved: string | undefined;
      let resolvedText: string | undefined;
      let hardFailure = false;

      for (const c of candidates) {
        try {
          // eslint-disable-next-line no-await-in-loop
          resolvedText = await readFile(c, 'utf8');
          resolved = c;
          break;
        } catch (err) {
          if (isIgnorableImportProbeError(err)) {
            // keep trying
            continue;
          }

          diagnostics.push({
            id: DiagnosticIds.IoReadFailed,
            severity: 'error',
            message: `Failed to read import candidate "${c}" while resolving imports for "${p}": ${String(
              err,
            )}`,
            file: p,
            line: imp.span.start.line,
            column: imp.span.start.column,
          });
          hardFailure = true;
          break;
        }
      }

      if (hardFailure) return;

      if (!resolved || resolvedText === undefined) {
        const pretty = imp.form === 'path' ? `"${imp.specifier}"` : imp.specifier;
        diagnostics.push({
          id: DiagnosticIds.ImportNotFound,
          severity: 'error',
          message: `Failed to resolve import ${pretty} from "${p}". Tried:\n${candidates
            .map((c) => `- ${c}`)
            .join('\n')}`,
          file: p,
          line: imp.span.start.line,
          column: imp.span.start.column,
        });
        continue;
      }

      const moduleEdges = edges.get(p)!;
      if (!moduleEdges.has(resolved)) {
        moduleEdges.set(resolved, {
          line: imp.span.start.line,
          column: imp.span.start.column,
        });
      }
      await loadModule(resolved, p, resolvedText);
    }
  };

  await loadModule(entryPath);
  if (hasErrors(diagnostics)) return undefined;

  // Detect module-ID collisions (case-insensitive).
  const idSeen = new Map<string, string>();
  for (const p of modules.keys()) {
    const id = canonicalModuleId(p, moduleIdRootDir);
    const k = id.toLowerCase();
    const prev = idSeen.get(k);
    if (prev && prev !== p) {
      const moduleSpan = modules.get(p)?.span.start;
      diagnostics.push({
        id: DiagnosticIds.SemanticsError,
        severity: 'error',
        message: `Module ID collision: "${id}" maps to both "${prev}" and "${p}".`,
        file: p,
        ...(moduleSpan !== undefined ? { line: moduleSpan.line, column: moduleSpan.column } : {}),
      });
    } else {
      idSeen.set(k, p);
    }
  }
  if (hasErrors(diagnostics)) return undefined;

  // Topological order (dependencies first), deterministic by (moduleId, path).
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: string[] = [];

  const sortKey = (p: string) => `${canonicalModuleId(p, moduleIdRootDir).toLowerCase()}\n${p}`;

  const visit = (p: string, stack: string[], fromModule?: string) => {
    if (visited.has(p)) return;
    if (visiting.has(p)) {
      const cycleStart = stack.indexOf(p);
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart).concat([p]) : stack.concat([p]);
      const edge = fromModule ? edges.get(fromModule)?.get(p) : undefined;
      diagnostics.push({
        id: DiagnosticIds.SemanticsError,
        severity: 'error',
        message: `Import cycle detected: ${cycle.join(' -> ')}`,
        file: fromModule ?? entryPath,
        ...(edge !== undefined ? { line: edge.line, column: edge.column } : {}),
      });
      return;
    }
    visiting.add(p);
    const deps = Array.from((edges.get(p) ?? new Map()).keys()).sort((a, b) =>
      sortKey(a).localeCompare(sortKey(b)),
    );
    for (const d of deps) {
      visit(d, stack.concat([p]), p);
      if (hasErrors(diagnostics)) return;
    }
    visiting.delete(p);
    visited.add(p);
    order.push(p);
  };

  visit(entryPath, []);
  if (hasErrors(diagnostics)) return undefined;

  const moduleFiles = order.map((p) => modules.get(p)!).filter(Boolean);
  const entryModule = modules.get(entryPath);
  if (!entryModule) return undefined;

  const traversalVisited = new Set<string>();
  const moduleTraversal: string[] = [];
  const walkTraversal = (modulePath: string) => {
    if (traversalVisited.has(modulePath)) return;
    traversalVisited.add(modulePath);
    moduleTraversal.push(modulePath);
    for (const dep of (edges.get(modulePath) ?? new Map()).keys()) {
      walkTraversal(dep);
    }
  };
  walkTraversal(entryPath);

  return {
    program: { kind: 'Program', span: entryModule.span, entryFile: entryPath, files: moduleFiles },
    sourceTexts,
    moduleTraversal,
    resolvedImportGraph: new Map(
      Array.from(edges.entries(), ([modulePath, moduleEdges]) => [modulePath, Array.from(moduleEdges.keys())]),
    ),
  };
}

/**
 * Compile a ZAX program starting from an entry file.
 *
 * - Resolves imports transitively (deterministic topological order with cycle checks).
 * - Runs parse → semantics → lowering → format writers.
 * - Produces artifacts in-memory via `deps.formats`.
 * - Defaults to emitting BIN + HEX + D8M unless an emit flag is explicitly provided.
 */
export const compile: CompileFn = async (
  entryFile: string,
  options: CompilerOptions,
  deps: PipelineDeps,
): Promise<CompileResult> => {
  const entryPath = normalizePath(entryFile);
  const moduleIdRootDir = dirname(entryPath);
  const diagnostics: Diagnostic[] = [];
  const loaded = await loadProgram(entryPath, diagnostics, options);
  if (!loaded) return { diagnostics, artifacts: [] };
  const { program, sourceTexts, moduleTraversal, resolvedImportGraph } = loaded;

  if (hasErrors(diagnostics)) {
    return { diagnostics, artifacts: [] };
  }

  const nonBankedSectionKeys = collectNonBankedSectionKeys(program, diagnostics, moduleTraversal);
  if (hasErrors(diagnostics)) {
    return { diagnostics, artifacts: [] };
  }

  const hasNonImportDeclaration = program.files.some((moduleFile) =>
    moduleFile.items.some((item) => item.kind !== 'Import'),
  );
  if (!hasNonImportDeclaration) {
    diagnostics.push({
      id: DiagnosticIds.SemanticsError,
      severity: 'error',
      message: 'Program contains no declarations or instruction streams.',
      file: program.entryFile,
      ...(program.span?.start
        ? { line: program.span.start.line, column: program.span.start.column }
        : {}),
    });
    return { diagnostics, artifacts: [] };
  }

  if ((options.requireMain ?? false) && !hasMainFunction(program)) {
    diagnostics.push({
      id: DiagnosticIds.SemanticsError,
      severity: 'error',
      message: 'Program must define a callable "main" entry function.',
      file: program.entryFile,
      ...(program.span?.start
        ? { line: program.span.start.line, column: program.span.start.column }
        : {}),
    });
    return { diagnostics, artifacts: [] };
  }

  lintCaseStyle(program, sourceTexts, options.caseStyle ?? 'off', diagnostics);

  const env = buildEnv(program, diagnostics, {
    moduleIdRootDir,
    resolvedImportGraph,
  });
  if (hasErrors(diagnostics)) {
    return { diagnostics, artifacts: [] };
  }

  validateAssignmentAcceptance(program, env, diagnostics);
  if (hasErrors(diagnostics)) {
    return { diagnostics, artifacts: [] };
  }
  validateSuccPredAcceptance(program, env, diagnostics);
  if (hasErrors(diagnostics)) {
    return { diagnostics, artifacts: [] };
  }

  const { map, symbols, placedLoweredAsmProgram } = emitProgram(program, env, diagnostics, {
    ...(options.includeDirs ? { includeDirs: options.includeDirs } : {}),
    ...(options.opStackPolicy ? { opStackPolicy: options.opStackPolicy } : {}),
    ...(options.rawTypedCallWarnings !== undefined
      ? { rawTypedCallWarnings: options.rawTypedCallWarnings }
      : {}),
    ...(options.defaultCodeBase !== undefined ? { defaultCodeBase: options.defaultCodeBase } : {}),
    namedSectionKeys: nonBankedSectionKeys,
    sourceTexts,
  });
  if (hasErrors(diagnostics)) {
    return { diagnostics, artifacts: [] };
  }

  const emit = withDefaults(options);
  const artifacts: Artifact[] = [];

  if (emit.emitBin) {
    artifacts.push(deps.formats.writeBin(map, symbols));
  }
  if (emit.emitHex) {
    artifacts.push(deps.formats.writeHex(map, symbols));
  }
  if (emit.emitD8m) {
    const mainEntry =
      (symbols.find((s) => s.kind === 'label' && s.name.toLowerCase() === STARTUP_ENTRY_LABEL) as
        | { kind: 'label'; name: string; address: number }
        | undefined) ??
      (symbols.find((s) => s.kind === 'label' && s.name.toLowerCase() === 'main') as
        | { kind: 'label'; name: string; address: number }
        | undefined);
    artifacts.push(
      deps.formats.writeD8m(map, symbols, {
        rootDir: dirname(entryPath),
        ...(mainEntry
          ? {
              entrySymbol: mainEntry.name,
              entryAddress: mainEntry.address & 0xffff,
            }
          : {}),
      }),
    );
  }
  if (emit.emitListing) {
    if (deps.formats.writeListing) {
      artifacts.push(deps.formats.writeListing(map, symbols));
    } else {
      diagnostics.push({
        id: DiagnosticIds.Unknown,
        severity: 'warning',
        message: 'emitListing=true but no listing writer is configured; skipping .lst artifact.',
        file: program.entryFile,
      });
    }
  }
  if (emit.emitAsm) {
    if (deps.formats.writeAsm) {
      artifacts.push(deps.formats.writeAsm(map, symbols));
    } else {
      diagnostics.push({
        id: DiagnosticIds.Unknown,
        severity: 'warning',
        message: 'emitAsm=true but no asm writer is configured; skipping .asm artifact.',
        file: program.entryFile,
      });
    }
  }
  if (emit.emitAsm80) {
    if (deps.formats.writeAsm80) {
      artifacts.push(deps.formats.writeAsm80(placedLoweredAsmProgram));
    } else {
      diagnostics.push({
        id: DiagnosticIds.Unknown,
        severity: 'warning',
        message: 'emitAsm80=true but no asm80 writer is configured; skipping .asm80 artifact.',
        file: program.entryFile,
      });
    }
  }

  return { diagnostics, artifacts };
};
