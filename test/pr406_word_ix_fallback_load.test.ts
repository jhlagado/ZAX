import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR406: IX fallback word load', () => {
  it('loads IX through the shared HL-address word accessor path', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_ix_fallback_load.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD HL, (IDX_WORD)');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD D, (HL)');
    expect(text).toContain('LD L, E');
    expect(text).toContain('LD H, D');
    expect(text).toContain('PUSH HL');
    expect(text).toContain('POP IX');
    expect(text).not.toContain('LD A, (HL)');
  });
});
