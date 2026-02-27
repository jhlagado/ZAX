import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const asmText = async (fixture: string): Promise<string> => {
  const res = await compile(
    join(__dirname, 'fixtures', fixture),
    { emitBin: false, emitHex: false, emitD8m: false, emitListing: false, emitAsm: true },
    { formats: defaultFormatWriters },
  );
  expect(res.diagnostics).toEqual([]);
  const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
  expect(asm).toBeDefined();
  return asm!.text;
};

describe('PR407 word addressing regressions', () => {
  it('uses EAW + word templates for reg8 and HL indexes', async () => {
    const text = await asmText('pr407_word_regression.zax');

    // reg8 index path
    expect(text).toMatch(/ld de, gw/i);
    expect(text).toMatch(/ld h, \$0+/i); // zero-extend idx8
    expect(text).toMatch(/ld l, e/i); // idx8 lowered via E
    expect(text).toMatch(/add hl, hl/i);
    expect(text).toMatch(/add hl, de/i);
    expect(text).toMatch(/ld e, \(hl\)/i);
    expect(text).toMatch(/ld d, \(hl\)/i);
    expect(text).toMatch(/ld \(hl\), e/i);
    expect(text).toMatch(/ld \(hl\), d/i);

    // reg16 HL index
    expect(text).toMatch(/add hl, hl/i);
    expect(text).toMatch(/ld de, gw/i);
    expect(text).toMatch(/add hl, de/i);
    expect(text).toMatch(/ld e, \(hl\)/i);
    expect(text).toMatch(/ld d, \(hl\)/i);
    expect(text).toMatch(/ld \(hl\), e/i);
    expect(text).toMatch(/ld \(hl\), d/i);
  });
});
