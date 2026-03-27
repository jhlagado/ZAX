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
import {
  lowerProgramDeclarations,
  preScanProgramDeclarations,
  type Context as ProgramLoweringContext,
  type LoweringResult,
  type PrescanResult,
} from './programLowering.js';

export type { LoweringResult, PrescanResult };

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

/** Environment for finalization that is *not* part of {@link LoweringResult}. */
export type EmitFinalizationPhaseEnv = Omit<EmitFinalizationContext, keyof LoweringResult>;

// --- Phase handoff: merge lowering output with finalization inputs ---
/**
 * Combine lowering output with placement/fixup inputs. `lowered` is the typed handoff from
 * the lowering phase; `env` holds shared refs (maps, diagnostics, helpers) held across phases.
 */
export function mergeEmitFinalizationContext(
  lowered: LoweringResult,
  env: EmitFinalizationPhaseEnv,
): EmitFinalizationContext {
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
export function runEmitPrescanPhase(ctx: ProgramLoweringContext): PrescanResult {
  return preScanProgramDeclarations(ctx);
}

// --- Phase 3: lowering (emit bytes, fixups, lowered ASM stream) ---
/** Phase 3 — lowering: emit declarations and functions into section bytes and fixup queues. */
export function runEmitLoweringPhase(
  ctx: ProgramLoweringContext,
  prescan: PrescanResult,
): LoweringResult {
  return lowerProgramDeclarations(ctx, prescan);
}

// --- Phase 4: finalization (placement, fixups, artifact assembly) ---
/** Phase 4 — placement, fixups, merged map and placed lowered ASM. */
export function runEmitPlacementAndArtifactPhase(
  context: EmitFinalizationContext,
): Omit<EmitProgramResult, 'loweredAsmStream'> {
  return finalizeEmitProgram(context);
}
