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
    const mainLabelIdx = items.findIndex((item) => item.kind === 'label' && item.name === 'main');
    expect(mainLabelIdx).toBeGreaterThanOrEqual(0);
    const mainBlock = items.slice(mainLabelIdx + 1);
    const mainInstrs = mainBlock
      .filter((item) => item.kind === 'instr')
      .map((item) => ({
        head: item.head,
        operands: item.operands,
        ...(item.bytes ? { bytes: item.bytes } : {}),
      }));

    const isCall = (ins: { head: string; bytes?: number[] }) =>
      ins.head.toUpperCase() === 'CALL' || (ins.head === '@raw' && ins.bytes?.[0] === 0xcd);

    const callIdxs: number[] = [];
    for (let i = 0; i < mainInstrs.length; i += 1) {
      const ins = mainInstrs[i];
      if (!ins) continue;
      if (isCall(ins)) callIdxs.push(i);
    }
    expect(callIdxs.length).toBeGreaterThanOrEqual(2);

    const hasPreservePushes = (idx: number) => {
      const window = mainInstrs.slice(Math.max(0, idx - 3), idx + 1);
      const hasPush = (reg: string) =>
        window.some(
          (ins) =>
            ins.head.toUpperCase() === 'PUSH' &&
            isReg(ins.operands[0], reg),
        );
      return hasPush('AF') || hasPush('BC') || hasPush('DE');
    };

    // Caller-side preservation should not wrap typed calls in main().
    for (const idx of callIdxs) {
      expect(hasPreservePushes(idx)).toBe(false);
    }
  });
});
