import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('#509 lowerLdWithEa integration', () => {
  it('still lowers representative byte and word ld shapes through the moved helper', async () => {
    const byteEntry = join(__dirname, 'fixtures', 'pr405_byte_global_non_a_symbols.zax');
    const byteRes = await compile(byteEntry, {}, { formats: defaultFormatWriters });
    const byteAsm = byteRes.artifacts.find((artifact: unknown): artifact is AsmArtifact =>
      typeof artifact === 'object' &&
      artifact !== null &&
      'kind' in artifact &&
      (artifact as AsmArtifact).kind === 'asm',
    );
    expect(byteRes.diagnostics).toEqual([]);
    expect(byteAsm).toBeDefined();
    expect(byteAsm!.text).toContain('push AF');
    expect(byteAsm!.text).toContain('ld HL, glob_b');
    expect(byteAsm!.text).toContain('ld B, (hl)');

    const wordEntry = join(__dirname, 'fixtures', 'pr406_word_mem_to_mem_mixed_reverse.zax');
    const wordRes = await compile(wordEntry, {}, { formats: defaultFormatWriters });
    const wordAsm = wordRes.artifacts.find((artifact: unknown): artifact is AsmArtifact =>
      typeof artifact === 'object' &&
      artifact !== null &&
      'kind' in artifact &&
      (artifact as AsmArtifact).kind === 'asm',
    );
    expect(wordRes.diagnostics).toEqual([]);
    expect(wordAsm).toBeDefined();
    expect(wordAsm!.text).toContain('ld E, (HL)');
    expect(wordAsm!.text).toContain('ld HL, dst_w');
    expect(wordAsm!.text).toContain('ld (HL), E');
  });
});
