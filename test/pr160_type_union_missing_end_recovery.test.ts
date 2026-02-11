import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR160 parser: type/union missing-end recovery', () => {
  it('stops block parsing at next top-level declaration and emits focused diagnostics', async () => {
    const entry = join(__dirname, 'fixtures', 'pr160_type_union_missing_end_recovery.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Unterminated type "Point": expected "end" before "func"');
    expect(messages).toContain('Unterminated union "Pair": expected "end" before "const"');
    expect(messages).not.toContain('Invalid record field declaration');
    expect(messages).not.toContain('Invalid union field declaration');
    expect(messages.some((m) => m.startsWith('Unsupported top-level construct:'))).toBe(false);
  });
});
