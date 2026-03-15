import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR507: extracted EA resolution helpers', () => {
  it('preserves scalar index value semantics for nested EA resolution', async () => {
    const entry = join(__dirname, 'fixtures', 'pr260_value_semantics_scalar_index.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics).toEqual([]);
  });

  it('preserves runtime-affine unsupported-shape diagnostics', async () => {
    const entry = join(__dirname, 'fixtures', 'pr272_runtime_affine_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain(
      'Runtime array index expression is unsupported. Use a single scalar runtime atom with +, -, *, << and constants (no /, %, &, |, ^, >> on runtime atoms).',
    );
  });
});
