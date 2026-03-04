import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR262 nested runtime index lowering for ld forms', () => {
  it('rejects ld forms with two runtime atoms in one ea expression', async () => {
    const entry = join(__dirname, 'fixtures', 'pr262_ld_nested_runtime_index.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(
      res.diagnostics.map((d) => ({
        message: d.message,
        line: d.line,
        column: d.column,
      })),
    ).toEqual([
      {
        message: 'Source ea expression exceeds runtime-atom budget (max 1; found 2).',
        line: 10,
        column: 3,
      },
      {
        message: 'Source ea expression exceeds runtime-atom budget (max 1; found 2).',
        line: 11,
        column: 3,
      },
    ]);
  });
});
