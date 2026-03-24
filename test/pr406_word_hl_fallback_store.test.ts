import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { compilePlacedProgram, formatLoweredInstructions } from './helpers/lowered_program.js';

describe('PR406: HL fallback word store', () => {
  it('preserves the HL value while materializing a runtime-affine destination EA', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_hl_fallback_store.zax');
    const res = await compile(
      entry,
      { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const lowered = await compilePlacedProgram(entry);
    expect(lowered.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const lines = formatLoweredInstructions(lowered.program).map((line) => line.toUpperCase());

    expect(lines).toContain('PUSH DE');
    expect(lines).toContain('PUSH HL');
    expect(lines.some((line) => line.includes('LD HL,') && line.includes('IDX_WORD'))).toBe(true);
    expect(lines).toContain('ADD HL, DE');
    expect(lines).toContain('POP HL');
    expect(lines).toContain('POP DE');
    expect(lines).toContain('LD (HL), E');
    expect(lines).toContain('LD (HL), D');
    expect(lines).not.toContain('EX DE, HL');
  });
});
