import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { DiagnosticIds } from '../src/diagnostics/types.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR143: abs16 fixup range validation', () => {
  it('reports underflowing abs16 symbolic addend fixup', async () => {
    const entry = join(__dirname, 'fixtures', 'pr143_abs16_fixup_underflow.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics.some((d) => d.id === DiagnosticIds.EmitError)).toBe(true);
    expect(
      res.diagnostics.some((d) => d.message.includes('16-bit fixup address out of range')),
    ).toBe(true);
  });

  it('reports overflowing abs16 symbolic addend fixup', async () => {
    const entry = join(__dirname, 'fixtures', 'pr143_abs16_fixup_overflow.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics.some((d) => d.id === DiagnosticIds.EmitError)).toBe(true);
    expect(
      res.diagnostics.some((d) => d.message.includes('16-bit fixup address out of range')),
    ).toBe(true);
  });
});
