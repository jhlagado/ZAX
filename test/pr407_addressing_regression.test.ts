import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR407 addressing model regressions (word load/store)', () => {
  it('uses scaled EAW for word load and template store to global', async () => {
    const entry = join(__dirname, 'fixtures', 'pr407_word_load_store.zax');
    const res = await compile(
      entry,
      { emitBin: false, emitHex: false, emitD8m: false, emitListing: false, emitAsm: true },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text;

    // Runtime word index should scale by 2 and add base.
    expect(text).toMatch(/add hl, hl/i);
    expect(text).toMatch(/ld de, arr_w/i);
    expect(text).toMatch(/add hl, de/i);

    // Store to tmp should go through the word store path.
    expect(text).toMatch(/ld \(tmp\), hl/i);
  });
});
