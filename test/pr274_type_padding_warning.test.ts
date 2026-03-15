import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR274: exact-size layout no longer emits padding warnings', () => {
  it('keeps exact-size composite layouts warning-free', async () => {
    const entry = join(__dirname, 'fixtures', 'pr274_type_padding_warning.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.some((d) => d.severity === 'error')).toBe(false);
    expect(res.diagnostics).toEqual([]);
  });

  it('keeps explicitly padded layouts warning-free', async () => {
    const entry = join(__dirname, 'fixtures', 'pr274_type_padding_explicit_ok.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);
  });
});
