import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const compileAsm = async (entry: string): Promise<string> => {
  const res = await compile(
    entry,
    { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
    { formats: defaultFormatWriters },
  );
  expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
  expect(asm).toBeDefined();
  return asm!.text;
};

describe('PR468 typed-step integration coverage', () => {
  it('locks the current word mixed-path load/store sequence emitted through typed steps', async () => {
    const text = await compileAsm(
      join(__dirname, 'fixtures', 'pr406_word_mem_to_mem_mixed_reverse.zax'),
    );

    expect(text).toContain('ld E, (HL)');
    expect(text).toContain('inc HL');
    expect(text).toContain('ld D, (HL)');
    expect(text).toContain('ld (dst_w), DE');
    expect(text).not.toContain('ld A, (HL)');
  });

  it('locks the current indexed byte template path emitted through typed steps', async () => {
    const text = await compileAsm(join(__dirname, 'fixtures', 'pr405_byte_indexed_templates.zax'));

    expect(text).toContain('push DE');
    expect(text).toContain('push HL');
    expect(text).toContain('ld de, arr_b');
    expect(text).toContain('add HL, DE');
    expect(text).toContain('ld A, (HL)');
    expect(text).toContain('ld (HL), D');
  });
});
