import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR406: HL fallback word store', () => {
  it('preserves the HL value while materializing a runtime-affine destination EA', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_hl_fallback_store.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('PUSH DE');
    expect(text).toContain('PUSH HL');
    expect(text).toContain('LD HL, (IDX_WORD)');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('POP HL');
    expect(text).toContain('POP DE');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
    expect(text).not.toContain('EX DE, HL');
  });
});
