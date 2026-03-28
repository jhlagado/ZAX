import { DiagnosticIds } from '../diagnosticTypes.js';
import type { SourceSegmentTag } from './loweringTypes.js';
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
import type { FunctionLoweringContext } from './functionLowering.js';

export function prepareFunctionLoweringSetupPhase(ctx: FunctionLoweringContext) {
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

export function runFunctionFrameSetupPhase(
  setup: ReturnType<typeof prepareFunctionLoweringSetupPhase>,
) {
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

export function prepareFunctionBodyLoweringPhase(
  setup: ReturnType<typeof prepareFunctionLoweringSetupPhase>,
  frame: ReturnType<typeof runFunctionFrameSetupPhase>,
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
          offset: setup.getCodeOffset(),
          file: item.span.file,
          line: item.span.start.line,
          scope: 'local',
        });
        traceLabel(setup.getCodeOffset(), frame.epilogueLabel);
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
      traceComment(setup.getCodeOffset(), `func ${item.name} end`);
    },
  });
}

export function finalizeFunctionLoweringPhase(
  setup: ReturnType<typeof prepareFunctionLoweringSetupPhase>,
  body: ReturnType<typeof prepareFunctionBodyLoweringPhase>,
): void {
  body.lowerAndFinalizeFunctionBody();
  setup.bindSpTracking(undefined);
  setup.setCurrentCodeSegmentTag(setup.getCurrentCodeSegmentTag());
}
