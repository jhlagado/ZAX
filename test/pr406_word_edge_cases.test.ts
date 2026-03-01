import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR406: word edge cases', () => {
  it('rejects non-scalar storage names in word index position', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_invalid_nonscalar_index_name.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('does not partially emit the scalar word fast path when only the source is scalar-fast-path eligible', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_mem_to_mem_partial_fast_path.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD DE, (SRC_W)');
    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('LD DE, ARR_W');
    expect(text).not.toContain('LD HL, SRC_W');
  });

  it('uses the indexed load template plus scalar store when only the destination is scalar-fast-path eligible', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_mem_to_mem_mixed_reverse.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('PUSH HL');
    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('LD DE, ARR_W');
    expect(text).toContain('POP HL');
    expect(text).toContain('LD (DST_W), DE');
    expect(text).not.toContain('LD HL, DST_W');
  });
});
