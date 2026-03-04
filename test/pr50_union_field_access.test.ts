import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR50: union declarations + union field EA access', () => {
  it('currently rejects union-typed named-data declarations', async () => {
    const entry = join(__dirname, 'fixtures', 'pr50_union_field_access.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0]?.message).toContain(
      'Unsupported data type for "v" (expected byte/word/addr/ptr or fixed-length arrays of those).',
    );
  });
});
