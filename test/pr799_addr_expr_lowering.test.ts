import { describe, expect, it } from 'vitest';

import { DiagnosticIds } from '../src/diagnostics/types.js';
import type { Diagnostic } from '../src/diagnostics/types.js';
import { createAsmInstructionLoweringHelpers } from '../src/lowering/asmInstructionLowering.js';
import type { AsmInstructionNode, AsmOperandNode, EaExprNode, SourceSpan } from '../src/frontend/ast.js';

const span: SourceSpan = {
  file: 'fixture.zax',
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

describe('PR799 move address-of lowering', () => {
  it('lowers move rr, @path by pushing the address and popping into rr', () => {
    const diagnostics: Diagnostic[] = [];
    const instrs: string[] = [];
    let pushed: EaExprNode | undefined;
    let lowerLdCalled = false;

    const helper = createAsmInstructionLoweringHelpers({
      diagnostics,
      diagAt: (_diags, _span, message) => {
        diagnostics.push({
          id: DiagnosticIds.EmitError,
          severity: 'error',
          message,
          file: span.file,
          line: span.start.line,
          column: span.start.column,
        });
      },
      emitInstr: (head, operands) => {
        const dst = operands[0]?.kind === 'Reg' ? operands[0].name : '?';
        instrs.push(`${head}:${dst}`);
        return true;
      },
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
      lowerLdWithEa: () => {
        lowerLdCalled = true;
        return false;
      },
      pushEaAddress: (ea) => {
        pushed = ea;
        return true;
      },
      emitVirtualReg16Transfer: () => false,
      reg16: new Set(['BC', 'DE', 'HL']),
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
        { kind: 'Reg', span, name: 'HL' },
        {
          kind: 'Ea',
          span,
          expr: { kind: 'EaName', span, name: 'x' },
          explicitAddressOf: true,
        },
      ] satisfies AsmOperandNode[],
    };

    helper.lowerAsmInstructionDispatcher(moveItem);

    expect(lowerLdCalled).toBe(false);
    expect(diagnostics).toHaveLength(0);
    expect(pushed).toMatchObject({ kind: 'EaName', name: 'x' });
    expect(instrs).toContain('pop:HL');
  });

  it('diagnoses move address-of with a non-16-bit register destination', () => {
    const diagnostics: Diagnostic[] = [];
    let pushCalled = false;

    const helper = createAsmInstructionLoweringHelpers({
      diagnostics,
      diagAt: (_diags, _span, message) => {
        diagnostics.push({
          id: DiagnosticIds.EmitError,
          severity: 'error',
          message,
          file: span.file,
          line: span.start.line,
          column: span.start.column,
        });
      },
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
      lowerLdWithEa: () => false,
      pushEaAddress: () => {
        pushCalled = true;
        return true;
      },
      emitVirtualReg16Transfer: () => false,
      reg16: new Set(['BC', 'DE', 'HL']),
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
        {
          kind: 'Ea',
          span,
          expr: { kind: 'EaName', span, name: 'x' },
          explicitAddressOf: true,
        },
      ] satisfies AsmOperandNode[],
    };

    helper.lowerAsmInstructionDispatcher(moveItem);

    expect(pushCalled).toBe(false);
    expect(diagnostics.map((d) => d.message)).toContain(
      '"move" address-of source requires a 16-bit register destination.',
    );
  });
});
