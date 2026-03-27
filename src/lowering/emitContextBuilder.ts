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

/** Flat field bag passed into {@link createEmitLoweringContexts} for function-body lowering. */
export type EmitFunctionLoweringContextInputs = {
  diagnostics: FunctionLoweringDiagnosticsContext['diagnostics'];
  diag: FunctionLoweringDiagnosticsContext['diag'];
  diagAt: FunctionLoweringDiagnosticsContext['diagAt'];
  diagAtWithId: FunctionLoweringDiagnosticsContext['diagAtWithId'];
  diagAtWithSeverityAndId: FunctionLoweringDiagnosticsContext['diagAtWithSeverityAndId'];
  warnAt: FunctionLoweringDiagnosticsContext['warnAt'];
  taken: FunctionLoweringSymbolContext['taken'];
  pending: FunctionLoweringSymbolContext['pending'];
  traceComment: FunctionLoweringSymbolContext['traceComment'];
  traceLabel: FunctionLoweringSymbolContext['traceLabel'];
  currentCodeSegmentTagRef: FunctionLoweringSymbolContext['currentCodeSegmentTagRef'];
  generatedLabelCounterRef: FunctionLoweringSymbolContext['generatedLabelCounterRef'];
  bindSpTracking: FunctionLoweringSpTrackingContext['bindSpTracking'];
  getCodeOffset: FunctionLoweringEmissionContext['getCodeOffset'];
  emitInstr: FunctionLoweringEmissionContext['emitInstr'];
  emitRawCodeBytes: FunctionLoweringEmissionContext['emitRawCodeBytes'];
  emitAbs16Fixup: FunctionLoweringEmissionContext['emitAbs16Fixup'];
  emitAbs16FixupPrefixed: FunctionLoweringEmissionContext['emitAbs16FixupPrefixed'];
  emitRel8Fixup: FunctionLoweringEmissionContext['emitRel8Fixup'];
  conditionOpcodeFromName: FunctionLoweringConditionContext['conditionOpcodeFromName'];
  conditionNameFromOpcode: FunctionLoweringConditionContext['conditionNameFromOpcode'];
  callConditionOpcodeFromName: FunctionLoweringConditionContext['callConditionOpcodeFromName'];
  jrConditionOpcodeFromName: FunctionLoweringConditionContext['jrConditionOpcodeFromName'];
  conditionOpcode: FunctionLoweringConditionContext['conditionOpcode'];
  inverseConditionName: FunctionLoweringConditionContext['inverseConditionName'];
  symbolicTargetFromExpr: FunctionLoweringConditionContext['symbolicTargetFromExpr'];
  evalImmExpr: FunctionLoweringTypeContext['evalImmExpr'];
  env: FunctionLoweringTypeContext['env'];
  resolveScalarBinding: FunctionLoweringTypeContext['resolveScalarBinding'];
  resolveScalarKind: FunctionLoweringTypeContext['resolveScalarKind'];
  resolveEaTypeExpr: FunctionLoweringTypeContext['resolveEaTypeExpr'];
  resolveScalarTypeForEa: FunctionLoweringTypeContext['resolveScalarTypeForEa'];
  resolveScalarTypeForLd: FunctionLoweringTypeContext['resolveScalarTypeForLd'];
  resolveArrayType: FunctionLoweringTypeContext['resolveArrayType'];
  typeDisplay: FunctionLoweringTypeContext['typeDisplay'];
  sameTypeShape: FunctionLoweringTypeContext['sameTypeShape'];
  resolveEa: FunctionLoweringMaterializationContext['resolveEa'];
  buildEaWordPipeline: FunctionLoweringMaterializationContext['buildEaWordPipeline'];
  enforceEaRuntimeAtomBudget: FunctionLoweringMaterializationContext['enforceEaRuntimeAtomBudget'];
  enforceDirectCallSiteEaBudget:
    FunctionLoweringMaterializationContext['enforceDirectCallSiteEaBudget'];
  pushEaAddress: FunctionLoweringMaterializationContext['pushEaAddress'];
  materializeEaAddressToHL: FunctionLoweringMaterializationContext['materializeEaAddressToHL'];
  pushMemValue: FunctionLoweringMaterializationContext['pushMemValue'];
  pushImm16: FunctionLoweringMaterializationContext['pushImm16'];
  pushZeroExtendedReg8: FunctionLoweringMaterializationContext['pushZeroExtendedReg8'];
  loadImm16ToHL: FunctionLoweringMaterializationContext['loadImm16ToHL'];
  emitStepPipeline: FunctionLoweringMaterializationContext['emitStepPipeline'];
  emitScalarWordLoad: FunctionLoweringMaterializationContext['emitScalarWordLoad'];
  emitScalarWordStore: FunctionLoweringMaterializationContext['emitScalarWordStore'];
  lowerLdWithEa: FunctionLoweringMaterializationContext['lowerLdWithEa'];
  stackSlotOffsets: FunctionLoweringStorageContext['stackSlotOffsets'];
  stackSlotTypes: FunctionLoweringStorageContext['stackSlotTypes'];
  localAliasTargets: FunctionLoweringStorageContext['localAliasTargets'];
  storageTypes: FunctionLoweringStorageContext['storageTypes'];
  moduleAliasTargets: FunctionLoweringStorageContext['moduleAliasTargets'];
  rawTypedCallWarningsEnabled: FunctionLoweringStorageContext['rawTypedCallWarningsEnabled'];
  resolveCallable: FunctionLoweringCallableResolutionContext['resolveCallable'];
  resolveOpCandidates: FunctionLoweringCallableResolutionContext['resolveOpCandidates'];
  opStackPolicyMode: FunctionLoweringCallableResolutionContext['opStackPolicyMode'];
  formatAsmOperandForOpDiag: FunctionLoweringOpOverloadContext['formatAsmOperandForOpDiag'];
  selectOpOverload: FunctionLoweringOpOverloadContext['selectOpOverload'];
  summarizeOpStackEffect: FunctionLoweringOpOverloadContext['summarizeOpStackEffect'];
  cloneImmExpr: FunctionLoweringAstUtilityContext['cloneImmExpr'];
  cloneEaExpr: FunctionLoweringAstUtilityContext['cloneEaExpr'];
  cloneOperand: FunctionLoweringAstUtilityContext['cloneOperand'];
  flattenEaDottedName: FunctionLoweringAstUtilityContext['flattenEaDottedName'];
  normalizeFixedToken: FunctionLoweringAstUtilityContext['normalizeFixedToken'];
  reg8: FunctionLoweringRegisterContext['reg8'];
  reg16: FunctionLoweringRegisterContext['reg16'];
};

