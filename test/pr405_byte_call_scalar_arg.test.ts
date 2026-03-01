import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR405: byte call scalar arg', () => {
  it('pushes a bare global byte argument through the scalar byte path', async () => {
    const entry = join(__dirname, 'fixtures', 'pr405_byte_call_scalar_arg.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD A, (GLOB_B)');
    expect(text).toContain('LD H, $0000');
    expect(text).toContain('LD L, A');
    expect(text).toContain('PUSH HL');
    expect(text).toContain('CALL SINK');
    expect(text).not.toContain('ADD HL, DE');
  });
});
