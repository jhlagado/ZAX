import type { StepPipeline } from './steps.js';
import { DiagnosticIds } from '../diagnosticTypes.js';
import type { Diagnostic, DiagnosticId } from '../diagnosticTypes.js';
import type {
  AsmInstructionNode,
  AsmOperandNode,
  EaExprNode,
  FuncDeclNode,
  ImmExprNode,
  OpDeclNode,
  SourceSpan,
  TypeExprNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { OpStackPolicyMode } from '../pipeline.js';
import type { Callable, PendingSymbol, SourceSegmentTag } from './loweringTypes.js';
import type { OpOverloadSelection } from './opMatching.js';
import type { OpStackSummary } from './opStackAnalysis.js';
import type { EaResolution } from './eaResolution.js';
import type { ScalarKind } from './typeResolution.js';
import { createAsmInstructionLoweringHelpers } from './asmInstructionLowering.js';
import { createAsmBodyOrchestrationHelpers } from './asmBodyOrchestration.js';
import {
  createFunctionBodySetupHelpers,
  type FlowState,
  type OpExpansionFrame,
} from './functionBodySetup.js';
import { createFunctionAsmRewritingHelpers } from './functionAsmRewriting.js';
import { createFunctionCallLoweringHelpers } from './functionCallLowering.js';
import { initializeFunctionFrame } from './functionFrameSetup.js';

// This module owns the per-function lowering coordinator. It assembles the
// function-local helpers, state, and diagnostics around the extracted
// rewriting, frame-setup, body-setup, and call-lowering submodules.
type ResolvedArrayType = { element: TypeExprNode; length?: number };
export type FunctionLoweringItemContext = {
  /** Set by: program lowering construction. Used by: frame setup, body orchestration. */
  readonly item: FuncDeclNode;
};

export type FunctionLoweringDiagnosticsContext = {
  /** Set by: emit/context construction. Mutated by: frame setup, body setup, call lowering, asm instruction lowering, body orchestration. */
  readonly diagnostics: Diagnostic[];
  /** Set by: emit/context construction. Used by: frame setup. */
  readonly diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  /** Set by: emit/context construction. Used by: frame setup, body setup, call lowering, asm instruction lowering, body orchestration. */
  readonly diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  /** Set by: emit/context construction. Used by: body setup, call lowering. */
  readonly diagAtWithId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    message: string,
  ) => void;
  /** Set by: emit/context construction. Used by: call lowering, asm instruction lowering. */
  readonly diagAtWithSeverityAndId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    severity: 'error' | 'warning',
    message: string,
  ) => void;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly warnAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
};

export type FunctionLoweringSymbolContext = {
  /** Set by: emit/context construction. Mutated by: frame setup and body setup. Used by: frame setup and body setup. */
  readonly taken: Set<string>;
  /** Set by: emit/context construction. Mutated by: frame setup, body setup, body orchestration. Used by: frame setup, body setup, body orchestration. */
  readonly pending: PendingSymbol[];
  /** Set by: emit/context construction. Used by: frame setup. */
  readonly traceComment: (offset: number, text: string) => void;
  /** Set by: emit/context construction. Used by: frame setup, body setup, body orchestration. */
  readonly traceLabel: (offset: number, name: string, span?: SourceSpan) => void;
  /** Set by: emit/context construction. Mutated by: lowerFunctionDecl coordination, frame setup, body setup, call lowering, body orchestration. Used by: frame setup, body setup, call lowering. */
  readonly currentCodeSegmentTagRef: { current: SourceSegmentTag | undefined };
  /** Set by: emit/context construction. Mutated by: frame setup and body setup. Used by: frame setup and body setup. */
  readonly generatedLabelCounterRef: { current: number };
};

export type FunctionLoweringSpTrackingContext = {
  /** Set by: emit/context construction. Used by: frame setup. */
  readonly bindSpTracking: (
    callbacks?:
      | {
          applySpTracking: (headRaw: string, operands: AsmOperandNode[]) => void;
          invalidateSpTracking: () => void;
        }
      | undefined,
  ) => void;
};

