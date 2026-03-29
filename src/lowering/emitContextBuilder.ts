import type {
  FunctionLoweringAstUtilityContext,
  FunctionLoweringCallableResolutionContext,
  FunctionLoweringConditionContext,
  FunctionLoweringDiagnosticsContext,
  FunctionLoweringEmissionContext,
  FunctionLoweringMaterializationContext,
  FunctionLoweringOpOverloadContext,
  FunctionLoweringRegisterContext,
  FunctionLoweringSharedContext,
  FunctionLoweringSpTrackingContext,
  FunctionLoweringStorageContext,
  FunctionLoweringSymbolContext,
  FunctionLoweringTypeContext,
} from './functionLowering.js';
import type {
  Context as ProgramLoweringContext,
} from './programLowering.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';

/**
 * Flat field bag passed into {@link createEmitLoweringContexts} for function-body lowering.
 * Each field matches the same-named member on {@link import('./functionLowering.js').FunctionLoweringContext}.
 */
export type EmitFunctionLoweringContextInputs = {
  /** @inheritdoc FunctionLoweringDiagnosticsContext */
  diagnostics: FunctionLoweringDiagnosticsContext['diagnostics'];
  /** @inheritdoc FunctionLoweringDiagnosticsContext */
  diag: FunctionLoweringDiagnosticsContext['diag'];
  /** @inheritdoc FunctionLoweringDiagnosticsContext */
  diagAt: FunctionLoweringDiagnosticsContext['diagAt'];
  /** @inheritdoc FunctionLoweringDiagnosticsContext */
  diagAtWithId: FunctionLoweringDiagnosticsContext['diagAtWithId'];
  /** @inheritdoc FunctionLoweringDiagnosticsContext */
  diagAtWithSeverityAndId: FunctionLoweringDiagnosticsContext['diagAtWithSeverityAndId'];
  /** @inheritdoc FunctionLoweringDiagnosticsContext */
  warnAt: FunctionLoweringDiagnosticsContext['warnAt'];
  /** @inheritdoc FunctionLoweringSymbolContext */
  taken: FunctionLoweringSymbolContext['taken'];
  /** @inheritdoc FunctionLoweringSymbolContext */
  pending: FunctionLoweringSymbolContext['pending'];
  /** @inheritdoc FunctionLoweringSymbolContext */
  traceComment: FunctionLoweringSymbolContext['traceComment'];
  /** @inheritdoc FunctionLoweringSymbolContext */
  traceLabel: FunctionLoweringSymbolContext['traceLabel'];
  /** @inheritdoc FunctionLoweringSymbolContext */
  currentCodeSegmentTagRef: FunctionLoweringSymbolContext['currentCodeSegmentTagRef'];
  /** @inheritdoc FunctionLoweringSymbolContext */
  generatedLabelCounterRef: FunctionLoweringSymbolContext['generatedLabelCounterRef'];
  /** @inheritdoc FunctionLoweringSpTrackingContext */
  bindSpTracking: FunctionLoweringSpTrackingContext['bindSpTracking'];
  /** @inheritdoc FunctionLoweringEmissionContext */
  getCodeOffset: FunctionLoweringEmissionContext['getCodeOffset'];
  /** @inheritdoc FunctionLoweringEmissionContext */
  emitInstr: FunctionLoweringEmissionContext['emitInstr'];
  /** @inheritdoc FunctionLoweringEmissionContext */
  emitRawCodeBytes: FunctionLoweringEmissionContext['emitRawCodeBytes'];
  /** @inheritdoc FunctionLoweringEmissionContext */
  emitAbs16Fixup: FunctionLoweringEmissionContext['emitAbs16Fixup'];
  /** @inheritdoc FunctionLoweringEmissionContext */
  emitAbs16FixupPrefixed: FunctionLoweringEmissionContext['emitAbs16FixupPrefixed'];
  /** @inheritdoc FunctionLoweringEmissionContext */
  emitRel8Fixup: FunctionLoweringEmissionContext['emitRel8Fixup'];
  /** @inheritdoc FunctionLoweringConditionContext */
  conditionOpcodeFromName: FunctionLoweringConditionContext['conditionOpcodeFromName'];
  /** @inheritdoc FunctionLoweringConditionContext */
  conditionNameFromOpcode: FunctionLoweringConditionContext['conditionNameFromOpcode'];
  /** @inheritdoc FunctionLoweringConditionContext */
  callConditionOpcodeFromName: FunctionLoweringConditionContext['callConditionOpcodeFromName'];
  /** @inheritdoc FunctionLoweringConditionContext */
  jrConditionOpcodeFromName: FunctionLoweringConditionContext['jrConditionOpcodeFromName'];
  /** @inheritdoc FunctionLoweringConditionContext */
  conditionOpcode: FunctionLoweringConditionContext['conditionOpcode'];
  /** @inheritdoc FunctionLoweringConditionContext */
  inverseConditionName: FunctionLoweringConditionContext['inverseConditionName'];
  /** @inheritdoc FunctionLoweringConditionContext */
  symbolicTargetFromExpr: FunctionLoweringConditionContext['symbolicTargetFromExpr'];
  /** @inheritdoc FunctionLoweringTypeContext */
  evalImmExpr: FunctionLoweringTypeContext['evalImmExpr'];
  /** @inheritdoc FunctionLoweringTypeContext */
  env: FunctionLoweringTypeContext['env'];
  /** @inheritdoc FunctionLoweringTypeContext */
  resolveScalarBinding: FunctionLoweringTypeContext['resolveScalarBinding'];
  /** @inheritdoc FunctionLoweringTypeContext */
  resolveScalarKind: FunctionLoweringTypeContext['resolveScalarKind'];
  /** @inheritdoc FunctionLoweringTypeContext */
  resolveEaTypeExpr: FunctionLoweringTypeContext['resolveEaTypeExpr'];
  /** @inheritdoc FunctionLoweringTypeContext */
  resolveScalarTypeForEa: FunctionLoweringTypeContext['resolveScalarTypeForEa'];
  /** @inheritdoc FunctionLoweringTypeContext */
  resolveScalarTypeForLd: FunctionLoweringTypeContext['resolveScalarTypeForLd'];
  /** @inheritdoc FunctionLoweringTypeContext */
  resolveArrayType: FunctionLoweringTypeContext['resolveArrayType'];
  /** @inheritdoc FunctionLoweringTypeContext */
  typeDisplay: FunctionLoweringTypeContext['typeDisplay'];
  /** @inheritdoc FunctionLoweringTypeContext */
  sameTypeShape: FunctionLoweringTypeContext['sameTypeShape'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  resolveEa: FunctionLoweringMaterializationContext['resolveEa'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  buildEaWordPipeline: FunctionLoweringMaterializationContext['buildEaWordPipeline'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  enforceEaRuntimeAtomBudget: FunctionLoweringMaterializationContext['enforceEaRuntimeAtomBudget'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  enforceDirectCallSiteEaBudget:
    FunctionLoweringMaterializationContext['enforceDirectCallSiteEaBudget'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  pushEaAddress: FunctionLoweringMaterializationContext['pushEaAddress'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  materializeEaAddressToHL: FunctionLoweringMaterializationContext['materializeEaAddressToHL'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  pushMemValue: FunctionLoweringMaterializationContext['pushMemValue'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  pushImm16: FunctionLoweringMaterializationContext['pushImm16'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  pushZeroExtendedReg8: FunctionLoweringMaterializationContext['pushZeroExtendedReg8'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  loadImm16ToHL: FunctionLoweringMaterializationContext['loadImm16ToHL'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  emitStepPipeline: FunctionLoweringMaterializationContext['emitStepPipeline'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  emitScalarWordLoad: FunctionLoweringMaterializationContext['emitScalarWordLoad'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  emitScalarWordStore: FunctionLoweringMaterializationContext['emitScalarWordStore'];
  /** @inheritdoc FunctionLoweringMaterializationContext */
  lowerLdWithEa: FunctionLoweringMaterializationContext['lowerLdWithEa'];
  /** @inheritdoc FunctionLoweringStorageContext */
  stackSlotOffsets: FunctionLoweringStorageContext['stackSlotOffsets'];
  /** @inheritdoc FunctionLoweringStorageContext */
  stackSlotTypes: FunctionLoweringStorageContext['stackSlotTypes'];
  /** @inheritdoc FunctionLoweringStorageContext */
  localAliasTargets: FunctionLoweringStorageContext['localAliasTargets'];
  /** @inheritdoc FunctionLoweringStorageContext */
  storageTypes: FunctionLoweringStorageContext['storageTypes'];
  /** @inheritdoc FunctionLoweringStorageContext */
  moduleAliasTargets: FunctionLoweringStorageContext['moduleAliasTargets'];
  /** @inheritdoc FunctionLoweringStorageContext */
  rawTypedCallWarningsEnabled: FunctionLoweringStorageContext['rawTypedCallWarningsEnabled'];
  /** @inheritdoc FunctionLoweringCallableResolutionContext */
  resolveCallable: FunctionLoweringCallableResolutionContext['resolveCallable'];
  /** @inheritdoc FunctionLoweringCallableResolutionContext */
  resolveOpCandidates: FunctionLoweringCallableResolutionContext['resolveOpCandidates'];
  /** @inheritdoc FunctionLoweringCallableResolutionContext */
  opStackPolicyMode: FunctionLoweringCallableResolutionContext['opStackPolicyMode'];
  /** @inheritdoc FunctionLoweringOpOverloadContext */
  formatAsmOperandForOpDiag: FunctionLoweringOpOverloadContext['formatAsmOperandForOpDiag'];
  /** @inheritdoc FunctionLoweringOpOverloadContext */
  selectOpOverload: FunctionLoweringOpOverloadContext['selectOpOverload'];
  /** @inheritdoc FunctionLoweringOpOverloadContext */
  summarizeOpStackEffect: FunctionLoweringOpOverloadContext['summarizeOpStackEffect'];
  /** @inheritdoc FunctionLoweringAstUtilityContext */
  cloneImmExpr: FunctionLoweringAstUtilityContext['cloneImmExpr'];
  /** @inheritdoc FunctionLoweringAstUtilityContext */
  cloneEaExpr: FunctionLoweringAstUtilityContext['cloneEaExpr'];
  /** @inheritdoc FunctionLoweringAstUtilityContext */
  cloneOperand: FunctionLoweringAstUtilityContext['cloneOperand'];
  /** @inheritdoc FunctionLoweringAstUtilityContext */
  flattenEaDottedName: FunctionLoweringAstUtilityContext['flattenEaDottedName'];
  /** @inheritdoc FunctionLoweringAstUtilityContext */
  normalizeFixedToken: FunctionLoweringAstUtilityContext['normalizeFixedToken'];
  /** @inheritdoc FunctionLoweringRegisterContext */
  reg8: FunctionLoweringRegisterContext['reg8'];
  /** @inheritdoc FunctionLoweringRegisterContext */
  reg16: FunctionLoweringRegisterContext['reg16'];
};

/**
 * Flat field bag for program-level lowering (merged with shared function-lowering fields in the builder).
 * Each field matches the same-named member on {@link import('./programLowering.js').Context}.
 */
export type EmitProgramLoweringContextInputs = {
  /** @inheritdoc ProgramLoweringContext */
  program: ProgramLoweringContext['program'];
  /** @inheritdoc ProgramLoweringContext */
  includeDirs: ProgramLoweringContext['includeDirs'];
  /** @inheritdoc ProgramLoweringContext */
  localCallablesByFile: ProgramLoweringContext['localCallablesByFile'];
  /** @inheritdoc ProgramLoweringContext */
  visibleCallables: ProgramLoweringContext['visibleCallables'];
  /** @inheritdoc ProgramLoweringContext */
  localOpsByFile: ProgramLoweringContext['localOpsByFile'];
  /** @inheritdoc ProgramLoweringContext */
  visibleOpsByName: ProgramLoweringContext['visibleOpsByName'];
  /** @inheritdoc ProgramLoweringContext */
  declaredOpNames: ProgramLoweringContext['declaredOpNames'];
  /** @inheritdoc ProgramLoweringContext */
  declaredBinNames: ProgramLoweringContext['declaredBinNames'];
  /** @inheritdoc ProgramLoweringContext */
  deferredExterns: ProgramLoweringContext['deferredExterns'];
  /** @inheritdoc ProgramLoweringContext */
  storageTypes: ProgramLoweringContext['storageTypes'];
  /** @inheritdoc ProgramLoweringContext */
  moduleAliasTargets: ProgramLoweringContext['moduleAliasTargets'];
  /** @inheritdoc ProgramLoweringContext */
  moduleAliasDecls: ProgramLoweringContext['moduleAliasDecls'];
  /** @inheritdoc ProgramLoweringContext */
  rawAddressSymbols: ProgramLoweringContext['rawAddressSymbols'];
  /** @inheritdoc ProgramLoweringContext */
  absoluteSymbols: ProgramLoweringContext['absoluteSymbols'];
  /** @inheritdoc ProgramLoweringContext */
  symbols: ProgramLoweringContext['symbols'];
  /** @inheritdoc ProgramLoweringContext */
  dataBytes: ProgramLoweringContext['dataBytes'];
  /** @inheritdoc ProgramLoweringContext */
  codeBytes: ProgramLoweringContext['codeBytes'];
  /** @inheritdoc ProgramLoweringContext */
  hexBytes: ProgramLoweringContext['hexBytes'];
  /** @inheritdoc ProgramLoweringContext */
  activeSectionRef: ProgramLoweringContext['activeSectionRef'];
  /** @inheritdoc ProgramLoweringContext */
  codeOffsetRef: ProgramLoweringContext['codeOffsetRef'];
  /** @inheritdoc ProgramLoweringContext */
  dataOffsetRef: ProgramLoweringContext['dataOffsetRef'];
  /** @inheritdoc ProgramLoweringContext */
  varOffsetRef: ProgramLoweringContext['varOffsetRef'];
  /** @inheritdoc ProgramLoweringContext */
  baseExprs: ProgramLoweringContext['baseExprs'];
  /** @inheritdoc ProgramLoweringContext */
  advanceAlign: ProgramLoweringContext['advanceAlign'];
  /** @inheritdoc ProgramLoweringContext */
  alignTo: ProgramLoweringContext['alignTo'];
  /** @inheritdoc ProgramLoweringContext */
  loadBinInput: ProgramLoweringContext['loadBinInput'];
  /** @inheritdoc ProgramLoweringContext */
  loadHexInput: ProgramLoweringContext['loadHexInput'];
  /** @inheritdoc ProgramLoweringContext */
  resolveAggregateType: ProgramLoweringContext['resolveAggregateType'];
  /** @inheritdoc ProgramLoweringContext */
  sizeOfTypeExpr: ProgramLoweringContext['sizeOfTypeExpr'];
  /** @inheritdoc ProgramLoweringContext */
  lowerFunctionDecl: ProgramLoweringContext['lowerFunctionDecl'];
  /** @inheritdoc ProgramLoweringContext */
  recordLoweredAsmItem: ProgramLoweringContext['recordLoweredAsmItem'];
  /** @inheritdoc ProgramLoweringContext */
  lowerImmExprForLoweredAsm: ProgramLoweringContext['lowerImmExprForLoweredAsm'];
  /** @inheritdoc ProgramLoweringContext */
  namedSectionSinksByNode: ProgramLoweringContext['namedSectionSinksByNode'];
  /** Current sink for the active named section contribution; `undefined` when not in a named block. */
  currentNamedSectionSinkRef: { current: NamedSectionContributionSink | undefined };
  /** @inheritdoc FunctionLoweringSymbolContext */
  currentCodeSegmentTagRef: FunctionLoweringSymbolContext['currentCodeSegmentTagRef'];
};

export type EmitLoweringContextBuilderInput = {
  /** Flattened function-lowering inputs (see {@link EmitFunctionLoweringContextInputs}). */
  readonly functionLowering: Readonly<EmitFunctionLoweringContextInputs>;
  /** Flattened program-lowering inputs (see {@link EmitProgramLoweringContextInputs}). */
  readonly programLowering: Readonly<EmitProgramLoweringContextInputs>;
};

type FunctionLoweringComponentContexts = {
  readonly diagnostics: FunctionLoweringDiagnosticsContext;
  readonly symbols: FunctionLoweringSymbolContext;
  readonly spTracking: FunctionLoweringSpTrackingContext;
  readonly emission: FunctionLoweringEmissionContext;
  readonly conditions: FunctionLoweringConditionContext;
  readonly types: FunctionLoweringTypeContext;
  readonly materialization: FunctionLoweringMaterializationContext;
  readonly storage: FunctionLoweringStorageContext;
  readonly callableResolution: FunctionLoweringCallableResolutionContext;
  readonly opOverload: FunctionLoweringOpOverloadContext;
  readonly astUtilities: FunctionLoweringAstUtilityContext;
  readonly registers: FunctionLoweringRegisterContext;
};

function createFunctionLoweringDiagnosticsContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringDiagnosticsContext {
  return {
    diagnostics: input.diagnostics,
    diag: input.diag,
    diagAt: input.diagAt,
    diagAtWithId: input.diagAtWithId,
    diagAtWithSeverityAndId: input.diagAtWithSeverityAndId,
    warnAt: input.warnAt,
  };
}

function createFunctionLoweringSymbolContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringSymbolContext {
  return {
    taken: input.taken,
    pending: input.pending,
    traceComment: input.traceComment,
    traceLabel: input.traceLabel,
    currentCodeSegmentTagRef: input.currentCodeSegmentTagRef,
    generatedLabelCounterRef: input.generatedLabelCounterRef,
  };
}

function createFunctionLoweringSpTrackingContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringSpTrackingContext {
  return {
    bindSpTracking: input.bindSpTracking,
  };
}

function createFunctionLoweringEmissionContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringEmissionContext {
  return {
    getCodeOffset: input.getCodeOffset,
    emitInstr: input.emitInstr,
    emitRawCodeBytes: input.emitRawCodeBytes,
    emitAbs16Fixup: input.emitAbs16Fixup,
    emitAbs16FixupPrefixed: input.emitAbs16FixupPrefixed,
    emitRel8Fixup: input.emitRel8Fixup,
  };
}

function createFunctionLoweringConditionContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringConditionContext {
  return {
    conditionOpcodeFromName: input.conditionOpcodeFromName,
    conditionNameFromOpcode: input.conditionNameFromOpcode,
    callConditionOpcodeFromName: input.callConditionOpcodeFromName,
    jrConditionOpcodeFromName: input.jrConditionOpcodeFromName,
    conditionOpcode: input.conditionOpcode,
    inverseConditionName: input.inverseConditionName,
    symbolicTargetFromExpr: input.symbolicTargetFromExpr,
  };
}

function createFunctionLoweringTypeContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringTypeContext {
  return {
    evalImmExpr: input.evalImmExpr,
    env: input.env,
    resolveScalarBinding: input.resolveScalarBinding,
    resolveScalarKind: input.resolveScalarKind,
    resolveEaTypeExpr: input.resolveEaTypeExpr,
    resolveScalarTypeForEa: input.resolveScalarTypeForEa,
    resolveScalarTypeForLd: input.resolveScalarTypeForLd,
    resolveArrayType: input.resolveArrayType,
    typeDisplay: input.typeDisplay,
    sameTypeShape: input.sameTypeShape,
  };
}

function createFunctionLoweringMaterializationContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringMaterializationContext {
  return {
    resolveEa: input.resolveEa,
    buildEaWordPipeline: input.buildEaWordPipeline,
    enforceEaRuntimeAtomBudget: input.enforceEaRuntimeAtomBudget,
    enforceDirectCallSiteEaBudget: input.enforceDirectCallSiteEaBudget,
    pushEaAddress: input.pushEaAddress,
    materializeEaAddressToHL: input.materializeEaAddressToHL,
    pushMemValue: input.pushMemValue,
    pushImm16: input.pushImm16,
    pushZeroExtendedReg8: input.pushZeroExtendedReg8,
    loadImm16ToHL: input.loadImm16ToHL,
    emitStepPipeline: input.emitStepPipeline,
    emitScalarWordLoad: input.emitScalarWordLoad,
    emitScalarWordStore: input.emitScalarWordStore,
    lowerLdWithEa: input.lowerLdWithEa,
  };
}

function createFunctionLoweringStorageContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringStorageContext {
  return {
    stackSlotOffsets: input.stackSlotOffsets,
    stackSlotTypes: input.stackSlotTypes,
    localAliasTargets: input.localAliasTargets,
    storageTypes: input.storageTypes,
    moduleAliasTargets: input.moduleAliasTargets,
    rawTypedCallWarningsEnabled: input.rawTypedCallWarningsEnabled,
  };
}

function createFunctionLoweringCallableResolutionContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringCallableResolutionContext {
  return {
    resolveCallable: input.resolveCallable,
    resolveOpCandidates: input.resolveOpCandidates,
    opStackPolicyMode: input.opStackPolicyMode,
  };
}

function createFunctionLoweringOpOverloadContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringOpOverloadContext {
  return {
    formatAsmOperandForOpDiag: input.formatAsmOperandForOpDiag,
    selectOpOverload: input.selectOpOverload,
    summarizeOpStackEffect: input.summarizeOpStackEffect,
  };
}

function createFunctionLoweringAstUtilityContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringAstUtilityContext {
  return {
    cloneImmExpr: input.cloneImmExpr,
    cloneEaExpr: input.cloneEaExpr,
    cloneOperand: input.cloneOperand,
    flattenEaDottedName: input.flattenEaDottedName,
    normalizeFixedToken: input.normalizeFixedToken,
  };
}

function createFunctionLoweringRegisterContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringRegisterContext {
  return {
    reg8: input.reg8,
    reg16: input.reg16,
  };
}

function createFunctionLoweringComponentContexts(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringComponentContexts {
  return {
    diagnostics: createFunctionLoweringDiagnosticsContext(input),
    symbols: createFunctionLoweringSymbolContext(input),
    spTracking: createFunctionLoweringSpTrackingContext(input),
    emission: createFunctionLoweringEmissionContext(input),
    conditions: createFunctionLoweringConditionContext(input),
    types: createFunctionLoweringTypeContext(input),
    materialization: createFunctionLoweringMaterializationContext(input),
    storage: createFunctionLoweringStorageContext(input),
    callableResolution: createFunctionLoweringCallableResolutionContext(input),
    opOverload: createFunctionLoweringOpOverloadContext(input),
    astUtilities: createFunctionLoweringAstUtilityContext(input),
    registers: createFunctionLoweringRegisterContext(input),
  };
}

export function createFunctionLoweringSharedContext(
  input: Readonly<EmitFunctionLoweringContextInputs>,
): FunctionLoweringSharedContext {
  const parts = createFunctionLoweringComponentContexts(input);
  return {
    ...parts.diagnostics,
    ...parts.symbols,
    ...parts.spTracking,
    ...parts.emission,
    ...parts.conditions,
    ...parts.types,
    ...parts.materialization,
    ...parts.storage,
    ...parts.callableResolution,
    ...parts.opOverload,
    ...parts.astUtilities,
    ...parts.registers,
  };
}

export function createProgramLoweringContext(
  shared: Readonly<FunctionLoweringSharedContext>,
  input: Readonly<EmitProgramLoweringContextInputs>,
): ProgramLoweringContext {
  return {
    ...shared,
    program: input.program,
    includeDirs: input.includeDirs,
    localCallablesByFile: input.localCallablesByFile,
    visibleCallables: input.visibleCallables,
    localOpsByFile: input.localOpsByFile,
    visibleOpsByName: input.visibleOpsByName,
    declaredOpNames: input.declaredOpNames,
    declaredBinNames: input.declaredBinNames,
    deferredExterns: input.deferredExterns,
    storageTypes: input.storageTypes,
    moduleAliasTargets: input.moduleAliasTargets,
    moduleAliasDecls: input.moduleAliasDecls,
    rawAddressSymbols: input.rawAddressSymbols,
    absoluteSymbols: input.absoluteSymbols,
    symbols: input.symbols,
    dataBytes: input.dataBytes,
    codeBytes: input.codeBytes,
    hexBytes: input.hexBytes,
    activeSectionRef: input.activeSectionRef,
    codeOffsetRef: input.codeOffsetRef,
    dataOffsetRef: input.dataOffsetRef,
    varOffsetRef: input.varOffsetRef,
    baseExprs: input.baseExprs,
    advanceAlign: input.advanceAlign,
    alignTo: input.alignTo,
    loadBinInput: input.loadBinInput,
    loadHexInput: input.loadHexInput,
    resolveAggregateType: input.resolveAggregateType,
    sizeOfTypeExpr: input.sizeOfTypeExpr,
    lowerFunctionDecl: input.lowerFunctionDecl,
    recordLoweredAsmItem: input.recordLoweredAsmItem,
    lowerImmExprForLoweredAsm: input.lowerImmExprForLoweredAsm,
    namedSectionSinksByNode: input.namedSectionSinksByNode,
    withNamedSectionSink: <T>(sink: NamedSectionContributionSink, fn: () => T): T => {
      const prevSink = input.currentNamedSectionSinkRef.current;
      input.currentNamedSectionSinkRef.current = sink;
      sink.currentSourceTag = input.currentCodeSegmentTagRef.current;
      try {
        return fn();
      } finally {
        input.currentNamedSectionSinkRef.current = prevSink;
      }
    },
  };
}

export function createEmitLoweringContexts(
  input: EmitLoweringContextBuilderInput,
): {
  functionLoweringSharedContext: FunctionLoweringSharedContext;
  programLoweringContext: ProgramLoweringContext;
} {
  const functionLoweringSharedContext = createFunctionLoweringSharedContext(input.functionLowering);
  const programLoweringContext = createProgramLoweringContext(
    functionLoweringSharedContext,
    input.programLowering,
  );

  return {
    functionLoweringSharedContext,
    programLoweringContext,
  };
}
