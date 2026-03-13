import { describe, expect, it } from 'vitest';

import { createAsmInstructionLoweringHelpers } from '../src/lowering/asmInstructionLowering.js';
import type { AsmInstructionNode, AsmOperandNode, SourceSpan } from '../src/frontend/ast.js';

const span: SourceSpan = {
  file: 'fixture.zax',
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

describe('PR780 move lowering integration', () => {
  it('routes move through shared lowering path', () => {
    const received: AsmInstructionNode[] = [];
    const helper = createAsmInstructionLoweringHelpers({
      diagnostics: [],
      diagAt: () => {},
      emitInstr: () => true,
      emitRawCodeBytes: () => {},
      emitAbs16Fixup: () => {},
      emitAbs16FixupPrefixed: () => {},
      emitRel8Fixup: () => {},
      conditionOpcodeFromName: () => undefined,
      conditionNameFromOpcode: () => undefined,
      callConditionOpcodeFromName: () => undefined,
      jrConditionOpcodeFromName: () => undefined,
      conditionOpcode: () => undefined,
      symbolicTargetFromExpr: () => undefined,
      evalImmExpr: () => undefined,
      resolveScalarBinding: () => undefined,
      diagIfRetStackImbalanced: () => {},
      diagIfCallStackUnverifiable: () => {},
      warnIfRawCallTargetsTypedCallable: () => {},
      lowerLdWithEa: (inst) => {
        received.push(inst);
        return true;
      },
      emitVirtualReg16Transfer: () => false,
      emitSyntheticEpilogue: false,
      epilogueLabel: '__zax_epilogue_0',
      emitJumpTo: () => {},
      emitJumpCondTo: () => {},
      syncToFlow: () => {},
      flowRef: { current: { reachable: true } },
    });

    const moveItem: AsmInstructionNode = {
      kind: 'AsmInstruction',
      span,
      head: 'move',
      operands: [
        { kind: 'Reg', span, name: 'A' },
        { kind: 'Ea', span, expr: { kind: 'EaName', span, name: 'x' } },
      ] satisfies AsmOperandNode[],
    };

    helper.lowerAsmInstructionDispatcher(moveItem);

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      kind: 'AsmInstruction',
      head: 'ld',
      operands: [
        { kind: 'Reg', name: 'A' },
        { kind: 'Ea', expr: { kind: 'EaName', name: 'x' } },
      ],
    });
  });
});