export type FunctionLoweringEmissionContext = {
  /** Set by: emit/context construction. Used by: frame setup and body setup. */
  readonly getCodeOffset: () => number;
  /** Set by: emit/context construction. Used by: asm rewriting, frame setup, body setup, call lowering, asm instruction lowering, body orchestration. */
  readonly emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: body setup, call lowering, asm instruction lowering. */
  readonly emitRawCodeBytes: (bs: Uint8Array, file: string, traceText: string) => void;
  /** Set by: emit/context construction. Used by: body setup and call lowering. */
  readonly emitAbs16Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly emitAbs16FixupPrefixed: (
    prefix: number,
    opcode2: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly emitRel8Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    mnemonic: string,
  ) => void;
};

export type FunctionLoweringConditionContext = {
  /** Set by: emit/context construction. Used by: body setup and asm instruction lowering. */
  readonly conditionOpcodeFromName: (name: string) => number | undefined;
  /** Set by: emit/context construction. Used by: body setup. */
  readonly conditionNameFromOpcode: (opcode: number) => string | undefined;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly callConditionOpcodeFromName: (name: string) => number | undefined;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly jrConditionOpcodeFromName: (name: string) => number | undefined;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly conditionOpcode: (operand: AsmOperandNode) => number | undefined;
  /** Set by: emit/context construction. Used by: body setup and call lowering. */
  readonly inverseConditionName: (name: string) => string | undefined;
  /** Set by: emit/context construction. Used by: asm rewriting and asm instruction lowering. */
  readonly symbolicTargetFromExpr: (
    expr: ImmExprNode,
  ) => { baseLower: string; addend: number } | undefined;
};

export type FunctionLoweringTypeContext = {
  /** Set by: emit/context construction. Used by: asm rewriting, frame setup, call lowering. */
  readonly evalImmExpr: (
    expr: ImmExprNode,
    env: CompileEnv,
    diagnostics: Diagnostic[],
  ) => number | undefined;
  /** Set by: emit/context construction. Used by: asm rewriting, frame setup, call lowering. */
  readonly env: CompileEnv;
  /** Set by: emit/context construction. Used by: frame setup, call lowering, asm instruction lowering. */
  readonly resolveScalarBinding: (name: string) => ScalarKind | undefined;
  /** Set by: emit/context construction. Used by: asm rewriting, frame setup, call lowering. */
  readonly resolveScalarKind: (typeExpr: TypeExprNode) => ScalarKind | undefined;
  /** Set by: emit/context construction. Used by: frame setup and call lowering. */
  readonly resolveEaTypeExpr: (ea: EaExprNode) => TypeExprNode | undefined;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly resolveScalarTypeForEa: (ea: EaExprNode) => ScalarKind | undefined;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly resolveScalarTypeForLd: (ea: EaExprNode) => ScalarKind | undefined;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly resolveArrayType: (
    typeExpr: TypeExprNode,
    env?: CompileEnv,
  ) => ResolvedArrayType | undefined;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly typeDisplay: (typeExpr: TypeExprNode) => string;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly sameTypeShape: (left: TypeExprNode, right: TypeExprNode) => boolean;
};

