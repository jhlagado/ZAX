import type { Diagnostic, DiagnosticId } from '../diagnosticTypes.js';
import type {
  AsmOperandNode,
  EaExprNode,
  ImmExprNode,
  OpDeclNode,
  ProgramNode,
  SourceSpan,
  TypeExprNode,
  VarDeclNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { FunctionLoweringSymbolContext, FunctionLoweringContext } from './functionLowering.js';
import { createEmitLoweringContexts } from './emitContextBuilder.js';
import type { Callable, PendingSymbol, SectionKind } from './loweringTypes.js';
import type { LoweredAsmItem, LoweredImmExpr } from './loweredAsmTypes.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';
import type { AggregateType, ScalarKind } from './typeResolution.js';
import type { OpOverloadSelection } from './opMatching.js';
import type { OpStackSummary } from './opStackAnalysis.js';
import type { EaResolution } from './eaResolution.js';
import type { StepPipeline } from '../addressing/steps.js';
import type { OpStackPolicyMode } from '../pipeline.js';

type Context = {
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  diagAtWithId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    message: string,
  ) => void;
  diagAtWithSeverityAndId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    severity: 'error' | 'warning',
    message: string,
  ) => void;
  warnAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  program: ProgramNode;
  includeDirs: string[];
  taken: Set<string>;
  pending: PendingSymbol[];
  traceComment: (offset: number, text: string) => void;
  traceLabel: (offset: number, name: string, span?: SourceSpan) => void;
  currentCodeSegmentTagRef: FunctionLoweringSymbolContext['currentCodeSegmentTagRef'];
  generatedLabelCounterRef: FunctionLoweringSymbolContext['generatedLabelCounterRef'];
  bindSpTracking: (
    callbacks?: {
      applySpTracking: (headRaw: string, operands: AsmOperandNode[]) => void;
      invalidateSpTracking: () => void;
    },
  ) => void;
  getCodeOffset: () => number;
  emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  emitRawCodeBytes: (bs: Uint8Array, file: string, traceText: string) => void;
  emitAbs16Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  emitAbs16FixupPrefixed: (
    prefix: number,
    opcode2: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  emitRel8Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    mnemonic: string,
  ) => void;
  conditionOpcodeFromName: (name: string) => number | undefined;
  conditionNameFromOpcode: (opcode: number) => string | undefined;
  callConditionOpcodeFromName: (name: string) => number | undefined;
  jrConditionOpcodeFromName: (name: string) => number | undefined;
  conditionOpcode: (operand: AsmOperandNode) => number | undefined;
  inverseConditionName: (name: string) => string | undefined;
  symbolicTargetFromExpr: (
    expr: ImmExprNode,
  ) => { baseLower: string; addend: number } | undefined;
  evalImmExpr: (
    expr: ImmExprNode,
    env: CompileEnv,
    diagnostics: Diagnostic[],
  ) => number | undefined;
  env: CompileEnv;
  resolveScalarBinding: (name: string) => ScalarKind | undefined;
  resolveScalarKind: (typeExpr: TypeExprNode) => ScalarKind | undefined;
  resolveEaTypeExpr: (ea: EaExprNode) => TypeExprNode | undefined;
  resolveScalarTypeForEa: (ea: EaExprNode) => ScalarKind | undefined;
  resolveScalarTypeForLd: (ea: EaExprNode) => ScalarKind | undefined;
  resolveArrayType: (typeExpr: TypeExprNode, env?: CompileEnv) => { element: TypeExprNode; length?: number } | undefined;
  typeDisplay: (typeExpr: TypeExprNode) => string;
  sameTypeShape: (left: TypeExprNode, right: TypeExprNode) => boolean;
  resolveEa: (ea: EaExprNode, span: SourceSpan) => EaResolution | undefined;
  buildEaWordPipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  enforceEaRuntimeAtomBudget: (operand: AsmOperandNode, context: string) => boolean;
  enforceDirectCallSiteEaBudget: (operand: AsmOperandNode, calleeName: string) => boolean;
  pushEaAddress: (ea: EaExprNode, span: SourceSpan) => boolean;
  materializeEaAddressToHL: (ea: EaExprNode, span: SourceSpan) => boolean;
  pushMemValue: (ea: EaExprNode, want: 'byte' | 'word', span: SourceSpan) => boolean;
  pushImm16: (value: number, span: SourceSpan) => boolean;
  pushZeroExtendedReg8: (regName: string, span: SourceSpan) => boolean;
  loadImm16ToHL: (value: number, span: SourceSpan) => boolean;
  emitStepPipeline: (pipe: StepPipeline, span: SourceSpan) => boolean;
  emitScalarWordLoad: (
    target: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  emitScalarWordStore: (
    source: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  lowerLdWithEa: (asmItem: import('../frontend/ast.js').AsmInstructionNode) => boolean;
  stackSlotOffsets: Map<string, number>;
  stackSlotTypes: Map<string, TypeExprNode>;
  localAliasTargets: Map<string, EaExprNode>;
  storageTypes: Map<string, TypeExprNode>;
  moduleAliasTargets: Map<string, EaExprNode>;
  rawTypedCallWarningsEnabled: boolean;
  resolveCallable: (name: string, file: string) => Callable | undefined;
  resolveOpCandidates: (name: string, file: string) => OpDeclNode[] | undefined;
  opStackPolicyMode: OpStackPolicyMode;
  formatAsmOperandForOpDiag: (operand: AsmOperandNode) => string;
  selectOpOverload: (overloads: OpDeclNode[], operands: AsmOperandNode[]) => OpOverloadSelection;
  summarizeOpStackEffect: (op: OpDeclNode) => OpStackSummary;
  cloneImmExpr: (expr: ImmExprNode) => ImmExprNode;
  cloneEaExpr: (expr: EaExprNode) => EaExprNode;
  cloneOperand: (operand: AsmOperandNode) => AsmOperandNode;
  flattenEaDottedName: (ea: EaExprNode) => string | undefined;
  normalizeFixedToken: (operand: AsmOperandNode) => string | undefined;
  reg8: Set<string>;
  reg16: Set<string>;
  localCallablesByFile: Map<string, Map<string, Callable>>;
  visibleCallables: Map<string, Callable>;
  localOpsByFile: Map<string, Map<string, OpDeclNode[]>>;
  visibleOpsByName: Map<string, OpDeclNode[]>;
  declaredOpNames: Set<string>;
  declaredBinNames: Set<string>;
  deferredExterns: Array<{
    name: string;
    baseLower: string;
    addend: number;
    file: string;
    line: number;
  }>;
  moduleAliasDecls: Map<string, VarDeclNode>;
  rawAddressSymbols: Set<string>;
  absoluteSymbols: Array<import('../formats/types.js').SymbolEntry>;
  symbols: Array<import('../formats/types.js').SymbolEntry>;
  dataBytes: Map<number, number>;
  codeBytes: Map<number, number>;
  hexBytes: Map<number, number>;
  activeSectionRef: { current: SectionKind };
  codeOffsetRef: { current: number };
  dataOffsetRef: { current: number };
  varOffsetRef: { current: number };
  baseExprs: Partial<Record<SectionKind, ImmExprNode>>;
  advanceAlign: (a: number) => void;
  alignTo: (n: number, alignment: number) => number;
  loadBinInput: (
    file: string,
    fromPath: string,
    includeDirs: string[],
    diag: (file: string, message: string) => void,
  ) => Uint8Array | undefined;
  loadHexInput: (
    file: string,
    fromPath: string,
    includeDirs: string[],
    diag: (file: string, message: string) => void,
  ) => { bytes: Map<number, number>; minAddress: number } | undefined;
  resolveAggregateType: (type: TypeExprNode) => AggregateType | undefined;
  sizeOfTypeExpr: (
    typeExpr: TypeExprNode,
    env: CompileEnv,
    diagnostics: Diagnostic[],
  ) => number | undefined;
  lowerFunctionDecl: (ctx: FunctionLoweringContext) => void;
  recordLoweredAsmItem: (item: LoweredAsmItem, span?: SourceSpan) => void;
  lowerImmExprForLoweredAsm: (expr: ImmExprNode) => LoweredImmExpr;
  namedSectionSinksByNode: Map<import('../frontend/ast.js').NamedSectionNode, NamedSectionContributionSink>;
  currentNamedSectionSinkRef: { current: NamedSectionContributionSink | undefined };
};

export function createEmitProgramContext(ctx: Context) {
  return createEmitLoweringContexts({
    functionLowering: {
      diagnostics: ctx.diagnostics,
      diag: ctx.diag,
      diagAt: ctx.diagAt,
      diagAtWithId: ctx.diagAtWithId,
      diagAtWithSeverityAndId: ctx.diagAtWithSeverityAndId,
      warnAt: ctx.warnAt,
      taken: ctx.taken,
      pending: ctx.pending,
      traceComment: ctx.traceComment,
      traceLabel: ctx.traceLabel,
      currentCodeSegmentTagRef: ctx.currentCodeSegmentTagRef,
      generatedLabelCounterRef: ctx.generatedLabelCounterRef,
      bindSpTracking: ctx.bindSpTracking,
      getCodeOffset: ctx.getCodeOffset,
      emitInstr: ctx.emitInstr,
      emitRawCodeBytes: ctx.emitRawCodeBytes,
      emitAbs16Fixup: ctx.emitAbs16Fixup,
      emitAbs16FixupPrefixed: ctx.emitAbs16FixupPrefixed,
      emitRel8Fixup: ctx.emitRel8Fixup,
      conditionOpcodeFromName: ctx.conditionOpcodeFromName,
      conditionNameFromOpcode: ctx.conditionNameFromOpcode,
      callConditionOpcodeFromName: ctx.callConditionOpcodeFromName,
      jrConditionOpcodeFromName: ctx.jrConditionOpcodeFromName,
      conditionOpcode: ctx.conditionOpcode,
      inverseConditionName: ctx.inverseConditionName,
      symbolicTargetFromExpr: ctx.symbolicTargetFromExpr,
      evalImmExpr: ctx.evalImmExpr,
      env: ctx.env,
      resolveScalarBinding: ctx.resolveScalarBinding,
      resolveScalarKind: ctx.resolveScalarKind,
      resolveEaTypeExpr: ctx.resolveEaTypeExpr,
      resolveScalarTypeForEa: ctx.resolveScalarTypeForEa,
      resolveScalarTypeForLd: ctx.resolveScalarTypeForLd,
      resolveArrayType: ctx.resolveArrayType,
      typeDisplay: ctx.typeDisplay,
      sameTypeShape: ctx.sameTypeShape,
      resolveEa: ctx.resolveEa,
      buildEaWordPipeline: ctx.buildEaWordPipeline,
      enforceEaRuntimeAtomBudget: ctx.enforceEaRuntimeAtomBudget,
      enforceDirectCallSiteEaBudget: ctx.enforceDirectCallSiteEaBudget,
      pushEaAddress: ctx.pushEaAddress,
      materializeEaAddressToHL: ctx.materializeEaAddressToHL,
      pushMemValue: ctx.pushMemValue,
      pushImm16: ctx.pushImm16,
      pushZeroExtendedReg8: ctx.pushZeroExtendedReg8,
      loadImm16ToHL: ctx.loadImm16ToHL,
      emitStepPipeline: ctx.emitStepPipeline,
      emitScalarWordLoad: ctx.emitScalarWordLoad,
      emitScalarWordStore: ctx.emitScalarWordStore,
      lowerLdWithEa: ctx.lowerLdWithEa,
      stackSlotOffsets: ctx.stackSlotOffsets,
      stackSlotTypes: ctx.stackSlotTypes,
      localAliasTargets: ctx.localAliasTargets,
      storageTypes: ctx.storageTypes,
      moduleAliasTargets: ctx.moduleAliasTargets,
      rawTypedCallWarningsEnabled: ctx.rawTypedCallWarningsEnabled,
      resolveCallable: ctx.resolveCallable,
      resolveOpCandidates: ctx.resolveOpCandidates,
      opStackPolicyMode: ctx.opStackPolicyMode,
      formatAsmOperandForOpDiag: ctx.formatAsmOperandForOpDiag,
      selectOpOverload: ctx.selectOpOverload,
      summarizeOpStackEffect: ctx.summarizeOpStackEffect,
      cloneImmExpr: ctx.cloneImmExpr,
      cloneEaExpr: ctx.cloneEaExpr,
      cloneOperand: ctx.cloneOperand,
      flattenEaDottedName: ctx.flattenEaDottedName,
      normalizeFixedToken: ctx.normalizeFixedToken,
      reg8: ctx.reg8,
      reg16: ctx.reg16,
    },
    programLowering: {
      program: ctx.program,
      includeDirs: ctx.includeDirs,
      localCallablesByFile: ctx.localCallablesByFile,
      visibleCallables: ctx.visibleCallables,
      localOpsByFile: ctx.localOpsByFile,
      visibleOpsByName: ctx.visibleOpsByName,
      declaredOpNames: ctx.declaredOpNames,
      declaredBinNames: ctx.declaredBinNames,
      deferredExterns: ctx.deferredExterns,
      storageTypes: ctx.storageTypes,
      moduleAliasTargets: ctx.moduleAliasTargets,
      moduleAliasDecls: ctx.moduleAliasDecls,
      rawAddressSymbols: ctx.rawAddressSymbols,
      absoluteSymbols: ctx.absoluteSymbols,
      symbols: ctx.symbols,
      dataBytes: ctx.dataBytes,
      codeBytes: ctx.codeBytes,
      hexBytes: ctx.hexBytes,
      activeSectionRef: ctx.activeSectionRef,
      codeOffsetRef: ctx.codeOffsetRef,
      dataOffsetRef: ctx.dataOffsetRef,
      varOffsetRef: ctx.varOffsetRef,
      baseExprs: ctx.baseExprs,
      advanceAlign: ctx.advanceAlign,
      alignTo: ctx.alignTo,
      loadBinInput: ctx.loadBinInput,
      loadHexInput: ctx.loadHexInput,
      resolveAggregateType: ctx.resolveAggregateType,
      sizeOfTypeExpr: ctx.sizeOfTypeExpr,
      lowerFunctionDecl: ctx.lowerFunctionDecl,
      recordLoweredAsmItem: ctx.recordLoweredAsmItem,
      lowerImmExprForLoweredAsm: ctx.lowerImmExprForLoweredAsm,
      namedSectionSinksByNode: ctx.namedSectionSinksByNode,
      currentNamedSectionSinkRef: ctx.currentNamedSectionSinkRef,
      currentCodeSegmentTagRef: ctx.currentCodeSegmentTagRef,
    },
  });
}