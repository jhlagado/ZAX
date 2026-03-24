import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import {
  compilePlacedProgram,
  flattenLoweredInstructions,
  formatLoweredInstructions,
  hasRawOpcode,
} from './helpers/lowered_program.js';

const countRawOpcode = (
  instrs: ReturnType<typeof flattenLoweredInstructions>,
  opcode: number,
  opcode2?: number,
): number =>
  instrs.reduce((count, instr) => {
    if (instr.head !== '@raw' || !instr.bytes) return count;
    if (instr.bytes[0] !== opcode) return count;
    if (opcode2 !== undefined && instr.bytes[1] !== opcode2) return count;
    return count + 1;
  }, 0);

const compileLowered = async (entry: string) => {
  const res = await compilePlacedProgram(entry);
  expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const lines = formatLoweredInstructions(res.program).map((line) => line.toUpperCase());
  return {
    instrs: flattenLoweredInstructions(res.program),
    lines,
    text: lines.join('\n'),
  };
};

describe('GitHub issue #900 succ/pred lowering', () => {
  it('lowers byte and word typed paths end-to-end', async () => {
    const entry = join(__dirname, 'fixtures', 'pr900_succ_pred.zax');
    const { instrs, text, lines } = await compileLowered(entry);

    expect(lines.filter((line) => line === 'PUSH DE').length).toBeGreaterThan(0);
    expect(lines.filter((line) => line === 'POP DE').length).toBeGreaterThan(0);
    expect(text).toContain('INC E');
    expect(text).toContain('DEC E');
    expect(text).toContain('INC DE');
    expect(text).toContain('DEC DE');
    expect(lines.filter((line) => line === 'PUSH BC').length).toBeGreaterThan(0);
    expect(lines.filter((line) => line === 'POP BC').length).toBeGreaterThan(0);
    expect(lines.filter((line) => line === 'PUSH AF').length).toBeGreaterThan(0);
    expect(lines.filter((line) => line === 'POP AF').length).toBeGreaterThan(0);
    expect(text).toContain('LD A, D');
    expect(text).toContain('OR E');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
    expect(hasRawOpcode(instrs, 0x28)).toBe(true); // JR Z
  });

  it('avoids HL preservation for direct word fast paths', async () => {
    const entry = join(__dirname, 'fixtures', 'pr900_succ_pred_direct_word.zax');
    const { instrs, text, lines } = await compileLowered(entry);

    expect(text).toContain('LD E, (IX');
    expect(text).toContain('LD D, (IX');
    expect(hasRawOpcode(instrs, 0xed, 0x5b)).toBe(true); // LD DE, (nn)
    expect(lines.filter((line) => line === 'PUSH HL').length).toBe(2);
    expect(lines.filter((line) => line === 'POP HL').length).toBe(1);
  });

  it('reuses one materialized EA for indexed word update', async () => {
    const entry = join(__dirname, 'fixtures', 'pr900_succ_pred.zax');
    const { text } = await compileLowered(entry);

    expect(text).toMatch(
      /LD E, \(HL\)[\s\S]*?INC HL[\s\S]*?LD D, \(HL\)[\s\S]*?DEC HL[\s\S]*?INC DE[\s\S]*?LD \(HL\), E[\s\S]*?INC HL[\s\S]*?LD \(HL\), D/i,
    );
  });
});
