import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { Asm80Artifact } from '../src/formats/types.js';

describe('PR863 := byte storage widening integration', () => {
  it('widens byte storage into register pairs under :=', async () => {
    const entry = join(__dirname, 'fixtures', 'pr863_assignment_byte_widening.zax');
    const res = await compile(
      entry,
      { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is Asm80Artifact => a.kind === 'asm80');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD H, $0000');
    expect(text).toContain('LD L, A');
    expect(text).toContain('LD D, $0000');
    expect(text).toContain('LD E, A');
    expect(text).not.toContain('WORD REGISTER LOAD REQUIRES A WORD-TYPED SOURCE');
  });
});
