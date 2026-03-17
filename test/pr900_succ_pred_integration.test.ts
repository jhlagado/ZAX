import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('GitHub issue #900 succ/pred lowering', () => {
  it('lowers byte and word typed paths end-to-end', async () => {
    const entry = join(__dirname, 'fixtures', 'pr900_succ_pred.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('PUSH DE');
    expect(text).toContain('POP DE');
    expect(text).toContain('INC E');
    expect(text).toContain('DEC E');
    expect(text).toContain('INC DE');
    expect(text).toContain('DEC DE');
    expect(text).toContain('PUSH BC');
    expect(text).toContain('POP BC');
    expect(text).toContain('PUSH AF');
    expect(text.match(/POP AF/g) ?? []).toHaveLength(1);
    expect(text).toContain('LD A, D');
    expect(text).toContain('OR E');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
    expect(text).toContain('JR Z INDEXED_WORD_ZERO');
  });

  it('avoids HL preservation for direct word fast paths', async () => {
    const entry = join(__dirname, 'fixtures', 'pr900_succ_pred_direct_word.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD E, (IX');
    expect(text).toContain('LD D, (IX');
    expect(text).toContain('LD DE, (TOTAL)');
    expect(text.match(/PUSH HL/g) ?? []).toHaveLength(2);
    expect(text.match(/POP HL/g) ?? []).toHaveLength(1);
  });

  it('reuses one materialized EA for indexed word update', async () => {
    const entry = join(__dirname, 'fixtures', 'pr900_succ_pred.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toMatch(
      /LD E, \(HL\)[\s\S]*?INC HL[\s\S]*?LD D, \(HL\)[\s\S]*?DEC HL[\s\S]*?INC DE[\s\S]*?LD \(HL\), E[\s\S]*?INC HL[\s\S]*?LD \(HL\), D/i,
    );
  });
});
