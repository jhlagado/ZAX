import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR151: zero-operand known-head diagnostics matrix', () => {
  it('rejects extra operands on zero-operand known heads without generic fallback', async () => {
    const entry = join(__dirname, 'fixtures', 'pr151_zero_operand_head_diag_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('nop expects no operands');
    expect(messages).toContain('halt expects no operands');
    expect(messages).toContain('di expects no operands');
    expect(messages).toContain('ei expects no operands');
    expect(messages).toContain('scf expects no operands');
    expect(messages).toContain('ccf expects no operands');
    expect(messages).toContain('cpl expects no operands');
    expect(messages).toContain('daa expects no operands');
    expect(messages).toContain('rlca expects no operands');
    expect(messages).toContain('rrca expects no operands');
    expect(messages).toContain('rla expects no operands');
    expect(messages).toContain('rra expects no operands');
    expect(messages).toContain('exx expects no operands');
    expect(messages).toContain('neg expects no operands');
    expect(messages).toContain('reti expects no operands');
    expect(messages).toContain('retn expects no operands');
    expect(messages).toContain('rrd expects no operands');
    expect(messages).toContain('rld expects no operands');
    expect(messages).toContain('ldi expects no operands');
    expect(messages).toContain('ldir expects no operands');
    expect(messages).toContain('ldd expects no operands');
    expect(messages).toContain('lddr expects no operands');
    expect(messages).toContain('cpi expects no operands');
    expect(messages).toContain('cpir expects no operands');
    expect(messages).toContain('cpd expects no operands');
    expect(messages).toContain('cpdr expects no operands');
    expect(messages).toContain('ini expects no operands');
    expect(messages).toContain('inir expects no operands');
    expect(messages).toContain('ind expects no operands');
    expect(messages).toContain('indr expects no operands');
    expect(messages).toContain('outi expects no operands');
    expect(messages).toContain('otir expects no operands');
    expect(messages).toContain('outd expects no operands');
    expect(messages).toContain('otdr expects no operands');
    expect(messages.some((m) => m.startsWith('Unsupported instruction:'))).toBe(false);
  });
});
