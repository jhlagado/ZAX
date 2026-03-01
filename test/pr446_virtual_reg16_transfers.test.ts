import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR446: virtual 16-bit transfer patterns', () => {
  it('lowers BC/DE/HL pair transfers with direct byte moves only', async () => {
    const entry = join(__dirname, 'fixtures', 'pr446_virtual_reg16_transfers.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();

    const text = asm!.text.toUpperCase();
    expect(text).toContain('LD B, D');
    expect(text).toContain('LD C, E');
    expect(text).toContain('LD D, B');
    expect(text).toContain('LD E, C');
    expect(text).toContain('LD B, H');
    expect(text).toContain('LD C, L');
    expect(text).toContain('LD H, B');
    expect(text).toContain('LD L, C');
    expect(text).toContain('LD D, H');
    expect(text).toContain('LD E, L');
    expect(text).toContain('LD H, D');
    expect(text).toContain('LD L, E');
    expect(text).not.toContain('PUSH ');
    expect(text).not.toContain('POP ');
    expect(text).not.toContain('EX DE, HL');
  });
});