/** Flat field bag for program-level lowering (merged with shared function-lowering fields in the builder). */
export type EmitProgramLoweringContextInputs = {
  program: ProgramLoweringContext['program'];
  includeDirs: ProgramLoweringContext['includeDirs'];
  localCallablesByFile: ProgramLoweringContext['localCallablesByFile'];
  visibleCallables: ProgramLoweringContext['visibleCallables'];
  localOpsByFile: ProgramLoweringContext['localOpsByFile'];
  visibleOpsByName: ProgramLoweringContext['visibleOpsByName'];
  declaredOpNames: ProgramLoweringContext['declaredOpNames'];
  declaredBinNames: ProgramLoweringContext['declaredBinNames'];
  deferredExterns: ProgramLoweringContext['deferredExterns'];
  storageTypes: ProgramLoweringContext['storageTypes'];
  moduleAliasTargets: ProgramLoweringContext['moduleAliasTargets'];
  moduleAliasDecls: ProgramLoweringContext['moduleAliasDecls'];
  rawAddressSymbols: ProgramLoweringContext['rawAddressSymbols'];
  absoluteSymbols: ProgramLoweringContext['absoluteSymbols'];
  symbols: ProgramLoweringContext['symbols'];
  dataBytes: ProgramLoweringContext['dataBytes'];
  codeBytes: ProgramLoweringContext['codeBytes'];
  hexBytes: ProgramLoweringContext['hexBytes'];
  activeSectionRef: ProgramLoweringContext['activeSectionRef'];
  codeOffsetRef: ProgramLoweringContext['codeOffsetRef'];
  dataOffsetRef: ProgramLoweringContext['dataOffsetRef'];
  varOffsetRef: ProgramLoweringContext['varOffsetRef'];
  baseExprs: ProgramLoweringContext['baseExprs'];
  advanceAlign: ProgramLoweringContext['advanceAlign'];
  alignTo: ProgramLoweringContext['alignTo'];
  loadBinInput: ProgramLoweringContext['loadBinInput'];
  loadHexInput: ProgramLoweringContext['loadHexInput'];
  resolveAggregateType: ProgramLoweringContext['resolveAggregateType'];
  sizeOfTypeExpr: ProgramLoweringContext['sizeOfTypeExpr'];
  lowerFunctionDecl: ProgramLoweringContext['lowerFunctionDecl'];
  recordLoweredAsmItem: ProgramLoweringContext['recordLoweredAsmItem'];
  lowerImmExprForLoweredAsm: ProgramLoweringContext['lowerImmExprForLoweredAsm'];
  namedSectionSinksByNode: ProgramLoweringContext['namedSectionSinksByNode'];
  currentNamedSectionSinkRef: { current: NamedSectionContributionSink | undefined };
  currentCodeSegmentTagRef: FunctionLoweringSymbolContext['currentCodeSegmentTagRef'];
};

export type EmitLoweringContextBuilderInput = {
  readonly functionLowering: Readonly<EmitFunctionLoweringContextInputs>;
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
