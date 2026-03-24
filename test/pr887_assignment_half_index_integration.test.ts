import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { Asm80Artifact } from '../src/formats/types.js';

describe('PR887 := half-index integration', () => {
  it('lowers accepted half-index assignment forms end-to-end', async () => {
    const entry = join(__dirname, 'fixtures', 'pr887_assignment_half_index.zax');
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
    expect(text).toContain('LD IXH, A');
    expect(text).toContain('LD HL, ARR');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD A, (HL)');
    expect(text).toContain('LD IXL, A');
    expect(text).toContain('LD A, IXH');
    expect(text).toContain('LD (FLAGS), A');
    expect(text).toContain('LD IYH, $00');
    expect(text).toContain('LD A, (FLAGS)');
    expect(text).toContain('LD IYL, A');
  });
});
