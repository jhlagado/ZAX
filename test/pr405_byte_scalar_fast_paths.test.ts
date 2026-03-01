import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR405: byte scalar fast paths', () => {
  it('uses a DE shuttle for frame-byte H/L loads and stores without IX H/L lanes', async () => {
    const entry = join(__dirname, 'fixtures', 'pr405_byte_scalar_fast_paths.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).not.toMatch(/LD\s+H,\s+\(IX/i);
    expect(text).not.toMatch(/LD\s+L,\s+\(IX/i);
    expect(text).not.toMatch(/LD\s+\(IX[^\n]*,\s+H/i);
    expect(text).not.toMatch(/LD\s+\(IX[^\n]*,\s+L/i);

    expect((text.match(/\bEX DE, HL\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(text).toContain('LD E, (IX - $0002)');
    expect(text).not.toContain('LD H, E');
    expect(text).not.toContain('LD L, E');
    expect(text).not.toContain('LD E, H');
    expect(text).not.toContain('LD E, L');
    expect(text).toContain('LD (IX - $0002), E');
  });
});
