import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR198 lowering invariants for unknown stack-tracking states', () => {
  it('diagnoses unknown stack states at joins/back-edges/ret/fallthrough after op expansion via function-stream contracts', async () => {
    const entry = join(__dirname, 'fixtures', 'pr198_lowering_unknown_stack_states.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);

    const messages = res.diagnostics.map((d) => d.message);

    expect(
      messages.some((m) =>
        m.includes('Cannot verify stack depth at if/else join due to unknown stack state.'),
      ),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes('Cannot verify stack depth at while back-edge due to unknown stack state.'),
      ),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes('Cannot verify stack depth at repeat/until due to unknown stack state.'),
      ),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes('Cannot verify stack depth at select join due to unknown stack state.'),
      ),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes('ret reached with unknown stack depth; cannot verify function stack balance.'),
      ),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes(
          'Function "unknown_fallthrough" has unknown stack depth at fallthrough; cannot verify stack balance.',
        ),
      ),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes(
          'Function "unknown_op_delta" has unknown stack depth at fallthrough; cannot verify stack balance.',
        ),
      ),
    ).toBe(true);
  });
});
