import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR218 lowering: ret cc diagnostics under unknown/untracked stack states', () => {
  it('diagnoses exact unknown-stack ret cc contract for join mismatch paths', async () => {
    const entry = join(__dirname, 'fixtures', 'pr218_lowering_unknown_retcc_stack_state.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);

    const actual = res.diagnostics.map((d) => ({
      message: d.message,
      line: d.line,
      column: d.column,
    }));
    expect(actual).toEqual([
      { message: 'Stack depth mismatch at if join (-2 vs 0).', line: 9, column: 3 },
      {
        message: 'ret reached with unknown stack depth; cannot verify function stack balance.',
        line: 10,
        column: 3,
      },
      {
        message:
          'Function "unknown_retcc_from_if" has unknown stack depth at fallthrough; cannot verify stack balance.',
        line: 1,
        column: 1,
      },
    ]);
  });

  it('diagnoses exact untracked-SP ret cc contract for op-expansion mutation paths', async () => {
    const entry = join(__dirname, 'fixtures', 'pr218_lowering_untracked_retcc_stack_state.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);

    const actual = res.diagnostics.map((d) => ({
      message: d.message,
      line: d.line,
      column: d.column,
    }));
    expect(actual).toEqual([
      {
        message:
          'op "clobber_sp" expansion performs untracked SP mutation; cannot verify net stack delta.',
        line: 9,
        column: 3,
      },
      {
        message: 'ret reached after untracked SP mutation; cannot verify function stack balance.',
        line: 10,
        column: 3,
      },
      {
        message:
          'Function "untracked_retcc_from_op" has untracked SP mutation at fallthrough; cannot verify stack balance.',
        line: 5,
        column: 1,
      },
    ]);
  });
});