export type FunctionLoweringMaterializationContext = {
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly resolveEa: (ea: EaExprNode, span: SourceSpan) => EaResolution | undefined;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly buildEaWordPipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly enforceEaRuntimeAtomBudget: (operand: AsmOperandNode, context: string) => boolean;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly enforceDirectCallSiteEaBudget: (
    operand: AsmOperandNode,
    calleeName: string,
  ) => boolean;
  /** Set by: emit/context construction. Used by: body setup, call lowering, asm instruction lowering. */
  readonly pushEaAddress: (ea: EaExprNode, span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly materializeEaAddressToHL: (ea: EaExprNode, span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: body setup and call lowering. */
  readonly pushMemValue: (ea: EaExprNode, want: 'byte' | 'word', span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly pushImm16: (value: number, span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly pushZeroExtendedReg8: (regName: string, span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: frame setup and body setup. */
  readonly loadImm16ToHL: (value: number, span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly emitStepPipeline: (pipe: StepPipeline, span: SourceSpan) => boolean;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly emitScalarWordLoad: (
    target: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly emitScalarWordStore: (
    source: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  /** Set by: emit/context construction. Used by: asm instruction lowering. */
  readonly lowerLdWithEa: (asmItem: AsmInstructionNode) => boolean;
};

export type FunctionLoweringStorageContext = {
  /** Set by: emit/context construction. Mutated by: frame setup (contents). Used by: asm rewriting, frame setup, asm instruction lowering. */
  readonly stackSlotOffsets: Map<string, number>;
  /** Set by: emit/context construction. Mutated by: frame setup (contents). Used by: asm rewriting, frame setup, call lowering. */
  readonly stackSlotTypes: Map<string, TypeExprNode>;
  /** Set by: emit/context construction. Mutated by: frame setup (contents). Used by: asm rewriting, frame setup, asm instruction lowering. */
  readonly localAliasTargets: Map<string, EaExprNode>;
  /** Set by: prescan/context construction. Used by: frame setup, call lowering, asm instruction lowering. */
  readonly storageTypes: Map<string, TypeExprNode>;
  /** Set by: prescan/context construction. Used by: frame setup and asm instruction lowering. */
  readonly moduleAliasTargets: Map<string, EaExprNode>;
  /** Set by: emit/context construction. Used by: call lowering and asm instruction lowering. */
  readonly rawTypedCallWarningsEnabled: boolean;
};

export type FunctionLoweringCallableResolutionContext = {
  /** Set by: emit/context construction. Used by: call lowering and asm instruction lowering. */
  readonly resolveCallable: (name: string, file: string) => Callable | undefined;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly resolveOpCandidates: (name: string, file: string) => OpDeclNode[] | undefined;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly opStackPolicyMode: OpStackPolicyMode;
};

export type FunctionLoweringOpOverloadContext = {
  /** Set by: emit/context construction. Used by: body setup and call lowering. */
  readonly formatAsmOperandForOpDiag: (operand: AsmOperandNode) => string;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly selectOpOverload: (
    overloads: OpDeclNode[],
    operands: AsmOperandNode[],
  ) => OpOverloadSelection;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly summarizeOpStackEffect: (op: OpDeclNode) => OpStackSummary;
};

export type FunctionLoweringAstUtilityContext = {
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly cloneImmExpr: (expr: ImmExprNode) => ImmExprNode;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly cloneEaExpr: (expr: EaExprNode) => EaExprNode;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly cloneOperand: (operand: AsmOperandNode) => AsmOperandNode;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly flattenEaDottedName: (ea: EaExprNode) => string | undefined;
  /** Set by: emit/context construction. Used by: call lowering. */
  readonly normalizeFixedToken: (operand: AsmOperandNode) => string | undefined;
};

export type FunctionLoweringRegisterContext = {
  /** Set by: emit/context construction. Used by: body setup and call lowering. */
  readonly reg8: Set<string>;
  /** Set by: emit/context construction. Used by: call lowering and asm instruction lowering. */
  readonly reg16: Set<string>;
};

export type FunctionLoweringSharedContext = FunctionLoweringDiagnosticsContext &
  FunctionLoweringSymbolContext &
  FunctionLoweringSpTrackingContext &
  FunctionLoweringEmissionContext &
  FunctionLoweringConditionContext &
  FunctionLoweringTypeContext &
  FunctionLoweringMaterializationContext &
  FunctionLoweringStorageContext &
  FunctionLoweringCallableResolutionContext &
  FunctionLoweringOpOverloadContext &
  FunctionLoweringAstUtilityContext &
  FunctionLoweringRegisterContext;

export type FunctionLoweringContext = FunctionLoweringItemContext & FunctionLoweringSharedContext;

type FunctionLoweringSetupPhase = ReturnType<typeof prepareFunctionLoweringSetupPhase>;
type FunctionFramePhase = ReturnType<typeof runFunctionFrameSetupPhase>;
type FunctionBodyPhase = ReturnType<typeof prepareFunctionBodyLoweringPhase>;

function prepareFunctionLoweringSetupPhase(ctx: FunctionLoweringContext) {
  const {
    item,
    diagnostics,
    diag,
    diagAt,
    taken,
    pending,
    traceComment,
    traceLabel,
    currentCodeSegmentTagRef,
    bindSpTracking,
    getCodeOffset,
    emitInstr: emitInstrBase,
    evalImmExpr,
    env,
    resolveScalarBinding,
    resolveScalarKind,
    resolveEaTypeExpr,
    stackSlotOffsets,
    stackSlotTypes,
    localAliasTargets,
    storageTypes,
    moduleAliasTargets,
    symbolicTargetFromExpr,
    loadImm16ToHL,
    generatedLabelCounterRef,
  } = ctx;
  let currentCodeSegmentTag = currentCodeSegmentTagRef.current;
  const setCurrentCodeSegmentTag = (tag: SourceSegmentTag | undefined): void => {
    currentCodeSegmentTag = tag;
    currentCodeSegmentTagRef.current = tag;
  };
  const emitInstr = emitInstrBase;
  const asmRewriting = createFunctionAsmRewritingHelpers({
    diagnostics,
    diagAt,
    evalImmExpr,
    env,
    stackSlotOffsets,
    stackSlotTypes,
    localAliasTargets,
    resolveScalarKind,
    symbolicTargetFromExpr,
    emitInstr,
  });
  const frameSetupContext = {
    item,
    diagnostics,
    diag,
    diagAt,
    typing: {
      env,
      resolveScalarBinding,
      resolveScalarKind,
      resolveEaTypeExpr,
      evalImmExpr,
    },
    storage: {
      stackSlotOffsets,
      stackSlotTypes,
      localAliasTargets,
      storageTypes,
      moduleAliasTargets,
    },
    symbols: {
      taken,
      pending,
      traceComment,
      traceLabel,
      generatedLabelCounterRef,
    },
    emission: {
      getCodeOffset,
      getCurrentCodeSegmentTag: () => currentCodeSegmentTag,
      setCurrentCodeSegmentTag,
      emitInstr,
      loadImm16ToHL,
    },
    spTracking: {
      bindSpTracking,
    },
  } as const;

  return {
    ctx,
    item,
    diagnostics,
    pending,
    traceComment,
    traceLabel,
    bindSpTracking,
    getCodeOffset,
    emitInstr,
    getCurrentCodeSegmentTag: () => currentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    frameSetupContext,
    ...asmRewriting,
  };
}

function runFunctionFrameSetupPhase(setup: FunctionLoweringSetupPhase) {
  const {
    ctx: {
      diagnostics,
      diagAt,
      diagAtWithId,
      conditionNameFromOpcode,
      inverseConditionName,
      conditionOpcodeFromName,
      emitRawCodeBytes,
      pushEaAddress,
      pushMemValue,
      evalImmExpr,
      env,
      reg8,
      formatAsmOperandForOpDiag,
      generatedLabelCounterRef,
      emitAbs16Fixup,
      taken,
    },
    pending,
    traceLabel,
    getCodeOffset,
    emitInstr,
    getCurrentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    frameSetupContext,
  } = setup;
  const { hasStackSlots, emitSyntheticEpilogue, epilogueLabel, preserveSet, trackedSp } =
    initializeFunctionFrame(frameSetupContext);

  let flow: FlowState = {
    reachable: true,
    spDelta: 0,
    spValid: true,
    spInvalidDueToMutation: false,
  };
  const flowRef: { readonly current: FlowState } = {
    get current() {
      return flow;
    },
  };
  const opExpansionStack: OpExpansionFrame[] = [];
  const {
    appendInvalidOpExpansionDiagnostic,
    sourceTagForSpan,
    withCodeSourceTag,
    syncFromFlow: syncFromFlowBase,
    syncToFlow: syncToFlowBase,
    snapshotFlow,
    restoreFlow: restoreFlowBase,
    newHiddenLabel,
    defineCodeLabel,
    emitJumpTo,
    emitJumpCondTo,
    emitJumpIfFalse,
    emitVirtualReg16Transfer,
    joinFlows,
    emitSelectCompareToImm16,
    emitSelectCompareReg8ToImm8,
    emitSelectCompareReg8Range,
    emitSelectCompareImm16Range,
    loadSelectorIntoHL,
  } = createFunctionBodySetupHelpers({
    diagnostics,
    diagAt,
    diagAtWithId,
    getCurrentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    taken,
    traceLabel,
    pending,
    getCodeOffset,
    emitAbs16Fixup,
    conditionNameFromOpcode,
    inverseConditionName,
    conditionOpcodeFromName,
    emitInstr,
    emitRawCodeBytes,
    loadImm16ToHL: setup.ctx.loadImm16ToHL,
    pushEaAddress,
    pushMemValue,
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
    reg8,
    generatedLabelCounterRef,
    formatAsmOperandForOpDiag,
  });

  const syncFromFlow = (): void => {
    syncFromFlowBase(flow, trackedSp);
  };
  const syncToFlow = (): void => {
    syncToFlowBase(flow, trackedSp);
  };
  const restoreFlow = (state: FlowState): void => {
    restoreFlowBase(
      {
        get current() {
          return flow;
        },
        set current(value: FlowState) {
          flow = value;
        },
      },
      state,
      trackedSp,
    );
  };

  return {
    hasStackSlots,
    emitSyntheticEpilogue,
    epilogueLabel,
    preserveSet,
    trackedSp,
    opExpansionStack,
    getFlow: () => flow,
    setFlow: (state: FlowState) => {
      flow = state;
    },
    flowRef,
    syncFromFlow,
    syncToFlow,
    snapshotFlow: () => snapshotFlow(flow),
    restoreFlow,
    appendInvalidOpExpansionDiagnostic,
    sourceTagForSpan,
    withCodeSourceTag,
    newHiddenLabel,
    defineCodeLabel,
    emitJumpTo,
    emitJumpCondTo,
    emitJumpIfFalse,
    emitVirtualReg16Transfer,
    joinFlows,
    emitSelectCompareToImm16,
    emitSelectCompareReg8ToImm8,
    emitSelectCompareReg8Range,
    emitSelectCompareImm16Range,
    loadSelectorIntoHL,
  };
}

function prepareFunctionBodyLoweringPhase(
  setup: FunctionLoweringSetupPhase,
  frame: FunctionFramePhase,
) {
  const {
    ctx: {
      item,
      diagnostics,
      diagAt,
      diagAtWithId,
      diagAtWithSeverityAndId,
      warnAt,
      emitRawCodeBytes,
      emitAbs16Fixup,
      emitAbs16FixupPrefixed,
      emitRel8Fixup,
      conditionOpcodeFromName,
      callConditionOpcodeFromName,
      jrConditionOpcodeFromName,
      conditionOpcode,
      inverseConditionName,
      resolveScalarBinding,
      resolveScalarKind,
      resolveEaTypeExpr,
      resolveScalarTypeForEa,
      resolveScalarTypeForLd,
      resolveArrayType,
      buildEaWordPipeline,
      enforceEaRuntimeAtomBudget,
      enforceDirectCallSiteEaBudget,
      resolveEa,
      pushEaAddress,
      materializeEaAddressToHL,
      pushMemValue,
      pushImm16,
      pushZeroExtendedReg8,
      stackSlotOffsets,
      stackSlotTypes,
      storageTypes,
      rawTypedCallWarningsEnabled,
      resolveCallable,
      resolveOpCandidates,
      opStackPolicyMode,
      formatAsmOperandForOpDiag,
      selectOpOverload,
      summarizeOpStackEffect,
      cloneImmExpr,
      cloneEaExpr,
      cloneOperand,
      flattenEaDottedName,
      normalizeFixedToken,
      reg8,
      reg16,
      typeDisplay,
      sameTypeShape,
      emitStepPipeline,
      emitScalarWordLoad,
      emitScalarWordStore,
      lowerLdWithEa,
      env,
      evalImmExpr,
    },
    pending,
    traceComment,
    traceLabel,
    getCodeOffset,
    emitInstr,
    getCurrentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    resolveLocalAliasTargetName,
    evalImmExprForAsm,
    symbolicTargetFromExprForAsm,
    emitInstrForAsm,
  } = setup;

  const { lowerAsmInstructionDispatcher } = createAsmInstructionLoweringHelpers({
    diagnostics,
    diagAt,
    emitInstr: emitInstrForAsm,
    emitRawCodeBytes,
    emitAbs16Fixup,
    emitAbs16FixupPrefixed,
    emitRel8Fixup,
    conditionOpcodeFromName,
    callConditionOpcodeFromName,
    jrConditionOpcodeFromName,
    conditionOpcode,
    symbolicTargetFromExpr: symbolicTargetFromExprForAsm,
    evalImmExpr: evalImmExprForAsm,
    resolveScalarBinding,
    resolveRawAliasTargetName: (name) => resolveLocalAliasTargetName(name.toLowerCase()),
    isModuleStorageName: (name) => storageTypes.has(name.toLowerCase()),
    isFrameSlotName: (name) => stackSlotOffsets.has(name.toLowerCase()),
    resolveScalarTypeForLd,
    resolveEa,
    diagIfRetStackImbalanced: (span, mnemonic) => {
      if (frame.emitSyntheticEpilogue) return;
      if (frame.trackedSp.valid && frame.trackedSp.delta !== 0) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} with non-zero tracked stack delta (${frame.trackedSp.delta}); function stack is imbalanced.`,
        );
        return;
      }
      if (!frame.trackedSp.valid && frame.trackedSp.invalid && frame.hasStackSlots) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} reached after untracked SP mutation; cannot verify function stack balance.`,
        );
        return;
      }
      if (!frame.trackedSp.valid && frame.hasStackSlots) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} reached with unknown stack depth; cannot verify function stack balance.`,
        );
      }
    },
    diagIfCallStackUnverifiable: (options) => {
      const span = options.span;
      const mnemonic = options.mnemonic ?? 'call';
      const contractKind = options.contractKind ?? 'callee';
      const contractNoun =
        contractKind === 'typed-call' ? 'typed-call boundary contract' : 'callee stack contract';
      if (frame.hasStackSlots && frame.trackedSp.valid && frame.trackedSp.delta > 0) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached with positive tracked stack delta (${frame.trackedSp.delta}); cannot verify ${contractNoun}.`,
        );
        return;
      }
      if (frame.hasStackSlots && !frame.trackedSp.valid && frame.trackedSp.invalid) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached after untracked SP mutation; cannot verify ${contractNoun}.`,
        );
        return;
      }
      if (frame.hasStackSlots && !frame.trackedSp.valid) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached with unknown stack depth; cannot verify ${contractNoun}.`,
        );
      }
    },
    warnIfRawCallTargetsTypedCallable: (span, symbolicTarget) => {
      if (!rawTypedCallWarningsEnabled || !symbolicTarget || symbolicTarget.addend !== 0) return;
      const callable = resolveCallable(symbolicTarget.baseLower, span.file);
      if (!callable) return;
      const typedName = callable.node.name;
      diagAtWithSeverityAndId(
        diagnostics,
        span,
        DiagnosticIds.RawCallTypedTargetWarning,
        'warning',
        `Raw call targets typed callable \"${typedName}\" and bypasses typed-call argument/preservation semantics; use typed call syntax unless raw ABI is intentional.`,
      );
    },
    lowerLdWithEa,
    pushEaAddress,
    materializeEaAddressToHL,
    emitScalarWordLoad,
    emitScalarWordStore,
    emitVirtualReg16Transfer: frame.emitVirtualReg16Transfer,
    reg16,
    emitSyntheticEpilogue: frame.emitSyntheticEpilogue,
    epilogueLabel: frame.epilogueLabel,
    emitJumpTo: frame.emitJumpTo,
    emitJumpCondTo: frame.emitJumpCondTo,
    syncToFlow: frame.syncToFlow,
    flowRef: frame.flowRef,
  });

  const callMaterialization = {
    enforceEaRuntimeAtomBudget,
    resolveScalarTypeForEa,
    enforceDirectCallSiteEaBudget,
    resolveEaTypeExpr,
    pushEaAddress,
    pushMemValue,
    resolveScalarBinding,
    flattenEaDottedName,
    buildEaWordPipeline,
    emitStepPipeline,
    pushZeroExtendedReg8,
    pushImm16,
  } as const;

  const { lowerAsmRange } = createFunctionCallLoweringHelpers({
    diagnostics,
    asmItemSpanSourceTag: (span) => frame.sourceTagForSpan(span, frame.opExpansionStack),
    getCurrentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    appendInvalidOpExpansionDiagnostic: frame.appendInvalidOpExpansionDiagnostic,
    enforceEaRuntimeAtomBudget,
    hasStackSlots: frame.hasStackSlots,
    emitSyntheticEpilogue: frame.emitSyntheticEpilogue,
    getTrackedSpDelta: () => frame.trackedSp.delta,
    setTrackedSpDelta: (value) => {
      frame.trackedSp.delta = value;
    },
    getTrackedSpValid: () => frame.trackedSp.valid,
    setTrackedSpValid: (value) => {
      frame.trackedSp.valid = value;
    },
    getTrackedSpInvalid: () => frame.trackedSp.invalid,
    setTrackedSpInvalid: (value) => {
      frame.trackedSp.invalid = value;
    },
    materialization: callMaterialization,
    rawTypedCallWarningsEnabled,
    resolveCallable,
    diagAt,
    diagAtWithSeverityAndId,
    stackSlotTypes,
    storageTypes,
    resolveArrayType,
    sameTypeShape,
    typeDisplay,
    env,
    evalImmExpr,
    resolveScalarKind,
    reg8,
    reg16,
    emitInstr,
    emitAbs16Fixup,
    syncToFlow: frame.syncToFlow,
    resolveOpCandidates,
    opStackPolicyMode,
    opExpansionStack: frame.opExpansionStack,
    diagAtWithId,
    formatAsmOperandForOpDiag: (operand) => formatAsmOperandForOpDiag(operand) ?? '?',
    selectOpOverload,
    summarizeOpStackEffect,
    cloneImmExpr,
    cloneEaExpr,
    cloneOperand,
    normalizeFixedToken,
    inverseConditionName,
    newHiddenLabel: frame.newHiddenLabel,
    lowerAsmInstructionDispatcher,
    defineCodeLabel: frame.defineCodeLabel,
    flowRef: frame.flowRef,
    syncFromFlow: frame.syncFromFlow,
    snapshotFlow: frame.snapshotFlow,
    restoreFlow: frame.restoreFlow,
    emitJumpIfFalse: frame.emitJumpIfFalse,
    emitJumpTo: frame.emitJumpTo,
    warnAt,
    joinFlows: (left, right, span, contextName) =>
      frame.joinFlows(left, right, span, contextName, frame.hasStackSlots),
    loadSelectorIntoHL: frame.loadSelectorIntoHL,
    emitRawCodeBytes,
    emitSelectCompareReg8ToImm8: frame.emitSelectCompareReg8ToImm8,
    emitSelectCompareToImm16: frame.emitSelectCompareToImm16,
    emitSelectCompareReg8Range: frame.emitSelectCompareReg8Range,
    emitSelectCompareImm16Range: frame.emitSelectCompareImm16Range,
  });

  return createAsmBodyOrchestrationHelpers({
    asmItems: item.asm.items,
    itemName: item.name,
    itemSpan: item.span,
    emitSyntheticEpilogue: frame.emitSyntheticEpilogue,
    hasStackSlots: frame.hasStackSlots,
    lowerAsmRange,
    syncToFlow: frame.syncToFlow,
    getFlow: frame.getFlow,
    setFlow: frame.setFlow,
    diagAt: (span, message) => diagAt(diagnostics, span, message),
    emitImplicitRet: () => {
      frame.withCodeSourceTag(frame.sourceTagForSpan(item.span, frame.opExpansionStack), () => {
        emitInstr('ret', [], item.span);
      });
    },
    emitSyntheticEpilogueBody: () => {
      frame.withCodeSourceTag(frame.sourceTagForSpan(item.span, frame.opExpansionStack), () => {
        pending.push({
          kind: 'label',
          name: frame.epilogueLabel,
          section: 'code',
          offset: getCodeOffset(),
          file: item.span.file,
          line: item.span.start.line,
          scope: 'local',
        });
        traceLabel(getCodeOffset(), frame.epilogueLabel);
        const popOrder = frame.preserveSet.slice().reverse();
        for (const reg of popOrder) {
          emitInstr('pop', [{ kind: 'Reg', span: item.span, name: reg }], item.span);
        }
        if (frame.hasStackSlots) {
          emitInstr(
            'ld',
            [
              { kind: 'Reg', span: item.span, name: 'SP' },
              { kind: 'Reg', span: item.span, name: 'IX' },
            ],
            item.span,
          );
          emitInstr('pop', [{ kind: 'Reg', span: item.span, name: 'IX' }], item.span);
        }
        emitInstr('ret', [], item.span);
      });
    },
    traceFunctionEnd: () => {
      traceComment(getCodeOffset(), `func ${item.name} end`);
    },
  });
}

function finalizeFunctionLoweringPhase(
  setup: FunctionLoweringSetupPhase,
  body: FunctionBodyPhase,
): void {
  body.lowerAndFinalizeFunctionBody();
  setup.bindSpTracking(undefined);
  setup.setCurrentCodeSegmentTag(setup.getCurrentCodeSegmentTag());
}

export function lowerFunctionDecl(ctx: FunctionLoweringContext): void {
  const setup = prepareFunctionLoweringSetupPhase(ctx);
  const frame = runFunctionFrameSetupPhase(setup);
  const body = prepareFunctionBodyLoweringPhase(setup, frame);
  finalizeFunctionLoweringPhase(setup, body);
}
