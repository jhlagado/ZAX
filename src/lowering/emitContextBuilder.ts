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

type EmitFunctionLoweringContextInputs = {
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

type EmitProgramLoweringContextInputs = {
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
  functionLowering: EmitFunctionLoweringContextInputs;
  programLowering: EmitProgramLoweringContextInputs;
};

export function createEmitLoweringContexts(
  input: EmitLoweringContextBuilderInput,
): {
  functionLoweringSharedContext: FunctionLoweringSharedContext;
  programLoweringContext: ProgramLoweringContext;
} {
  const functionLoweringDiagnosticsContext: FunctionLoweringDiagnosticsContext = {
    diagnostics: input.functionLowering.diagnostics,
    diag: input.functionLowering.diag,
    diagAt: input.functionLowering.diagAt,
    diagAtWithId: input.functionLowering.diagAtWithId,
    diagAtWithSeverityAndId: input.functionLowering.diagAtWithSeverityAndId,
    warnAt: input.functionLowering.warnAt,
  };
  const functionLoweringSymbolContext: FunctionLoweringSymbolContext = {
    taken: input.functionLowering.taken,
    pending: input.functionLowering.pending,
    traceComment: input.functionLowering.traceComment,
    traceLabel: input.functionLowering.traceLabel,
    currentCodeSegmentTagRef: input.functionLowering.currentCodeSegmentTagRef,
    generatedLabelCounterRef: input.functionLowering.generatedLabelCounterRef,
  };
  const functionLoweringSpTrackingContext: FunctionLoweringSpTrackingContext = {
    bindSpTracking: input.functionLowering.bindSpTracking,
  };
  const functionLoweringEmissionContext: FunctionLoweringEmissionContext = {
    getCodeOffset: input.functionLowering.getCodeOffset,
    emitInstr: input.functionLowering.emitInstr,
    emitRawCodeBytes: input.functionLowering.emitRawCodeBytes,
    emitAbs16Fixup: input.functionLowering.emitAbs16Fixup,
    emitAbs16FixupPrefixed: input.functionLowering.emitAbs16FixupPrefixed,
    emitRel8Fixup: input.functionLowering.emitRel8Fixup,
  };
  const functionLoweringConditionContext: FunctionLoweringConditionContext = {
    conditionOpcodeFromName: input.functionLowering.conditionOpcodeFromName,
    conditionNameFromOpcode: input.functionLowering.conditionNameFromOpcode,
    callConditionOpcodeFromName: input.functionLowering.callConditionOpcodeFromName,
    jrConditionOpcodeFromName: input.functionLowering.jrConditionOpcodeFromName,
    conditionOpcode: input.functionLowering.conditionOpcode,
    inverseConditionName: input.functionLowering.inverseConditionName,
    symbolicTargetFromExpr: input.functionLowering.symbolicTargetFromExpr,
  };
  const functionLoweringTypeContext: FunctionLoweringTypeContext = {
    evalImmExpr: input.functionLowering.evalImmExpr,
    env: input.functionLowering.env,
    resolveScalarBinding: input.functionLowering.resolveScalarBinding,
    resolveScalarKind: input.functionLowering.resolveScalarKind,
    resolveEaTypeExpr: input.functionLowering.resolveEaTypeExpr,
    resolveScalarTypeForEa: input.functionLowering.resolveScalarTypeForEa,
    resolveScalarTypeForLd: input.functionLowering.resolveScalarTypeForLd,
    resolveArrayType: input.functionLowering.resolveArrayType,
    typeDisplay: input.functionLowering.typeDisplay,
    sameTypeShape: input.functionLowering.sameTypeShape,
  };
  const functionLoweringMaterializationContext: FunctionLoweringMaterializationContext = {
    resolveEa: input.functionLowering.resolveEa,
    buildEaWordPipeline: input.functionLowering.buildEaWordPipeline,
    enforceEaRuntimeAtomBudget: input.functionLowering.enforceEaRuntimeAtomBudget,
    enforceDirectCallSiteEaBudget: input.functionLowering.enforceDirectCallSiteEaBudget,
    pushEaAddress: input.functionLowering.pushEaAddress,
    materializeEaAddressToHL: input.functionLowering.materializeEaAddressToHL,
    pushMemValue: input.functionLowering.pushMemValue,
    pushImm16: input.functionLowering.pushImm16,
    pushZeroExtendedReg8: input.functionLowering.pushZeroExtendedReg8,
    loadImm16ToHL: input.functionLowering.loadImm16ToHL,
    emitStepPipeline: input.functionLowering.emitStepPipeline,
    emitScalarWordLoad: input.functionLowering.emitScalarWordLoad,
    emitScalarWordStore: input.functionLowering.emitScalarWordStore,
    lowerLdWithEa: input.functionLowering.lowerLdWithEa,
  };
  const functionLoweringStorageContext: FunctionLoweringStorageContext = {
    stackSlotOffsets: input.functionLowering.stackSlotOffsets,
    stackSlotTypes: input.functionLowering.stackSlotTypes,
    localAliasTargets: input.functionLowering.localAliasTargets,
    storageTypes: input.functionLowering.storageTypes,
    moduleAliasTargets: input.functionLowering.moduleAliasTargets,
    rawTypedCallWarningsEnabled: input.functionLowering.rawTypedCallWarningsEnabled,
  };
  const functionLoweringCallableResolutionContext: FunctionLoweringCallableResolutionContext = {
    resolveCallable: input.functionLowering.resolveCallable,
    resolveOpCandidates: input.functionLowering.resolveOpCandidates,
    opStackPolicyMode: input.functionLowering.opStackPolicyMode,
  };
  const functionLoweringOpOverloadContext: FunctionLoweringOpOverloadContext = {
    formatAsmOperandForOpDiag: input.functionLowering.formatAsmOperandForOpDiag,
    selectOpOverload: input.functionLowering.selectOpOverload,
    summarizeOpStackEffect: input.functionLowering.summarizeOpStackEffect,
  };
  const functionLoweringAstUtilityContext: FunctionLoweringAstUtilityContext = {
    cloneImmExpr: input.functionLowering.cloneImmExpr,
    cloneEaExpr: input.functionLowering.cloneEaExpr,
    cloneOperand: input.functionLowering.cloneOperand,
    flattenEaDottedName: input.functionLowering.flattenEaDottedName,
    normalizeFixedToken: input.functionLowering.normalizeFixedToken,
  };
  const functionLoweringRegisterContext: FunctionLoweringRegisterContext = {
    reg8: input.functionLowering.reg8,
    reg16: input.functionLowering.reg16,
  };

  const functionLoweringSharedContext: FunctionLoweringSharedContext = {
    ...functionLoweringDiagnosticsContext,
    ...functionLoweringSymbolContext,
    ...functionLoweringSpTrackingContext,
    ...functionLoweringEmissionContext,
    ...functionLoweringConditionContext,
    ...functionLoweringTypeContext,
    ...functionLoweringMaterializationContext,
    ...functionLoweringStorageContext,
    ...functionLoweringCallableResolutionContext,
    ...functionLoweringOpOverloadContext,
    ...functionLoweringAstUtilityContext,
    ...functionLoweringRegisterContext,
  };

  const programLoweringContext: ProgramLoweringContext = {
    ...functionLoweringSharedContext,
    program: input.programLowering.program,
    includeDirs: input.programLowering.includeDirs,
    localCallablesByFile: input.programLowering.localCallablesByFile,
    visibleCallables: input.programLowering.visibleCallables,
    localOpsByFile: input.programLowering.localOpsByFile,
    visibleOpsByName: input.programLowering.visibleOpsByName,
    declaredOpNames: input.programLowering.declaredOpNames,
    declaredBinNames: input.programLowering.declaredBinNames,
    deferredExterns: input.programLowering.deferredExterns,
    storageTypes: input.programLowering.storageTypes,
    moduleAliasTargets: input.programLowering.moduleAliasTargets,
    moduleAliasDecls: input.programLowering.moduleAliasDecls,
    rawAddressSymbols: input.programLowering.rawAddressSymbols,
    absoluteSymbols: input.programLowering.absoluteSymbols,
    symbols: input.programLowering.symbols,
    dataBytes: input.programLowering.dataBytes,
    codeBytes: input.programLowering.codeBytes,
    hexBytes: input.programLowering.hexBytes,
    activeSectionRef: input.programLowering.activeSectionRef,
    codeOffsetRef: input.programLowering.codeOffsetRef,
    dataOffsetRef: input.programLowering.dataOffsetRef,
    varOffsetRef: input.programLowering.varOffsetRef,
    baseExprs: input.programLowering.baseExprs,
    advanceAlign: input.programLowering.advanceAlign,
    alignTo: input.programLowering.alignTo,
    loadBinInput: input.programLowering.loadBinInput,
    loadHexInput: input.programLowering.loadHexInput,
    resolveAggregateType: input.programLowering.resolveAggregateType,
    sizeOfTypeExpr: input.programLowering.sizeOfTypeExpr,
    lowerFunctionDecl: input.programLowering.lowerFunctionDecl,
    recordLoweredAsmItem: input.programLowering.recordLoweredAsmItem,
    lowerImmExprForLoweredAsm: input.programLowering.lowerImmExprForLoweredAsm,
    namedSectionSinksByNode: input.programLowering.namedSectionSinksByNode,
    withNamedSectionSink: <T>(sink: NamedSectionContributionSink, fn: () => T): T => {
      const prevSink = input.programLowering.currentNamedSectionSinkRef.current;
      input.programLowering.currentNamedSectionSinkRef.current = sink;
      sink.currentSourceTag = input.programLowering.currentCodeSegmentTagRef.current;
      try {
        return fn();
      } finally {
        input.programLowering.currentNamedSectionSinkRef.current = prevSink;
      }
    },
  };

  return {
    functionLoweringSharedContext,
    programLoweringContext,
  };
}