import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR203: ld diagnostics parity matrix', () => {
  it('emits explicit ld diagnostics and avoids fallback/unresolved-fixup noise', async () => {
    const entry = join(__dirname, 'fixtures', 'pr203_ld_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('ld does not support memory-to-memory transfers');
    expect(messages).toContain('ld r8, (bc/de) supports destination A only');
    expect(messages).toContain('ld (bc/de), r8 supports source A only');
    expect(messages).toContain('ld does not support AF in this form');
    expect(messages).toContain('ld rr, rr supports SP <- HL/IX/IY only');

    expect(messages).not.toContain('ld has unsupported operand form');
    expect(messages.some((m) => m.includes('Unresolved symbol "bc" in 16-bit fixup.'))).toBe(false);
    expect(messages.some((m) => m.includes('Unresolved symbol "de" in 16-bit fixup.'))).toBe(false);
  });
});
