import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR412 runtime array indexing (word)', () => {
  it('scales word index and uses EAW path', async () => {
    const entry = join(__dirname, 'fixtures', 'pr412_runtime_index_word.zax');
    const res = await compile(
      entry,
      { emitBin: false, emitHex: false, emitD8m: false, emitListing: false, emitAsm: true },
      { formats: defaultFormatWriters },
    );

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text;

    // Expect index scaling and base+offset addition:
    expect(text).toMatch(/add hl, hl/i); // scale idx
    expect(text).toMatch(/ld de, arr_w/i); // base load
    expect(text).toMatch(/add hl, de/i); // combine base + scaled idx
    // Word load via HL address (A/H shuffle acceptable for now)
    expect(text).toMatch(/ld a, \(hl\)[\s\S]*ld h, \(hl\)/i);
  });
});
