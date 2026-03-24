import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { compilePlacedProgram, formatLoweredInstructions } from './helpers/lowered_program.js';

describe('PR406: IX fallback word load', () => {
  it('loads IX through the shared HL-address word accessor path', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_ix_fallback_load.zax');
    const res = await compile(
      entry,
      { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const lowered = await compilePlacedProgram(entry);
    expect(lowered.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const lines = formatLoweredInstructions(lowered.program).map((line) => line.toUpperCase());

    expect(lines.some((line) => line.includes('LD HL,') && line.includes('IDX_WORD'))).toBe(true);
    expect(lines).toContain('ADD HL, DE');
    expect(lines).toContain('LD E, (HL)');
    expect(lines).toContain('LD D, (HL)');
    expect(lines).toContain('LD L, E');
    expect(lines).toContain('LD H, D');
    expect(lines).toContain('PUSH HL');
    expect(lines).toContain('POP IX');
    expect(lines).not.toContain('LD A, (HL)');
  });
});
