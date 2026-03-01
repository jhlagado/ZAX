import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR405: byte global non-A scalar symbols', () => {
  it('uses scalar fast paths for non-A global byte accesses', async () => {
    const entry = join(__dirname, 'fixtures', 'pr405_byte_global_non_a_symbols.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect((text.match(/\bPUSH AF\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect((text.match(/\bPOP AF\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(text).toContain('LD A, (GLOB_B)');
    expect(text).toContain('LD B, A');
    expect(text).toContain('LD H, A');
    expect(text).toContain('LD A, B');
    expect(text).toContain('LD (GLOB_B), A');
    expect(text).toContain('LD A, H');
    expect(text).not.toContain('ADD HL, DE');
    expect(text).not.toContain('LD HL, (GLOB_B)');
    expect(text).not.toContain('LD (GLOB_B), HL');
  });
});
