import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR555: function-local SP tracking remains isolated', () => {
  it('preserves typed and raw call-boundary diagnostics across functions', async () => {
    const entry = join(__dirname, 'fixtures', 'pr275_typed_vs_raw_call_boundary_diag.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    const messages = res.diagnostics.map((d) => d.message);
    expect(
      messages.some((m) =>
        m.includes(
          'typed call "callee_typed" reached with unknown stack depth; cannot verify typed-call boundary contract.',
        ),
      ),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes('call reached with unknown stack depth; cannot verify callee stack contract.'),
      ),
    ).toBe(true);
  });
});
