import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR104 lowering op-expansion interactions under nested control', () => {
  it('diagnoses enclosing while back-edge mismatch after unbalanced op expansion inside nested control', async () => {
    const entry = join(__dirname, 'fixtures', 'pr104_nested_unbalanced_op_while.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(
      res.diagnostics.some((d) => d.message.includes('Stack depth mismatch at while back-edge')),
    ).toBe(true);
    expect(
      res.diagnostics.some((d) =>
        d.message.includes(
          'ret reached with unknown stack depth; cannot verify function stack balance.',
        ),
      ),
    ).toBe(true);
  });

  it('diagnoses untracked-SP function-stream join/return contracts after op expansion inside nested control', async () => {
    const entry = join(__dirname, 'fixtures', 'pr104_nested_untracked_sp_op_select.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(
      res.diagnostics.some((d) =>
        d.message.includes('Cannot verify stack depth at if join due to untracked SP mutation.'),
      ),
    ).toBe(true);
    expect(
      res.diagnostics.some((d) =>
        d.message.includes(
          'Cannot verify stack depth at select join due to untracked SP mutation.',
        ),
      ),
    ).toBe(true);
    expect(
      res.diagnostics.some((d) =>
        d.message.includes(
          'ret reached after untracked SP mutation; cannot verify function stack balance.',
        ),
      ),
    ).toBe(true);
  });
});
