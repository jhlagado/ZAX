import { computeWrittenRange, rebaseCodeSourceSegments, writeSection } from './sectionLayout.js';
import type { EmitProgramOptions, EmitFinalizationPhaseEnv } from './emitPipeline.js';
import type { Diagnostic } from '../diagnosticTypes.js';
import type { CompileEnv } from '../semantics/env.js';
import { evalImmExpr } from '../semantics/env.js';
import { alignTo } from './sectionLayout.js';
import { diag, diagAt } from './loweringDiagnostics.js';
import type { EmitPhase1Workspace } from './emitPhase1Workspace.js';
import type { EmitPhase1Helpers } from './emitPhase1Helpers.js';

type Context = {
  env: CompileEnv;
  diagnostics: Diagnostic[];
  options?: EmitProgramOptions;
  workspace: EmitPhase1Workspace;
  helpers: EmitPhase1Helpers;
};

export function buildEmitFinalizationPhaseEnv(ctx: Context): EmitFinalizationPhaseEnv {
  return {
    namedSectionSinks: ctx.helpers.namedSectionSinks,
    diagnostics: ctx.diagnostics,
    diag,
    diagAt,
    primaryFile: ctx.workspace.primaryFile,
    baseExprs: ctx.workspace.baseExprs,
    evalImmExpr,
    env: ctx.env,
    loweredAsmStream: ctx.helpers.loweredAsmStream,
    fixups: ctx.workspace.fixups,
    rel8Fixups: ctx.workspace.rel8Fixups,
    bytes: ctx.workspace.bytes,
    codeSourceSegments: ctx.workspace.codeSourceSegments,
    alignTo,
    writeSection,
    computeWrittenRange,
    rebaseCodeSourceSegments,
    ...(ctx.options?.defaultCodeBase !== undefined
      ? { defaultCodeBase: ctx.options.defaultCodeBase }
      : {}),
  };
}
