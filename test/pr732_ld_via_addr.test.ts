import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('#732 typed ea ld routing via addr', () => {
  it('routes transitional typed ea ld forms through addr-style HL materialization', async () => {
    const entry = join(__dirname, 'fixtures', 'pr732_ld_via_addr.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((artifact): artifact is AsmArtifact => artifact.kind === 'asm');
    expect(asm).toBeDefined();

    const text = asm!.text.toUpperCase();
    expect(text).toContain('PUSH AF');
    expect(text).toContain('PUSH BC');
    expect(text).toContain('PUSH DE');
    expect(text).toContain('LD A, (HL)');
    expect(text).toContain('LD (HL), A');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD D, (HL)');
    expect(text).toContain('POP DE');
    expect(text).toContain('POP BC');
    expect(text).toContain('POP AF');
  });
});
