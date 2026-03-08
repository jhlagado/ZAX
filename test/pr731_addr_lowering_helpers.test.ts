import { describe, expect, it } from 'vitest';

import type { AsmAddrNode, AsmOperandNode, SourceSpan } from '../src/frontend/ast.js';
import { createAddrLoweringHelpers } from '../src/lowering/addrLowering.js';

const span: SourceSpan = {
  file: 'pr731_addr_lowering_helpers.zax',
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

describe('#731 addr lowering helpers', () => {
  it('preserves AF, BC, and DE while materializing the address into HL', () => {
    const emitted: string[] = [];
    const item: AsmAddrNode = {
      kind: 'AsmAddr',
      span,
      dst: 'HL',
      expr: {
        kind: 'EaAdd',
        span,
        base: {
          kind: 'EaIndex',
          span,
          base: { kind: 'EaName', span, name: 'table' },
          index: { kind: 'IndexImm', span, value: { kind: 'ImmLiteral', span, value: 1 } },
        },
        offset: { kind: 'ImmLiteral', span, value: 2 },
      },
    };

    const emitInstr = (head: string, operands: AsmOperandNode[]) => {
      const rendered = operands
        .map((operand) => (operand.kind === 'Reg' ? operand.name : operand.kind))
        .join(', ');
      emitted.push(rendered ? `${head} ${rendered}` : head);
      return true;
    };

    const helpers = createAddrLoweringHelpers({
      emitInstr,
      materializeEaAddressToHL: () => {
        emitted.push('materialize -> ld E, (IX+4)');
        emitted.push('materialize -> ld D, (IX+5)');
        emitted.push('materialize -> ex DE, HL');
        return true;
      },
    });

    expect(helpers.lowerAsmAddr(item)).toBe(true);
    expect(emitted).toEqual([
      'push AF',
      'push BC',
      'push DE',
      'materialize -> ld E, (IX+4)',
      'materialize -> ld D, (IX+5)',
      'materialize -> ex DE, HL',
      'pop DE',
      'pop BC',
      'pop AF',
    ]);
  });
});
