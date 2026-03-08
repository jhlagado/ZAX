import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('#731 addr lowering integration', () => {
  it('lowers addr hl, ea_expr with HL result and preserved AF/BC/DE', async () => {
    const entry = join(__dirname, 'fixtures', 'pr731_addr_preservation.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((artifact): artifact is AsmArtifact => artifact.kind === 'asm');
    expect(asm).toBeDefined();

    expect(asm!.text).toContain('push AF');
    expect(asm!.text).toContain('push BC');
    expect(asm!.text).toContain('push DE');
    expect(asm!.text).toContain('ld DE, words');
    expect(asm!.text).toContain('ld H, $0000');
    expect(asm!.text).toContain('ld L, C');
    expect(asm!.text).toContain('add HL, HL');
    expect(asm!.text).toContain('add HL, DE');
    expect(asm!.text).toContain('pop DE');
    expect(asm!.text).toContain('pop BC');
    expect(asm!.text).toContain('pop AF');
  });
});
