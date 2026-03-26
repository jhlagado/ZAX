import { dirname } from 'node:path';

import { hasErrors, normalizePath } from './compileShared.js';
import type { Diagnostic } from './diagnosticTypes.js';
import { DiagnosticIds } from './diagnosticTypes.js';
import type { CompileFn, CompilerOptions, CompileResult, PipelineDeps } from './pipeline.js';

import type { ModuleItemNode, ProgramNode, SectionItemNode } from './frontend/ast.js';
import type { ImportNode, ModuleFileNode } from './frontend/ast.js';
import { parseModuleFile } from './frontend/parser.js';
import { makeSourceFile } from './frontend/source.js';
import { stripLineComment } from './frontend/parseParserShared.js';
import { lintCaseStyle } from './lintCaseStyle.js';
import { emitProgram } from './lowering/emit.js';
import { STARTUP_ENTRY_LABEL } from './lowering/startupInit.js';
import type { Artifact } from './formats/types.js';
import { collectNonBankedSectionKeys } from './sectionKeys.js';
import { loadProgram } from './moduleLoader.js';
import { validateAssignmentAcceptance } from './semantics/assignmentAcceptance.js';
import { buildEnv } from './semantics/env.js';
import { validateStepAcceptance } from './semantics/stepAcceptance.js';

function withDefaults(
  options: CompilerOptions,
): Required<
  Pick<CompilerOptions, 'emitBin' | 'emitHex' | 'emitD8m' | 'emitListing' | 'emitAsm80'>
> {
  const anyPrimaryEmitSpecified = [options.emitBin, options.emitHex, options.emitD8m].some(
    (v) => v !== undefined,
  );

  const emitBin = anyPrimaryEmitSpecified ? (options.emitBin ?? false) : true;
  const emitHex = anyPrimaryEmitSpecified ? (options.emitHex ?? false) : true;
  const emitD8m = anyPrimaryEmitSpecified ? (options.emitD8m ?? false) : true;

  // Listing is a sidecar artifact: default to on unless explicitly suppressed.
  const emitListing = options.emitListing ?? true;
  const emitAsm80 = options.emitAsm80 ?? false;

  return { emitBin, emitHex, emitD8m, emitListing, emitAsm80 };
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
  const { program, sourceTexts, sourceLineComments, moduleTraversal, resolvedImportGraph } = loaded;

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
  validateStepAcceptance(program, env, diagnostics);
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
    sourceLineComments,
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
  if (emit.emitAsm80) {
    if (deps.formats.writeAsm80) {
      artifacts.push(deps.formats.writeAsm80(placedLoweredAsmProgram));
    } else {
      diagnostics.push({
        id: DiagnosticIds.Unknown,
        severity: 'warning',
        message: 'emitAsm80=true but no asm80 writer is configured; skipping .z80 artifact.',
        file: program.entryFile,
      });
    }
  }

  return { diagnostics, artifacts };
};
