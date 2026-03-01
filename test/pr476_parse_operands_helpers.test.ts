import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { makeSourceFile, span } from '../src/frontend/source.js';
import {
  parseAsmInstruction,
  parseAsmOperand,
  parseEaExprFromText,
} from '../src/frontend/parseOperands.js';

describe('PR476 operand parsing extraction', () => {
  const file = makeSourceFile('pr476_parse_operands_helpers.zax', '');
  const zeroSpan = span(file, 0, 0);

  it('keeps EA parsing behavior intact', () => {
    const diagnostics: Diagnostic[] = [];
    const expr = parseEaExprFromText(file.path, 'foo.bar[idx + 1] - 2', zeroSpan, diagnostics);

    expect(diagnostics).toEqual([]);
    expect(expr).toMatchObject({
      kind: 'EaSub',
      base: {
        kind: 'EaIndex',
        base: {
          kind: 'EaField',
          base: { kind: 'EaName', name: 'foo' },
          field: 'bar',
        },
        index: {
          kind: 'IndexImm',
          value: {
            kind: 'ImmBinary',
            op: '+',
          },
        },
      },
      offset: { kind: 'ImmLiteral', value: 2 },
    });
  });

  it('keeps asm operand parsing behavior intact', () => {
    const diagnostics: Diagnostic[] = [];
    expect(parseAsmOperand(file.path, '@foo[1]', zeroSpan, diagnostics)).toMatchObject({
      kind: 'Ea',
      explicitAddressOf: true,
    });
    expect(parseAsmOperand(file.path, '(foo[1])', zeroSpan, diagnostics)).toMatchObject({
      kind: 'Mem',
    });
    expect(parseAsmOperand(file.path, 'ixh', zeroSpan, diagnostics)).toEqual({
      kind: 'Reg',
      span: zeroSpan,
      name: 'IXH',
    });
    expect(diagnostics).toEqual([]);
  });

  it('keeps asm instruction parsing behavior intact', () => {
    const diagnostics: Diagnostic[] = [];
    const instr = parseAsmInstruction(file.path, 'out (3), a', zeroSpan, diagnostics);

    expect(diagnostics).toEqual([]);
    expect(instr).toEqual({
      kind: 'AsmInstruction',
      span: zeroSpan,
      head: 'out',
      operands: [
        {
          kind: 'PortImm8',
          span: zeroSpan,
          expr: { kind: 'ImmLiteral', span: zeroSpan, value: 3 },
        },
        { kind: 'Reg', span: zeroSpan, name: 'A' },
      ],
    });
  });
});
