import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR405: byte indexed templates', () => {
  it('uses the documented byte templates for runtime-indexed global byte access', async () => {
    const entry = join(__dirname, 'fixtures', 'pr405_byte_indexed_templates.zax');
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
    expect(text).toContain('LD DE, ARR_B');
    expect(text).toContain('LD H, $0000');
    expect(text).toContain('LD L, C');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD A, (HL)');
    expect(text).toContain('POP HL');
    expect(text).toContain('POP DE');

    expect(text).toContain('LD H, $0022');
    expect(text).toContain('POP DE');
    expect(text).toContain('LD (HL), D');
  });
});
