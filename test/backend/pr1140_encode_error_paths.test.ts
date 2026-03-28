import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../../src/diagnosticTypes.js';
import { DiagnosticIds } from '../../src/diagnosticTypes.js';
import type { AsmInstructionNode, AsmOperandNode, SourceSpan } from '../../src/frontend/ast.js';
import { encodeInstruction } from '../../src/z80/encode.js';

const span: SourceSpan = {
  file: 'pr1140_encode_error_paths.zax',
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

const env = {
  consts: new Map<string, number>(),
  enums: new Map<string, number>(),
  types: new Map(),
};

function instruction(head: string, operands: AsmOperandNode[]): AsmInstructionNode {
  return { kind: 'AsmInstruction', span, head, operands };
}

function reg(name: string): AsmOperandNode {
  return { kind: 'Reg', span, name };
}

function imm(value: number): AsmOperandNode {
  return { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value } };
}

function memName(name: string): AsmOperandNode {
  return { kind: 'Mem', span, expr: { kind: 'EaName', span, name } };
}

function portImm(value: number): AsmOperandNode {
  return { kind: 'PortImm8', span, expr: { kind: 'ImmLiteral', span, value } };
}

describe('PR1140 encodeInstruction error-path coverage', () => {
  it('reports control-family operand errors', () => {
    const diagnostics: Diagnostic[] = [];

    const encoded = encodeInstruction(instruction('ret', [imm(1)]), env, diagnostics);

    expect(encoded).toBeUndefined();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.id).toBe(DiagnosticIds.EncodeError);
    expect(diagnostics[0]?.message).toBe('ret cc expects a valid condition code');
  });

  it('reports alu-family arity errors from the dispatcher', () => {
    const diagnostics: Diagnostic[] = [];

    const encoded = encodeInstruction(
      instruction('sub', [reg('A'), reg('B'), reg('C')]),
      env,
      diagnostics,
    );

    expect(encoded).toBeUndefined();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.id).toBe(DiagnosticIds.EncodeError);
    expect(diagnostics[0]?.message).toBe('sub expects one operand, or two with destination A');
  });

  it('reports io-family operand errors', () => {
    const diagnostics: Diagnostic[] = [];

    const encoded = encodeInstruction(instruction('out', [portImm(0x12)]), env, diagnostics);

    expect(encoded).toBeUndefined();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.id).toBe(DiagnosticIds.EncodeError);
    expect(diagnostics[0]?.message).toBe('out expects two operands');
  });

  it('reports ld-family unsupported forms', () => {
    const diagnostics: Diagnostic[] = [];

    const encoded = encodeInstruction(
      instruction('ld', [memName('HL'), memName('DE')]),
      env,
      diagnostics,
    );

    expect(encoded).toBeUndefined();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.id).toBe(DiagnosticIds.EncodeError);
    expect(diagnostics[0]?.message).toBe('ld does not support memory-to-memory transfers');
  });

  it('reports core-family arity errors from the dispatcher', () => {
    const diagnostics: Diagnostic[] = [];

    const encoded = encodeInstruction(instruction('inc', [reg('A'), reg('B')]), env, diagnostics);

    expect(encoded).toBeUndefined();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.id).toBe(DiagnosticIds.EncodeError);
    expect(diagnostics[0]?.message).toBe('inc expects one operand');
  });

  it('reports bit-family arity errors from the dispatcher', () => {
    const diagnostics: Diagnostic[] = [];

    const encoded = encodeInstruction(instruction('bit', [imm(1)]), env, diagnostics);

    expect(encoded).toBeUndefined();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.id).toBe(DiagnosticIds.EncodeError);
    expect(diagnostics[0]?.message).toBe('bit expects two operands');
  });
});
