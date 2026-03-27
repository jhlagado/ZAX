import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { hasErrors, normalizePath } from './compileShared.js';
import type { Diagnostic } from './diagnosticTypes.js';
import { DiagnosticIds } from './diagnosticTypes.js';
import type { ImportNode, ModuleFileNode, ProgramNode } from './frontend/ast.js';
import { parseModuleFile } from './frontend/parser.js';
import { stripLineComment } from './frontend/parseParserShared.js';
import { makeSourceFile } from './frontend/source.js';
import { canonicalModuleId } from './moduleIdentity.js';
import type { CompilerOptions } from './pipeline.js';

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

export type LoadedProgram = {
  program: ProgramNode;
  sourceTexts: Map<string, string>;
  sourceLineComments: Map<string, Map<number, string>>;
  moduleTraversal: string[];
  resolvedImportGraph: Map<string, string[]>;
};

export async function loadProgram(
  entryFile: string,
  diagnostics: Diagnostic[],
  options: Pick<CompilerOptions, 'includeDirs'>,
): Promise<LoadedProgram | undefined> {
  const entryPath = normalizePath(entryFile);
  const modules = new Map<string, ModuleFileNode>();
  const sourceTexts = new Map<string, string>();
  const sourceLineComments = new Map<string, Map<number, string>>();
  const edges = new Map<string, Map<string, { line: number; column: number }>>();
  const includeDirs = (options.includeDirs ?? []).map(normalizePath);
  const moduleIdRootDir = dirname(entryPath);

  type ExpandedSource = { text: string; lineFiles: string[]; lineBaseLines: number[] };

  const recordSourceLineComments = (expanded: ExpandedSource): void => {
    const lines = expanded.text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const semi = line.indexOf(';');
      if (semi < 0) continue;
      const commentText = line.slice(semi + 1).trim();
      if (!commentText) continue;
      const fileRaw = expanded.lineFiles[i];
      if (!fileRaw) continue;
      const file = normalizePath(fileRaw);
      const lineNo = expanded.lineBaseLines[i] ?? i + 1;
      let lineMap = sourceLineComments.get(file);
      if (!lineMap) {
        lineMap = new Map();
        sourceLineComments.set(file, lineMap);
      }
      lineMap.set(lineNo, commentText);
    }
  };

  const expandIncludes = async (
    modulePath: string,
    sourceText: string,
    includeStack: string[],
  ): Promise<ExpandedSource | undefined> => {
    const moduleKey = normalizePath(modulePath);
    if (!sourceTexts.has(moduleKey)) sourceTexts.set(moduleKey, sourceText);
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
          resolvedText = await readFile(c, 'utf8');
          resolved = c;
          const resolvedKey = normalizePath(c);
          if (!sourceTexts.has(resolvedKey)) sourceTexts.set(resolvedKey, resolvedText);
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
    recordSourceLineComments(expanded);
    edges.set(p, new Map());

    for (const imp of importTargets(moduleFile)) {
      const candidates = resolveImportCandidates(p, imp, includeDirs);
      let resolved: string | undefined;
      let resolvedText: string | undefined;
      let hardFailure = false;

      for (const c of candidates) {
        try {
          resolvedText = await readFile(c, 'utf8');
          resolved = c;
          break;
        } catch (err) {
          if (isIgnorableImportProbeError(err)) {
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
    sourceLineComments,
    moduleTraversal,
    resolvedImportGraph: new Map(
      Array.from(edges.entries(), ([modulePath, moduleEdges]) => [modulePath, Array.from(moduleEdges.keys())]),
    ),
  };
}