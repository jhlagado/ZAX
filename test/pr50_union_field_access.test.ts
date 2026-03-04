import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR50: union declarations + union field EA access', () => {
  it('allows union field access via .field EA path segments', async () => {
    const entry = join(__dirname, 'fixtures', 'pr50_union_field_access.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect([...bin!.bytes]).toContain(0x3a); // ld a,(nn)
    expect([...bin!.bytes]).toContain(0x2a); // ld hl,(nn)
    expect(bin!.bytes[bin!.bytes.length - 1]).toBe(0xc9);
  });
});
