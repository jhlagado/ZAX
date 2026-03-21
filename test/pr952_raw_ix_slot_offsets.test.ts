import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR952 raw ix slot offsets', () => {
  it('resolves arg/local names inside raw ix displacements', async () => {
    const entry = join(__dirname, 'fixtures', 'pr952_raw_ix_slot_offsets_ok.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);
  });

  it('rejects alias-only locals as ix slot offsets', async () => {
    const entry = join(__dirname, 'fixtures', 'pr952_raw_ix_slot_offsets_alias.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0]?.message).toBe(
      'Alias "alias" has no frame slot; cannot be used as a raw IX offset.',
    );
  });

  it('diagnoses out-of-range ix displacements', async () => {
    const entry = join(__dirname, 'fixtures', 'pr952_raw_ix_slot_offsets_range.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0]?.message).toBe(
      'IX/IY displacement out of range (-128..127): 204.',
    );
  });
});
