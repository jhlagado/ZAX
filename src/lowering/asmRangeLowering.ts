import type { AsmInstructionNode, AsmItemNode, AsmOperandNode, ImmExprNode, SourceSpan } from '../frontend/ast.js';

type FlowState = {
  reachable: boolean;
  spDelta: number;
  spValid: boolean;
  spInvalidDueToMutation: boolean;
};

type Context<TCodeSegmentTag> = {
  sourceTagForSpan: (span: SourceSpan) => TCodeSegmentTag;
  getCurrentCodeSegmentTag: () => TCodeSegmentTag | undefined;
  setCurrentCodeSegmentTag: (tag: TCodeSegmentTag | undefined) => void;
  defineCodeLabel: (name: string, span: SourceSpan, scope: 'global' | 'local') => void;
  emitAsmInstruction: (item: AsmInstructionNode) => void;
  flowRef: { readonly current: FlowState };
  syncFromFlow: () => void;
  snapshotFlow: () => FlowState;
  restoreFlow: (state: FlowState) => void;
  newHiddenLabel: (prefix: string) => string;
  emitJumpIfFalse: (cc: string, label: string, span: SourceSpan) => boolean;
  emitJumpTo: (label: string, span: SourceSpan) => void;
  diagAt: (span: SourceSpan, message: string) => void;
  warnAt: (span: SourceSpan, message: string) => void;
  joinFlows: (left: FlowState, right: FlowState, span: SourceSpan, contextName: string) => FlowState;
  hasStackSlots: boolean;
  reg8: Set<string>;
  evalImmExpr: (expr: ImmExprNode) => number | undefined;
  loadSelectorIntoHL: (selector: AsmOperandNode, span: SourceSpan) => boolean;
  emitRawCodeBytes: (bytes: Uint8Array, file: string, trace: string) => void;
  emitSelectCompareReg8ToImm8: (value: number, missLabel: string, span: SourceSpan) => void;
  emitSelectCompareToImm16: (value: number, missLabel: string, span: SourceSpan) => void;
  emitInstr: (name: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
};

export function createAsmRangeLoweringHelpers<TCodeSegmentTag>(ctx: Context<TCodeSegmentTag>) {
  const lowerAsmRange = (
    asmItems: readonly AsmItemNode[],
    startIndex: number,
    stopKinds: Set<string>,
  ): number => {
    let i = startIndex;
    while (i < asmItems.length) {
      const it = asmItems[i]!;
      if (stopKinds.has(it.kind)) return i;
      const prevTag = ctx.getCurrentCodeSegmentTag();
      ctx.setCurrentCodeSegmentTag(ctx.sourceTagForSpan(it.span));
      try {
        if (it.kind === 'AsmLabel') {
          ctx.defineCodeLabel(it.name, it.span, 'global');
          if (!ctx.flowRef.current.reachable) {
            ctx.flowRef.current.reachable = true;
            ctx.flowRef.current.spValid = false;
            ctx.flowRef.current.spDelta = 0;
            ctx.flowRef.current.spInvalidDueToMutation = false;
            ctx.syncFromFlow();
          }
          i++;
          continue;
        }
        if (it.kind === 'AsmInstruction') {
          ctx.emitAsmInstruction(it);
          i++;
          continue;
        }
        if (it.kind === 'If') {
          const entry = ctx.snapshotFlow();
          const elseLabel = ctx.newHiddenLabel('__zax_if_else');
          const endLabel = ctx.newHiddenLabel('__zax_if_end');
          ctx.emitJumpIfFalse(it.cc, elseLabel, it.span);

          let j = lowerAsmRange(asmItems, i + 1, new Set(['Else', 'End']));
          const thenExit = ctx.snapshotFlow();
          if (j >= asmItems.length) {
            ctx.diagAt(it.span, 'if without matching end.');
            return asmItems.length;
          }
          const term = asmItems[j]!;
          if (term.kind === 'Else') {
            if (thenExit.reachable) ctx.emitJumpTo(endLabel, term.span);
            ctx.defineCodeLabel(elseLabel, term.span, 'local');
            ctx.restoreFlow(entry);
            j = lowerAsmRange(asmItems, j + 1, new Set(['End']));
            const elseExit = ctx.snapshotFlow();
            if (j >= asmItems.length || asmItems[j]!.kind !== 'End') {
              ctx.diagAt(it.span, 'if/else without matching end.');
              return asmItems.length;
            }
            ctx.defineCodeLabel(endLabel, asmItems[j]!.span, 'local');
            ctx.restoreFlow(ctx.joinFlows(thenExit, elseExit, asmItems[j]!.span, 'if/else'));
            i = j + 1;
            continue;
          }
          if (term.kind !== 'End') {
            ctx.diagAt(it.span, 'if without matching end.');
            return asmItems.length;
          }
          ctx.defineCodeLabel(elseLabel, term.span, 'local');
          ctx.restoreFlow(ctx.joinFlows(thenExit, entry, term.span, 'if'));
          i = j + 1;
          continue;
        }
        if (it.kind === 'While') {
          const entry = ctx.snapshotFlow();
          const condLabel = ctx.newHiddenLabel('__zax_while_cond');
          const endLabel = ctx.newHiddenLabel('__zax_while_end');
          let backEdgeUnknown = false;
          let backEdgeMutation = false;
          ctx.defineCodeLabel(condLabel, it.span, 'local');
          ctx.emitJumpIfFalse(it.cc, endLabel, it.span);

          const j = lowerAsmRange(asmItems, i + 1, new Set(['End']));
          const bodyExit = ctx.snapshotFlow();
          if (j >= asmItems.length || asmItems[j]!.kind !== 'End') {
            ctx.diagAt(it.span, 'while without matching end.');
            return asmItems.length;
          }
          if (
            bodyExit.reachable &&
            bodyExit.spValid &&
            entry.spValid &&
            bodyExit.spDelta !== entry.spDelta
          ) {
            backEdgeUnknown = true;
            ctx.diagAt(
              asmItems[j]!.span,
              `Stack depth mismatch at while back-edge (${bodyExit.spDelta} vs ${entry.spDelta}).`,
            );
          } else if (
            bodyExit.reachable &&
            (!bodyExit.spValid || !entry.spValid) &&
            (bodyExit.spInvalidDueToMutation || entry.spInvalidDueToMutation)
          ) {
            backEdgeUnknown = true;
            backEdgeMutation = true;
            ctx.diagAt(
              asmItems[j]!.span,
              'Cannot verify stack depth at while back-edge due to untracked SP mutation.',
            );
          } else if (
            bodyExit.reachable &&
            (!bodyExit.spValid || !entry.spValid) &&
            ctx.hasStackSlots
          ) {
            backEdgeUnknown = true;
            ctx.diagAt(asmItems[j]!.span, 'Cannot verify stack depth at while back-edge due to unknown stack state.');
          }
          if (bodyExit.reachable) ctx.emitJumpTo(condLabel, asmItems[j]!.span);
          ctx.defineCodeLabel(endLabel, asmItems[j]!.span, 'local');
          if (backEdgeUnknown) {
            ctx.restoreFlow({
              reachable: entry.reachable,
              spDelta: 0,
              spValid: false,
              spInvalidDueToMutation: backEdgeMutation,
            });
          } else {
            ctx.restoreFlow(entry);
          }
          i = j + 1;
          continue;
        }
        if (it.kind === 'Repeat') {
          const entry = ctx.snapshotFlow();
          const loopLabel = ctx.newHiddenLabel('__zax_repeat_body');
          let backEdgeUnknown = false;
          let backEdgeMutation = false;
          ctx.defineCodeLabel(loopLabel, it.span, 'local');
          const j = lowerAsmRange(asmItems, i + 1, new Set(['Until']));
          if (j >= asmItems.length || asmItems[j]!.kind !== 'Until') {
            ctx.diagAt(it.span, 'repeat without matching until.');
            return asmItems.length;
          }
          const untilNode = asmItems[j]!;
          const bodyExit = ctx.snapshotFlow();
          const ok = ctx.emitJumpIfFalse(untilNode.cc, loopLabel, untilNode.span);
          if (!ok) return asmItems.length;
          if (
            bodyExit.reachable &&
            bodyExit.spValid &&
            entry.spValid &&
            bodyExit.spDelta !== entry.spDelta
          ) {
            backEdgeUnknown = true;
            ctx.diagAt(
              untilNode.span,
              `Stack depth mismatch at repeat/until (${bodyExit.spDelta} vs ${entry.spDelta}).`,
            );
          } else if (
            bodyExit.reachable &&
            (!bodyExit.spValid || !entry.spValid) &&
            (bodyExit.spInvalidDueToMutation || entry.spInvalidDueToMutation)
          ) {
            backEdgeUnknown = true;
            backEdgeMutation = true;
            ctx.diagAt(
              untilNode.span,
              'Cannot verify stack depth at repeat/until due to untracked SP mutation.',
            );
          } else if (
            bodyExit.reachable &&
            (!bodyExit.spValid || !entry.spValid) &&
            ctx.hasStackSlots
          ) {
            backEdgeUnknown = true;
            ctx.diagAt(untilNode.span, 'Cannot verify stack depth at repeat/until due to unknown stack state.');
          }
          if (backEdgeUnknown) {
            ctx.restoreFlow({
              reachable: bodyExit.reachable,
              spDelta: 0,
              spValid: false,
              spInvalidDueToMutation: backEdgeMutation,
            });
          }
          i = j + 1;
          continue;
        }
        if (it.kind === 'Select') {
          const entry = ctx.snapshotFlow();
          const dispatchLabel = ctx.newHiddenLabel('__zax_select_dispatch');
          const endLabel = ctx.newHiddenLabel('__zax_select_end');
          const selectorIsReg8 =
            it.selector.kind === 'Reg' && ctx.reg8.has(it.selector.name.toUpperCase());
          const caseValues = new Set<number>();
          const caseArms: { value: number; bodyLabel: string; span: SourceSpan }[] = [];
          let elseLabel: string | undefined;
          let sawArm = false;
          const armExits: FlowState[] = [];

          ctx.emitJumpTo(dispatchLabel, it.span);
          let j = i + 1;

          const closeArm = (span: SourceSpan) => {
            armExits.push(ctx.snapshotFlow());
            if (ctx.flowRef.current.reachable) ctx.emitJumpTo(endLabel, span);
          };

          while (j < asmItems.length) {
            const armItem = asmItems[j]!;
            if (armItem.kind === 'Case') {
              const bodyLabel = ctx.newHiddenLabel('__zax_case');
              ctx.defineCodeLabel(bodyLabel, armItem.span, 'local');
              let k = j;
              while (k < asmItems.length) {
                const caseItem = asmItems[k]!;
                if (caseItem.kind !== 'Case') break;
                const v = ctx.evalImmExpr(caseItem.value);
                if (v === undefined) {
                  ctx.diagAt(caseItem.span, 'Failed to evaluate case value.');
                } else {
                  const key = v & 0xffff;
                  const canMatchSelector = !selectorIsReg8 || key <= 0xff;
                  if (selectorIsReg8 && key > 0xff) {
                    ctx.warnAt(caseItem.span, `Case value ${key} can never match reg8 selector.`);
                  }
                  if (caseValues.has(key)) {
                    ctx.diagAt(caseItem.span, `Duplicate case value ${key}.`);
                  } else {
                    caseValues.add(key);
                    if (canMatchSelector) caseArms.push({ value: key, bodyLabel, span: caseItem.span });
                  }
                }
                k++;
              }
              ctx.restoreFlow(entry);
              sawArm = true;
              j = lowerAsmRange(asmItems, k, new Set(['Case', 'SelectElse', 'End']));
              closeArm(asmItems[Math.min(j, asmItems.length - 1)]!.span);
              continue;
            }
            if (armItem.kind === 'SelectElse') {
              if (elseLabel) {
                ctx.diagAt(armItem.span, 'Duplicate else in select.');
              }
              elseLabel = ctx.newHiddenLabel('__zax_select_else');
              ctx.defineCodeLabel(elseLabel, armItem.span, 'local');
              ctx.restoreFlow(entry);
              sawArm = true;
              j = lowerAsmRange(asmItems, j + 1, new Set(['End']));
              closeArm(asmItems[Math.min(j, asmItems.length - 1)]!.span);
              continue;
            }
            if (armItem.kind === 'End') break;
            ctx.diagAt(armItem.span, 'Expected case/else/end inside select.');
            j++;
          }

          if (j >= asmItems.length || asmItems[j]!.kind !== 'End') {
            ctx.diagAt(it.span, 'select without matching end.');
            return asmItems.length;
          }
          if (!sawArm) {
            ctx.diagAt(it.span, 'select must contain at least one case or else arm.');
          }

          ctx.defineCodeLabel(dispatchLabel, asmItems[j]!.span, 'local');
          let selectorConst: number | undefined;
          if (it.selector.kind === 'Imm') {
            const v = ctx.evalImmExpr(it.selector.expr);
            if (v !== undefined) selectorConst = v & 0xffff;
          }
          if (selectorConst !== undefined) {
            const matched = caseArms.find((arm) => arm.value === selectorConst);
            ctx.emitJumpTo(matched?.bodyLabel ?? elseLabel ?? endLabel, asmItems[j]!.span);
          } else if (caseArms.length === 0) {
            ctx.emitJumpTo(elseLabel ?? endLabel, asmItems[j]!.span);
          } else {
            if (!ctx.emitInstr('push', [{ kind: 'Reg', span: it.span, name: 'HL' }], it.span)) {
              return asmItems.length;
            }
            if (!ctx.loadSelectorIntoHL(it.selector, it.span)) {
              return asmItems.length;
            }
            if (selectorIsReg8) {
              ctx.emitRawCodeBytes(Uint8Array.of(0x7d), it.span.file, 'ld a, l');
            }
            for (const arm of caseArms) {
              const miss = ctx.newHiddenLabel('__zax_select_next');
              if (selectorIsReg8) {
                ctx.emitSelectCompareReg8ToImm8(arm.value, miss, arm.span);
              } else {
                ctx.emitSelectCompareToImm16(arm.value, miss, arm.span);
              }
              ctx.emitInstr('pop', [{ kind: 'Reg', span: arm.span, name: 'HL' }], arm.span);
              ctx.emitJumpTo(arm.bodyLabel, arm.span);
              ctx.defineCodeLabel(miss, arm.span, 'local');
            }
            ctx.emitInstr('pop', [{ kind: 'Reg', span: asmItems[j]!.span, name: 'HL' }], asmItems[j]!.span);
            ctx.emitJumpTo(elseLabel ?? endLabel, asmItems[j]!.span);
          }

          ctx.defineCodeLabel(endLabel, asmItems[j]!.span, 'local');
          const joinInputs = [...armExits];
          if (!elseLabel) joinInputs.push(entry);
          const reachable = joinInputs.filter((f) => f.reachable);
          if (reachable.length === 0) {
            ctx.restoreFlow({
              reachable: false,
              spDelta: 0,
              spValid: true,
              spInvalidDueToMutation: false,
            });
          } else {
            const base = reachable[0]!;
            const allValid = reachable.every((f) => f.spValid);
            let hasMismatch = false;
            if (allValid) {
              const mismatchFlow = reachable.find((f) => f.spDelta !== base.spDelta);
              if (mismatchFlow) {
                hasMismatch = true;
                ctx.diagAt(
                  asmItems[j]!.span,
                  `Stack depth mismatch at select join (${base.spDelta} vs ${mismatchFlow.spDelta}).`,
                );
              }
            } else if (reachable.some((f) => f.spInvalidDueToMutation)) {
              ctx.diagAt(
                asmItems[j]!.span,
                'Cannot verify stack depth at select join due to untracked SP mutation.',
              );
            } else if (ctx.hasStackSlots) {
              ctx.diagAt(asmItems[j]!.span, 'Cannot verify stack depth at select join due to unknown stack state.');
            }
            ctx.restoreFlow({
              reachable: true,
              spDelta: base.spDelta,
              spValid: allValid && !hasMismatch,
              spInvalidDueToMutation: reachable.some((f) => f.spInvalidDueToMutation),
            });
          }
          i = j + 1;
          continue;
        }
        if (
          it.kind === 'Else' ||
          it.kind === 'End' ||
          it.kind === 'Until' ||
          it.kind === 'Case' ||
          it.kind === 'SelectElse'
        ) {
          ctx.diagAt(it.span, `Unexpected "${it.kind.toLowerCase()}" in asm block.`);
          i++;
          continue;
        }
      } finally {
        ctx.setCurrentCodeSegmentTag(prevTag);
      }
    }
    return i;
  };

  return {
    lowerAsmRange,
  };
}
