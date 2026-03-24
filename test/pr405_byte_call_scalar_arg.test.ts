import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import {
  compilePlacedProgram,
  flattenLoweredInstructions,
  formatLoweredInstruction,
  hasRawOpcode,
} from './helpers/lowered_program.js';

describe('PR405: byte call scalar arg', () => {
  it('pushes a bare global byte argument through the scalar byte path', async () => {
    const entry = join(__dirname, 'fixtures', 'pr405_byte_call_scalar_arg.zax');
    const lowered = await compilePlacedProgram(entry);
    expect(lowered.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const instrs = flattenLoweredInstructions(lowered.program);
    const lines = instrs.map((ins) => formatLoweredInstruction(ins).toUpperCase());

    expect(hasRawOpcode(instrs, 0x3a)).toBe(true);
    expect(lines).toContain('LD H, $00');
    expect(lines).toContain('LD L, A');
    expect(lines).toContain('PUSH HL');
    expect(hasRawOpcode(instrs, 0xcd)).toBe(true);
    expect(lines.join('\n')).not.toContain('ADD HL, DE');
  });
});
