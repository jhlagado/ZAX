import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR875 := IX/IY integration', () => {
  it('lowers accepted IX/IY assignment forms end-to-end', async () => {
    const entry = join(__dirname, 'fixtures', 'pr875_assignment_ixiy.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD IX, (WORD_VAR)');
    expect(text).toContain('LD HL, WORD_VAR');
    expect(text).toContain('POP IY');
    expect(text).toContain('LD IX, (ARR_W + 2)');
    expect(text).toContain('LD IX, $0000');
  });
});
