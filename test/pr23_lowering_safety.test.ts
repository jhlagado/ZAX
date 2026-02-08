import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR23 lowering safety checks', () => {
  it('diagnoses op expansions with non-zero net stack delta', async () => {
    const entry = join(__dirname, 'fixtures', 'pr23_op_unbalanced_stack.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics.some((d) => d.message.includes('non-zero net stack delta'))).toBe(true);
  });

  it('diagnoses ret with non-zero tracked stack delta', async () => {
    const entry = join(__dirname, 'fixtures', 'pr23_ret_stack_imbalance.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(
      res.diagnostics.some((d) => d.message.includes('ret with non-zero tracked stack delta')),
    ).toBe(true);
  });
});
