import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR406 word templates (runtime index → BC)', () => {
  it('uses EAW + LW-BC template for reg16 index HL', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_index_bc.zax');
    const res = await compile(
      entry,
      { emitBin: false, emitHex: false, emitD8m: false, emitListing: false, emitAsm: true },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text;

    expect(text).toMatch(/add hl, hl/i); // scale index
    expect(text).toMatch(/ld de, arr_w/i); // base load
    expect(text).toMatch(/add hl, de/i); // combine base + offset
    expect(text).toMatch(/ld e, \(hl\)/i); // word load lo
    expect(text).toMatch(/ld d, \(hl\)/i); // word load hi
    expect(text).toMatch(/ld c, l/i);
    expect(text).toMatch(/ld b, h/i);
  });
});
