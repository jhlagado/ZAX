import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR406 word mem→mem via runtime index', () => {
  it('uses EAW load and store paths', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_memmove.zax');
    const res = await compile(
      entry,
      { emitBin: false, emitHex: false, emitD8m: false, emitListing: false, emitAsm: true },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text;

    // Load path: scale idx, base src, load word (any register shuffle acceptable)
    expect(text).toMatch(/add hl, hl/i);
    expect(text).toMatch(/ld de, src/i);
    expect(text).toMatch(/add hl, de/i);
    expect(text).toMatch(/ld e, \\(hl\\)/i);
    expect(text).toMatch(/ld d, \\(hl\\)/i);

    // Store path: base dst, store lo/hi bytes
    expect(text).toMatch(/ld de, dst/i);
    expect(text).toMatch(/add hl, de/i);
    expect(text).toMatch(/ld \\(hl\\), e/i);
    expect(text).toMatch(/ld \\(hl\\), d/i);
  });
});
