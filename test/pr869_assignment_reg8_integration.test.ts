import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { Asm80Artifact } from '../src/formats/types.js';

describe('PR869 := reg8 integration', () => {
  it('lowers accepted reg8 storage transfer forms end-to-end', async () => {
    const entry = join(__dirname, 'fixtures', 'pr869_assignment_reg8.zax');
    const res = await compile(
      entry,
      { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is Asm80Artifact => a.kind === 'asm80');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD A, (COUNT)');
    expect(text).toContain('LD B, A');
    expect(text).toContain('LD A, (IDX)');
    expect(text).toContain('LD L, A');
    expect(text).toContain('LD H, $0000');
    expect(text).toContain('LD HL, ARR');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD B, (HL)');
    expect(text).toContain('LD A, B');
    expect(text).toContain('LD (FLAGS), A');
  });
});
