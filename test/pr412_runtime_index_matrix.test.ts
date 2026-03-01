import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR412: runtime array indexing matrix', () => {
  it('supports runtime byte indexing via reg8 and reg16', async () => {
    const entry = join(__dirname, 'fixtures', 'pr412_runtime_index_byte_matrix.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD H, $0000');
    expect(text).toContain('LD L, A');
    expect(text).toContain('LD DE, ARR_B');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD B, (HL)');

    expect(text).toContain('LD HL, $0002');
    expect(text).toContain('LD C, (HL)');
  });

  it('keeps runtime word indexing via HL on the scaled EAW path', async () => {
    const entry = join(__dirname, 'fixtures', 'pr412_runtime_index_word.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('LD DE, ARR_W');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD D, (HL)');
    expect(text).not.toContain('LD A, (HL)');
  });
});
