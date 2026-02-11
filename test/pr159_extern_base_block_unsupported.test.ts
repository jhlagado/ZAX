import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR159 lowering: extern <binName> block base validation', () => {
  it('diagnoses extern base names that do not map to a declared bin symbol', async () => {
    const entry = join(__dirname, 'fixtures', 'pr159_extern_base_block_unsupported.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('extern base "legacy" does not reference a declared bin symbol.');
    expect(messages.some((m) => m.startsWith('Unsupported top-level construct:'))).toBe(false);
  });
});
