import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compilePlacedProgram, flattenLoweredItems, flattenLoweredInstructions, isImmSymbol, isReg } from './helpers/lowered_program.js';

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
    const hasProloguePush = (reg: string) =>
      prologueItems.some(
        (item) =>
          item.head.toUpperCase() === 'PUSH' &&
          item.operands[0]?.kind === 'reg' &&
          item.operands[0].name.toUpperCase() === reg,
      );
    expect(hasProloguePush('AF')).toBe(true);
    expect(hasProloguePush('BC')).toBe(true);
    expect(hasProloguePush('DE')).toBe(true);

    // extern call site should not push preserves around callee_extern
    const instrs = flattenLoweredInstructions(program);
    const callIdx = instrs.findIndex(
      (ins) => ins.head.toUpperCase() === 'CALL' && isImmSymbol(ins.operands[0], 'callee_extern'),
    );
    expect(callIdx).toBeGreaterThanOrEqual(0);
    const window = instrs.slice(Math.max(0, callIdx - 3), callIdx + 1);
    const hasPush = (reg: string) =>
      window.some(
        (ins) =>
          ins.head.toUpperCase() === 'PUSH' &&
          isReg(ins.operands[0], reg),
      );
    expect(hasPush('AF')).toBe(false);
    expect(hasPush('BC')).toBe(false);
    expect(hasPush('DE')).toBe(false);
  });
});
