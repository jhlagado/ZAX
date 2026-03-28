/**
 * Emit orchestration phases for `emitProgram`.
 *
 * Pipeline (conceptual):
 *
 * 1. **Workspace setup** — lives in `emit.ts`: section byte maps, fixup queues, visibility,
 *    resolution helpers, and the program-lowering context (`createEmitProgramContext`). This
 *    phase wires mutable state and callbacks; it does not traverse the whole program yet.
 *
 * 2. **Prescan** — `runEmitPrescanPhase`: discover callables, ops, storage aliases, and
 *    raw-address names so later lowering can resolve symbols. Product: {@link PrescanResult}.
 *
 * 3. **Lowering** — `runEmitLoweringPhase`: traverse declarations and functions, emit bytes
 *    into section maps, enqueue fixups. Product: {@link LoweringResult}.
 *
 * 4. **Placement & artifacts** — `runEmitPlacementAndArtifactPhase`: named-section placement,
 *    fixup resolution, merged `EmittedByteMap`, symbol table, placed lowered-ASM program.
 *    Input: {@link EmitFinalizationContext} (built via {@link mergeEmitFinalizationContext}).
 *
 * Format writers stay in `compile.ts` / `PipelineDeps`; this module only produces the
 * in-memory products they consume.
 */

import type { EmittedByteMap, SymbolEntry } from '../formats/types.js';
import type { NonBankedSectionKeyCollection } from '../sectionKeys.js';
import type { OpStackPolicyMode } from '../pipeline.js';
import { finalizeEmitProgram, type EmitFinalizationContext } from './emitFinalization.js';
import type { LoweredAsmProgram, LoweredAsmStream } from './loweredAsmTypes.js';
import type { PrescanResult } from './prescanTypes.js';
import {
  lowerProgramDeclarations,
  preScanProgramDeclarations,
  type Context as ProgramLoweringContext,
  type LoweringResult,
  type ProgramPrescanContext,
} from './programLowering.js';

export type EmitPrescanPhaseContext = ProgramPrescanContext;
export type EmitPrescanPhaseResult = PrescanResult;
export type EmitLoweringPhaseContext = ProgramLoweringContext;

export interface EmitLoweringPhaseResult {
  readonly codeOffset: LoweringResult['codeOffset'];
  readonly dataOffset: LoweringResult['dataOffset'];
  readonly varOffset: LoweringResult['varOffset'];
  readonly pending: LoweringResult['pending'];
  readonly symbols: LoweringResult['symbols'];
  readonly absoluteSymbols: LoweringResult['absoluteSymbols'];
  readonly deferredExterns: LoweringResult['deferredExterns'];
  readonly codeBytes: LoweringResult['codeBytes'];
  readonly dataBytes: LoweringResult['dataBytes'];
  readonly hexBytes: LoweringResult['hexBytes'];
}

/** Options for `emitProgram` (include paths, policy flags, listing sources). */
export type EmitProgramOptions = {
  includeDirs?: string[];
  opStackPolicy?: OpStackPolicyMode;
  rawTypedCallWarnings?: boolean;
  defaultCodeBase?: number;
  namedSectionKeys?: NonBankedSectionKeyCollection;
  sourceTexts?: Map<string, string>;
  sourceLineComments?: Map<string, Map<number, string>>;
};

/** In-memory compile products passed to format writers (plus trace stream). */
export type EmitProgramResult = {
  map: EmittedByteMap;
  symbols: SymbolEntry[];
  loweredAsmStream: LoweredAsmStream;
  placedLoweredAsmProgram: LoweredAsmProgram;
};

/** Finalization inputs that come from phase-1 wiring rather than phase-3 lowering. */
export interface EmitFinalizationPhaseEnv {
  readonly namedSectionSinks: EmitFinalizationContext['namedSectionSinks'];
  readonly diagnostics: EmitFinalizationContext['diagnostics'];
  readonly diag: EmitFinalizationContext['diag'];
  readonly diagAt: EmitFinalizationContext['diagAt'];
  readonly primaryFile: EmitFinalizationContext['primaryFile'];
  readonly baseExprs: EmitFinalizationContext['baseExprs'];
  readonly evalImmExpr: EmitFinalizationContext['evalImmExpr'];
  readonly env: EmitFinalizationContext['env'];
  readonly loweredAsmStream: EmitFinalizationContext['loweredAsmStream'];
  readonly fixups: EmitFinalizationContext['fixups'];
  readonly rel8Fixups: EmitFinalizationContext['rel8Fixups'];
  readonly bytes: EmitFinalizationContext['bytes'];
  readonly codeSourceSegments: EmitFinalizationContext['codeSourceSegments'];
  readonly alignTo: EmitFinalizationContext['alignTo'];
  readonly writeSection: EmitFinalizationContext['writeSection'];
  readonly computeWrittenRange: EmitFinalizationContext['computeWrittenRange'];
  readonly rebaseCodeSourceSegments: EmitFinalizationContext['rebaseCodeSourceSegments'];
  readonly defaultCodeBase?: number;
}

export type EmitPlacementPhaseContext = EmitLoweringPhaseResult & EmitFinalizationPhaseEnv;
export type EmitPlacementPhaseResult = Omit<EmitProgramResult, 'loweredAsmStream'>;

// --- Phase handoff: merge lowering output with finalization inputs ---
/**
 * Combine lowering output with placement/fixup inputs. `lowered` is the typed handoff from
 * the lowering phase; `env` holds shared refs (maps, diagnostics, helpers) held across phases.
 */
export function mergeEmitFinalizationContext(
  lowered: EmitLoweringPhaseResult,
  env: EmitFinalizationPhaseEnv,
): EmitPlacementPhaseContext {
  return { ...lowered, ...env };
}

/** Deterministic empty result when compilation aborts before lowering (e.g. no modules). */
export function emitProgramEmptyResult(): EmitProgramResult {
  return {
    map: { bytes: new Map() },
    symbols: [],
    loweredAsmStream: { blocks: [] },
    placedLoweredAsmProgram: { blocks: [] },
  };
}

// --- Phase 2: prescan (callables, ops, storage aliases) ---
/** Phase 2 — prescan: build visibility maps and alias metadata before emission. */
export function runEmitPrescanPhase(ctx: EmitPrescanPhaseContext): EmitPrescanPhaseResult {
  return preScanProgramDeclarations(ctx);
}

// --- Phase 3: lowering (emit bytes, fixups, lowered ASM stream) ---
/** Phase 3 — lowering: emit declarations and functions into section bytes and fixup queues. */
export function runEmitLoweringPhase(
  ctx: EmitLoweringPhaseContext,
  prescan: EmitPrescanPhaseResult,
): EmitLoweringPhaseResult {
  return lowerProgramDeclarations(ctx, prescan);
}

// --- Phase 4: finalization (placement, fixups, artifact assembly) ---
/** Phase 4 — placement, fixups, merged map and placed lowered ASM. */
export function runEmitPlacementAndArtifactPhase(
  context: EmitPlacementPhaseContext,
): EmitPlacementPhaseResult {
  return finalizeEmitProgram(context);
}
