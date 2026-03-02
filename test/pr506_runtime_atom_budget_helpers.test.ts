import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR506: extracted runtime-atom budget helpers', () => {
  it('preserves source ea runtime-atom budget diagnostics', async () => {
    const entry = join(__dirname, 'fixtures', 'pr264_runtime_atom_budget_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('Source ea expression exceeds runtime-atom budget (max 1; found 2).');
  });

  it('preserves direct call-site ea runtime-atom budget diagnostics', async () => {
    const entry = join(__dirname, 'fixtures', 'pr273_call_address_runtime_index_reject.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages.some((m) => m.includes('Direct call-site ea argument for "takeAddr"'))).toBe(
      true,
    );
  });
});
