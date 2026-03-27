/**
 * Emit program context wiring (#1084)
 *
 * `emit.ts` assembles a large amount of state for lowering. Grouping the *inputs* into named
 * bundles (diagnostics, emission, types, program-level layout, …) keeps the call site readable and
 * localizes future churn: most edits touch one bundle instead of a single flat record.
 *
 * Tradeoffs:
 * - **Pros:** Clearer ownership at the call site; bundles align with `createEmitLoweringContexts`
 *   internal splits (diagnostics, emission, …) without changing runtime behavior.
 * - **Cons:** Callers must pass every bundle key; there is no partial/default merge. Flattening
 *   still happens once in {@link emitProgramBundlesToLoweringBuilderInput} before the builder runs.
 *
 * Behavior is unchanged from the previous flat `Context` object: the merged object passed to
 * `createEmitLoweringContexts` is identical aside from object construction order (spread order is
 * fixed to match the prior explicit field list).
 */

import type {
  EmitFunctionLoweringContextInputs,
  EmitLoweringContextBuilderInput,
  EmitProgramLoweringContextInputs,
} from './emitContextBuilder.js';
import { createEmitLoweringContexts } from './emitContextBuilder.js';

export type EmitDiagnosticsBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'diagnostics'
  | 'diag'
  | 'diagAt'
  | 'diagAtWithId'
  | 'diagAtWithSeverityAndId'
  | 'warnAt'
>;

export type EmitSymbolsAndTraceBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'taken'
  | 'pending'
  | 'traceComment'
  | 'traceLabel'
  | 'currentCodeSegmentTagRef'
  | 'generatedLabelCounterRef'
>;

export type EmitSpTrackingBundle = Pick<EmitFunctionLoweringContextInputs, 'bindSpTracking'>;

export type EmitEmissionBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'getCodeOffset'
  | 'emitInstr'
  | 'emitRawCodeBytes'
  | 'emitAbs16Fixup'
  | 'emitAbs16FixupPrefixed'
  | 'emitRel8Fixup'
>;

export type EmitConditionsBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'conditionOpcodeFromName'
  | 'conditionNameFromOpcode'
  | 'callConditionOpcodeFromName'
  | 'jrConditionOpcodeFromName'
  | 'conditionOpcode'
  | 'inverseConditionName'
  | 'symbolicTargetFromExpr'
>;

export type EmitTypesBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'evalImmExpr'
  | 'env'
  | 'resolveScalarBinding'
  | 'resolveScalarKind'
  | 'resolveEaTypeExpr'
  | 'resolveScalarTypeForEa'
  | 'resolveScalarTypeForLd'
  | 'resolveArrayType'
  | 'typeDisplay'
  | 'sameTypeShape'
>;

export type EmitMaterializationBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'resolveEa'
  | 'buildEaWordPipeline'
  | 'enforceEaRuntimeAtomBudget'
  | 'enforceDirectCallSiteEaBudget'
  | 'pushEaAddress'
  | 'materializeEaAddressToHL'
  | 'pushMemValue'
  | 'pushImm16'
  | 'pushZeroExtendedReg8'
  | 'loadImm16ToHL'
  | 'emitStepPipeline'
  | 'emitScalarWordLoad'
  | 'emitScalarWordStore'
  | 'lowerLdWithEa'
>;

export type EmitStorageBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'stackSlotOffsets'
  | 'stackSlotTypes'
  | 'localAliasTargets'
  | 'storageTypes'
  | 'moduleAliasTargets'
  | 'rawTypedCallWarningsEnabled'
>;

export type EmitCallableResolutionBundle = Pick<
  EmitFunctionLoweringContextInputs,
  'resolveCallable' | 'resolveOpCandidates' | 'opStackPolicyMode'
>;

export type EmitOpOverloadBundle = Pick<
  EmitFunctionLoweringContextInputs,
  'formatAsmOperandForOpDiag' | 'selectOpOverload' | 'summarizeOpStackEffect'
>;

export type EmitAstUtilitiesBundle = Pick<
  EmitFunctionLoweringContextInputs,
  | 'cloneImmExpr'
  | 'cloneEaExpr'
  | 'cloneOperand'
  | 'flattenEaDottedName'
  | 'normalizeFixedToken'
>;

export type EmitRegistersBundle = Pick<EmitFunctionLoweringContextInputs, 'reg8' | 'reg16'>;

/** Named bundles passed from `emitProgram` into lowering context construction. */
export type EmitProgramContextBundles = {
  diagnostics: EmitDiagnosticsBundle;
  symbolsAndTrace: EmitSymbolsAndTraceBundle;
  spTracking: EmitSpTrackingBundle;
  emission: EmitEmissionBundle;
  conditions: EmitConditionsBundle;
  types: EmitTypesBundle;
  materialization: EmitMaterializationBundle;
  storage: EmitStorageBundle;
  callableResolution: EmitCallableResolutionBundle;
  opOverload: EmitOpOverloadBundle;
  astUtilities: EmitAstUtilitiesBundle;
  registers: EmitRegistersBundle;
  /** Program-level fields (visibility, sections, placement hooks, …). */
  program: EmitProgramLoweringContextInputs;
};

export function emitProgramBundlesToLoweringBuilderInput(
  b: EmitProgramContextBundles,
): EmitLoweringContextBuilderInput {
  return {
    functionLowering: {
      ...b.diagnostics,
      ...b.symbolsAndTrace,
      ...b.spTracking,
      ...b.emission,
      ...b.conditions,
      ...b.types,
      ...b.materialization,
      ...b.storage,
      ...b.callableResolution,
      ...b.opOverload,
      ...b.astUtilities,
      ...b.registers,
    },
    programLowering: b.program,
  };
}

export function createEmitProgramContext(bundles: EmitProgramContextBundles) {
  return createEmitLoweringContexts(emitProgramBundlesToLoweringBuilderInput(bundles));
}
