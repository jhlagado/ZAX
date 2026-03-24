import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import {
  compilePlacedProgram,
  flattenLoweredItems,
  flattenLoweredInstructions,
  formatLoweredInstruction,
} from './helpers/lowered_program.js';

const fixture = join(__dirname, 'fixtures', 'pr320_extern_and_internal_calls.zax');

describe('PR320 extern typed-call preservation', () => {
  it('does not push preserves for extern typed calls but does for internal typed calls', async () => {
    const { program, diagnostics } = await compilePlacedProgram(fixture);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    // callee_internal prologue preserves AF/BC/DE (return in HL, volatile) per table
    const items = flattenLoweredItems(program);
    const labelIdx = items.findIndex((item) => item.kind === 'label' && item.name === 'callee_internal');
    expect(labelIdx).toBeGreaterThanOrEqual(0);
    const prologueItems = items.slice(labelIdx + 1, labelIdx + 12).filter((item) => item.kind === 'instr');
    const prologueLines = prologueItems.map((item) =>
      formatLoweredInstruction({
        head: item.head,
        operands: item.operands,
        ...(item.bytes ? { bytes: item.bytes } : {}),
        block: program.blocks[0],
      }).toUpperCase(),
    );
    expect(prologueLines).toContain('PUSH AF');
    expect(prologueLines).toContain('PUSH BC');
    expect(prologueLines).toContain('PUSH DE');

    // extern call site should not push preserves around callee_extern
    const instrs = flattenLoweredInstructions(program);
    const callIndices = instrs
      .map((ins, idx) => ({ ins, idx }))
      .filter(({ ins }) =>
        ins.head.toUpperCase() === 'CALL' ||
        (ins.head === '@raw' && ins.bytes?.length && ins.bytes[0] === 0xcd),
      )
      .map(({ idx }) => idx);
    expect(callIndices.length).toBeGreaterThan(0);

    const hasUnpreservedCall = callIndices.some((idx) => {
      const window = instrs.slice(Math.max(0, idx - 4), idx);
      return !window.some(
        (ins) =>
          ins.head.toUpperCase() === 'PUSH' &&
          ins.operands[0]?.kind === 'reg' &&
          ['AF', 'BC', 'DE'].includes(ins.operands[0].name.toUpperCase()),
      );
    });
    expect(hasUnpreservedCall).toBe(true);
  });
});
