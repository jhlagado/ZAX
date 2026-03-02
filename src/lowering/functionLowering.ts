import { TEMPLATE_SW_DEBC } from '../addressing/steps.js';
import type { StepPipeline } from '../addressing/steps.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import type { Diagnostic, DiagnosticId } from '../diagnostics/types.js';
import type {
  AsmInstructionNode,
  AsmOperandNode,
  EaExprNode,
  FuncDeclNode,
  ImmExprNode,
  OpDeclNode,
  OpMatcherNode,
  ParamNode,
  SourceSpan,
  TypeExprNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { OpStackPolicyMode } from '../pipeline.js';
import type {
  Callable,
  PendingSymbol,
  SourceSegmentTag,
} from './loweringTypes.js';
import type { OpStackSummary } from './opStackAnalysis.js';
import type { ScalarKind } from './typeResolution.js';
import { createAsmInstructionLoweringHelpers } from './asmInstructionLowering.js';
import { createAsmBodyOrchestrationHelpers } from './asmBodyOrchestration.js';
import {
  createFunctionBodySetupHelpers,
  type FlowState,
  type OpExpansionFrame,
} from './functionBodySetup.js';
import { createFunctionCallLoweringHelpers } from './functionCallLowering.js';

type ResolvedArrayType = { element: TypeExprNode; length?: number };
export type FunctionLoweringContext = {
  item: FuncDeclNode;
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
  taken: Set<string>;
  pending: PendingSymbol[];
  traceComment: (offset: number, text: string) => void;
  traceLabel: (offset: number, name: string) => void;
  currentCodeSegmentTagRef: { current: SourceSegmentTag | undefined };
  trackedSpRef: { delta: number; valid: boolean; invalid: boolean };
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
  resolveArrayType: (typeExpr: TypeExprNode, env?: CompileEnv) => ResolvedArrayType | undefined;
  buildEaWordPipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  enforceEaRuntimeAtomBudget: (operand: AsmOperandNode, context: string) => boolean;
  enforceDirectCallSiteEaBudget: (operand: AsmOperandNode, calleeName: string) => boolean;
  pushEaAddress: (ea: EaExprNode, span: SourceSpan) => boolean;
  pushMemValue: (ea: EaExprNode, want: 'byte' | 'word', span: SourceSpan) => boolean;
  pushImm16: (value: number, span: SourceSpan) => boolean;
  pushZeroExtendedReg8: (regName: string, span: SourceSpan) => boolean;
  loadImm16ToHL: (value: number, span: SourceSpan) => boolean;
  stackSlotOffsets: Map<string, number>;
  stackSlotTypes: Map<string, TypeExprNode>;
  localAliasTargets: Map<string, EaExprNode>;
  storageTypes: Map<string, TypeExprNode>;
  rawTypedCallWarningsEnabled: boolean;
  callables: Map<string, Callable>;
  opsByName: Map<string, OpDeclNode[]>;
  opStackPolicyMode: OpStackPolicyMode;
  matcherMatchesOperand: (matcher: OpMatcherNode, operand: AsmOperandNode) => boolean;
  formatOpSignature: (op: OpDeclNode) => string;
  formatAsmOperandForOpDiag: (operand: AsmOperandNode) => string;
  firstOpOverloadMismatchReason: (
    op: OpDeclNode,
    args: AsmOperandNode[],
  ) => string | undefined;
  formatOpDefinitionForDiag: (op: OpDeclNode) => string;
  selectMostSpecificOpOverload: (
    candidates: OpDeclNode[],
    args: AsmOperandNode[],
  ) => OpDeclNode | undefined;
  summarizeOpStackEffect: (op: OpDeclNode) => OpStackSummary;
  cloneImmExpr: (expr: ImmExprNode) => ImmExprNode;
  cloneEaExpr: (expr: EaExprNode) => EaExprNode;
  cloneOperand: (operand: AsmOperandNode) => AsmOperandNode;
  flattenEaDottedName: (ea: EaExprNode) => string | undefined;
  normalizeFixedToken: (operand: AsmOperandNode) => string | undefined;
  typeDisplay: (typeExpr: TypeExprNode) => string;
  sameTypeShape: (left: TypeExprNode, right: TypeExprNode) => boolean;
  emitStepPipeline: (pipe: StepPipeline, span: SourceSpan) => boolean;
  lowerLdWithEa: (asmItem: AsmInstructionNode) => boolean;
  reg8: Set<string>;
  reg16: Set<string>;
  generatedLabelCounterRef: { current: number };
};

export function lowerFunctionDecl(ctx: FunctionLoweringContext): void {
  const { item, diagnostics, diag, diagAt, diagAtWithId, diagAtWithSeverityAndId, warnAt } = ctx;
  const { taken, pending, traceComment, traceLabel, currentCodeSegmentTagRef, trackedSpRef, getCodeOffset } = ctx;
  const {
    emitInstr: emitInstrBase,
    emitRawCodeBytes,
    emitAbs16Fixup,
    emitAbs16FixupPrefixed,
    emitRel8Fixup,
  } = ctx;
  const { conditionOpcodeFromName, conditionNameFromOpcode, callConditionOpcodeFromName } = ctx;
  const { jrConditionOpcodeFromName, conditionOpcode, inverseConditionName, symbolicTargetFromExpr } = ctx;
  const { evalImmExpr, env, resolveScalarBinding, resolveScalarKind, resolveEaTypeExpr } = ctx;
  const { resolveScalarTypeForEa, resolveArrayType, buildEaWordPipeline } = ctx;
  const { enforceEaRuntimeAtomBudget, enforceDirectCallSiteEaBudget } = ctx;
  const { pushEaAddress, pushMemValue, pushImm16, pushZeroExtendedReg8, loadImm16ToHL } = ctx;
  const { stackSlotOffsets, stackSlotTypes, localAliasTargets, storageTypes } = ctx;
  const { rawTypedCallWarningsEnabled, callables, opsByName, opStackPolicyMode } = ctx;
  const { matcherMatchesOperand, formatOpSignature, formatAsmOperandForOpDiag } = ctx;
  const { firstOpOverloadMismatchReason, formatOpDefinitionForDiag, selectMostSpecificOpOverload } = ctx;
  const { summarizeOpStackEffect, cloneImmExpr, cloneEaExpr, cloneOperand } = ctx;
  const { flattenEaDottedName, normalizeFixedToken, reg8, reg16, generatedLabelCounterRef } = ctx;
  const { typeDisplay, sameTypeShape, emitStepPipeline, lowerLdWithEa } = ctx;
  let currentCodeSegmentTag = currentCodeSegmentTagRef.current;
  const setCurrentCodeSegmentTag = (tag: SourceSegmentTag | undefined): void => {
    currentCodeSegmentTag = tag;
    currentCodeSegmentTagRef.current = tag;
  };
  const emitInstr = emitInstrBase;

  stackSlotOffsets.clear();
  stackSlotTypes.clear();
  localAliasTargets.clear();

  const localDecls = item.locals?.decls ?? [];
  const returnRegs = (item.returnRegs ?? []).map((r: string) => r.toUpperCase());
  const basePreserveOrder: string[] = ['AF', 'BC', 'DE', 'HL'];
  let preserveSet = basePreserveOrder.filter((r) => !returnRegs.includes(r));
  const preserveBytes = preserveSet.length * 2;
  const shouldPreserveTypedBoundary = preserveSet.length > 0;
  const hlPreserved = preserveSet.includes('HL');
  let localSlotCount = 0;
  const localScalarInitializers: Array<{
    name: string;
    expr?: ImmExprNode;
    span: SourceSpan;
    scalarKind: 'byte' | 'word' | 'addr';
  }> = [];
  for (let li = 0; li < localDecls.length; li++) {
    const decl = localDecls[li]!;
    const declLower = decl.name.toLowerCase();
    if (decl.typeExpr) {
      const scalarKind = resolveScalarKind(decl.typeExpr);
      if (!scalarKind) {
        diagAt(
          diagnostics,
          decl.span,
          `Non-scalar local storage declaration "${decl.name}" requires alias form ("${decl.name} = rhs").`,
        );
        continue;
      }
      // Locals are packed tightly starting at IX-2, independent of preserve bytes.
      const localIxDisp = -(2 * (localSlotCount + 1));
      stackSlotOffsets.set(declLower, localIxDisp);
      stackSlotTypes.set(declLower, decl.typeExpr);
      localSlotCount++;
      const init = decl.initializer;
      if (init && init.kind !== 'VarInitValue') {
        diagAt(
          diagnostics,
          decl.span,
          `Unsupported typed alias form for "${decl.name}": use "${decl.name} = rhs" for alias initialization.`,
        );
        continue;
      }
      localScalarInitializers.push({
        name: decl.name,
        ...(init ? { expr: init.expr } : {}),
        span: decl.span,
        scalarKind,
      });
      continue;
    }
    const init = decl.initializer;
    if (init?.kind !== 'VarInitAlias') {
      diagAt(
        diagnostics,
        decl.span,
        `Invalid local declaration "${decl.name}": expected typed storage or alias initializer.`,
      );
      continue;
    }
    localAliasTargets.set(declLower, init.expr);
    const inferred = resolveEaTypeExpr(init.expr);
    if (!inferred) {
      diagAt(
        diagnostics,
        decl.span,
        `Incompatible inferred alias binding for "${decl.name}": unable to infer type from alias source.`,
      );
      continue;
    }
    stackSlotTypes.set(declLower, inferred);
  }
  const localBytes = localSlotCount * 2;
  const frameSize = localBytes + preserveBytes;
  const argc = item.params.length;
  const hasStackSlots = frameSize > 0 || argc > 0 || preserveBytes > 0;
  for (let paramIndex = 0; paramIndex < argc; paramIndex++) {
    const p = item.params[paramIndex]!;
    const base = 4 + 2 * paramIndex;
    stackSlotOffsets.set(p.name.toLowerCase(), base);
    stackSlotTypes.set(p.name.toLowerCase(), p.typeExpr);
  }

  let epilogueLabel = `__zax_epilogue_${generatedLabelCounterRef.current++}`;
  while (taken.has(epilogueLabel)) {
    epilogueLabel = `__zax_epilogue_${generatedLabelCounterRef.current++}`;
  }
  const emitSyntheticEpilogue =
    preserveSet.length > 0 || hasStackSlots || localScalarInitializers.length > 0;

  // Function entry label.
  traceComment(getCodeOffset(), `func ${item.name} begin`);
  if (taken.has(item.name)) {
    diag(diagnostics, item.span.file, `Duplicate symbol name "${item.name}".`);
  } else {
    taken.add(item.name);
    traceLabel(getCodeOffset(), item.name);
    pending.push({
      kind: 'label',
      name: item.name,
      section: 'code',
      offset: getCodeOffset(),
      file: item.span.file,
      line: item.span.start.line,
      scope: 'global',
    });
  }

  if (hasStackSlots) {
    const prevTag = currentCodeSegmentTag;
    setCurrentCodeSegmentTag({
      file: item.span.file,
      line: item.span.start.line,
      column: item.span.start.column,
      kind: 'code',
      confidence: 'high',
    });
    try {
      emitInstr('push', [{ kind: 'Reg', span: item.span, name: 'IX' }], item.span);
      emitInstr(
        'ld',
        [
          { kind: 'Reg', span: item.span, name: 'IX' },
          {
            kind: 'Imm',
            span: item.span,
            expr: { kind: 'ImmLiteral', span: item.span, value: 0 },
          },
        ],
        item.span,
      );
      emitInstr(
        'add',
        [
          { kind: 'Reg', span: item.span, name: 'IX' },
          { kind: 'Reg', span: item.span, name: 'SP' },
        ],
        item.span,
      );
    } finally {
      setCurrentCodeSegmentTag(prevTag);
    }
  }

  for (const init of localScalarInitializers) {
    const prevTag = currentCodeSegmentTag;
    setCurrentCodeSegmentTag({
      file: init.span.file,
      line: init.span.start.line,
      column: init.span.start.column,
      kind: 'code',
      confidence: 'high',
    });
    try {
      const initValue =
        init.expr !== undefined ? evalImmExpr(init.expr, env, diagnostics) : 0;
      if (init.expr !== undefined && initValue === undefined) {
        diagAt(
          diagnostics,
          init.span,
          `Failed to evaluate local initializer for "${init.name}".`,
        );
        continue;
      }
      const narrowed = init.scalarKind === 'byte' ? initValue! & 0xff : initValue! & 0xffff;
      if (hlPreserved) {
        // Swap pattern: save incoming HL, load initializer, swap to stack, restore HL.
        emitInstr('push', [{ kind: 'Reg', span: init.span, name: 'HL' }], init.span);
        if (!loadImm16ToHL(narrowed, init.span)) continue;
        emitInstr(
          'ex',
          [
            {
              kind: 'Mem',
              span: init.span,
              expr: { kind: 'EaName', span: init.span, name: 'SP' },
            },
            { kind: 'Reg', span: init.span, name: 'HL' },
          ],
          init.span,
        );
      } else {
        if (!loadImm16ToHL(narrowed, init.span)) continue;
        emitInstr('push', [{ kind: 'Reg', span: init.span, name: 'HL' }], init.span);
      }
    } finally {
      setCurrentCodeSegmentTag(prevTag);
    }
  }

  if (shouldPreserveTypedBoundary) {
    const prevTag = currentCodeSegmentTag;
    setCurrentCodeSegmentTag({
      file: item.span.file,
      line: item.span.start.line,
      column: item.span.start.column,
      kind: 'code',
      confidence: 'high',
    });
    try {
      for (const reg of preserveSet) {
        emitInstr('push', [{ kind: 'Reg', span: item.span, name: reg }], item.span);
      }
    } finally {
      setCurrentCodeSegmentTag(prevTag);
    }
  }

  // Track SP deltas relative to the start of user asm, after prologue reservation.
  trackedSpRef.delta = 0;
  trackedSpRef.valid = true;
  trackedSpRef.invalid = false;

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
  const trackedSp = {
    get delta() {
      return trackedSpRef.delta;
    },
    set delta(value: number) {
      trackedSpRef.delta = value;
    },
    get valid() {
      return trackedSpRef.valid;
    },
    set valid(value: boolean) {
      trackedSpRef.valid = value;
    },
    get invalid() {
      return trackedSpRef.invalid;
    },
    set invalid(value: boolean) {
      trackedSpRef.invalid = value;
    },
  };
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
    loadSelectorIntoHL,
  } = createFunctionBodySetupHelpers({
    diagnostics,
    diagAt,
    diagAtWithId,
    getCurrentCodeSegmentTag: () => currentCodeSegmentTag,
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
    loadImm16ToHL,
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

  const { lowerAsmInstructionDispatcher } = createAsmInstructionLoweringHelpers({
    diagnostics,
    diagAt,
    emitInstr,
    emitRawCodeBytes,
    emitAbs16Fixup,
    emitAbs16FixupPrefixed,
    emitRel8Fixup,
    conditionOpcodeFromName,
    conditionNameFromOpcode,
    callConditionOpcodeFromName,
    jrConditionOpcodeFromName,
    conditionOpcode,
    symbolicTargetFromExpr,
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
    resolveScalarBinding,
    diagIfRetStackImbalanced: (span, mnemonic) => {
      if (emitSyntheticEpilogue) return;
      if (trackedSpRef.valid && trackedSpRef.delta !== 0) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} with non-zero tracked stack delta (${trackedSpRef.delta}); function stack is imbalanced.`,
        );
        return;
      }
      if (!trackedSpRef.valid && trackedSpRef.invalid && hasStackSlots) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} reached after untracked SP mutation; cannot verify function stack balance.`,
        );
        return;
      }
      if (!trackedSpRef.valid && hasStackSlots) {
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
      if (hasStackSlots && trackedSpRef.valid && trackedSpRef.delta > 0) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached with positive tracked stack delta (${trackedSpRef.delta}); cannot verify ${contractNoun}.`,
        );
        return;
      }
      if (hasStackSlots && !trackedSpRef.valid && trackedSpRef.invalid) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached after untracked SP mutation; cannot verify ${contractNoun}.`,
        );
        return;
      }
      if (hasStackSlots && !trackedSpRef.valid) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached with unknown stack depth; cannot verify ${contractNoun}.`,
        );
      }
    },
    warnIfRawCallTargetsTypedCallable: (span, symbolicTarget) => {
      if (!rawTypedCallWarningsEnabled || !symbolicTarget || symbolicTarget.addend !== 0) return;
      const callable = callables.get(symbolicTarget.baseLower);
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
    emitVirtualReg16Transfer,
    emitSyntheticEpilogue,
    epilogueLabel,
    emitJumpTo,
    emitJumpCondTo,
    syncToFlow,
    flowRef,
  });

  const { emitAsmInstruction, lowerAsmRange } = createFunctionCallLoweringHelpers({
    diagnostics,
    asmItemSpanSourceTag: (span) => sourceTagForSpan(span, opExpansionStack),
    getCurrentCodeSegmentTag: () => currentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    appendInvalidOpExpansionDiagnostic,
    enforceEaRuntimeAtomBudget,
    hasStackSlots,
    emitSyntheticEpilogue,
    getTrackedSpDelta: () => trackedSpRef.delta,
    setTrackedSpDelta: (value) => {
      trackedSpRef.delta = value;
    },
    getTrackedSpValid: () => trackedSpRef.valid,
    setTrackedSpValid: (value) => {
      trackedSpRef.valid = value;
    },
    getTrackedSpInvalid: () => trackedSpRef.invalid,
    setTrackedSpInvalid: (value) => {
      trackedSpRef.invalid = value;
    },
    rawTypedCallWarningsEnabled,
    callables,
    diagAt,
    diagAtWithSeverityAndId,
    resolveScalarTypeForEa,
    enforceDirectCallSiteEaBudget,
    resolveEaTypeExpr,
    stackSlotTypes,
    storageTypes,
    pushEaAddress,
    resolveArrayType,
    sameTypeShape,
    typeDisplay,
    resolveScalarBinding,
    pushMemValue,
    flattenEaDottedName,
    env,
    evalImmExpr,
    resolveScalarKind,
    reg8,
    reg16,
    buildEaWordPipeline,
    emitStepPipeline,
    emitInstr,
    emitAbs16Fixup,
    pushZeroExtendedReg8,
    pushImm16,
    syncToFlow,
    opsByName,
    opStackPolicyMode,
    opExpansionStack,
    diagAtWithId,
    matcherMatchesOperand,
    formatOpSignature,
    formatAsmOperandForOpDiag: (operand) => formatAsmOperandForOpDiag(operand) ?? '?',
    firstOpOverloadMismatchReason,
    formatOpDefinitionForDiag,
    selectMostSpecificOpOverload,
    summarizeOpStackEffect,
    cloneImmExpr,
    cloneEaExpr,
    cloneOperand,
    normalizeFixedToken,
    inverseConditionName,
    newHiddenLabel,
    lowerAsmInstructionDispatcher,
    defineCodeLabel,
    flowRef,
    syncFromFlow,
    snapshotFlow: () => snapshotFlow(flow),
    restoreFlow,
    emitJumpIfFalse,
    emitJumpTo,
    warnAt,
    joinFlows: (left, right, span, contextName) =>
      joinFlows(left, right, span, contextName, hasStackSlots),
    loadSelectorIntoHL,
    emitRawCodeBytes,
    emitSelectCompareReg8ToImm8,
    emitSelectCompareToImm16,
  });

  const { lowerAndFinalizeFunctionBody } = createAsmBodyOrchestrationHelpers({
    asmItems: item.asm.items,
    itemName: item.name,
    itemSpan: item.span,
    emitSyntheticEpilogue,
    hasStackSlots,
    lowerAsmRange,
    syncToFlow,
    getFlow: () => flow,
    setFlow: (state) => {
      flow = state;
    },
    diagAt: (span, message) => diagAt(diagnostics, span, message),
    emitImplicitRet: () => {
      withCodeSourceTag(sourceTagForSpan(item.span, opExpansionStack), () => {
        emitInstr('ret', [], item.span);
      });
    },
    emitSyntheticEpilogueBody: () => {
      withCodeSourceTag(sourceTagForSpan(item.span, opExpansionStack), () => {
        pending.push({
          kind: 'label',
          name: epilogueLabel,
          section: 'code',
          offset: getCodeOffset(),
          file: item.span.file,
          line: item.span.start.line,
          scope: 'local',
        });
        traceLabel(getCodeOffset(), epilogueLabel);
        const popOrder = preserveSet.slice().reverse();
        for (const reg of popOrder) {
          emitInstr('pop', [{ kind: 'Reg', span: item.span, name: reg }], item.span);
        }
        if (hasStackSlots) {
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
  lowerAndFinalizeFunctionBody();

  setCurrentCodeSegmentTag(currentCodeSegmentTag);
}
