import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR206: in/out indexed-byte-register diagnostics parity', () => {
  it('emits explicit diagnostics for ED in/out forms using IX*/IY* byte registers', async () => {
    const entry = join(__dirname, 'fixtures', 'pr206_in_out_indexed_reg_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('in destination must use legacy reg8 B/C/D/E/H/L/A');
    expect(messages).toContain('out source must use legacy reg8 B/C/D/E/H/L/A');

    expect(messages).not.toContain('in expects a reg8 destination');
    expect(messages).not.toContain('out expects a reg8 source');
    expect(messages.some((m) => m.startsWith('Unsupported instruction:'))).toBe(false);
  });
});
