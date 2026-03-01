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
  return asm!.text.toUpperCase();
};

describe('PR406: indexed word EAW matrix coverage', () => {
  it('uses EAW_GLOB_FVAR for global base + frame word index', async () => {
    const text = await compileAsm(
      join(__dirname, '..', 'examples', 'language-tour', '66_word_glob_fvar.zax'),
    );

    expect(text).toContain('LD DE, GLOB_WORDS');
    expect(text).toContain('LD E, (IX + $0004)');
    expect(text).toContain('LD D, (IX + $0005)');
    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('ADD HL, DE');
    expect(text).not.toContain('LD A, (HL)');
  });

  it('uses EAW_FVAR_FVAR for frame base + frame word index', async () => {
    const text = await compileAsm(
      join(__dirname, '..', 'examples', 'language-tour', '67_word_fvar_fvar.zax'),
    );

    expect(text).toContain('LD E, (IX + $0004)');
    expect(text).toContain('LD D, (IX + $0005)');
    expect(text).toContain('EX DE, HL');
    expect(text).toContain('LD E, (IX + $0006)');
    expect(text).toContain('LD D, (IX + $0007)');
    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
    expect(text).not.toContain('LD A, (HL)');
  });

  it('uses EAW_FVAR_GLOB for frame base + global word index', async () => {
    const text = await compileAsm(
      join(__dirname, '..', 'examples', 'language-tour', '68_word_fvar_glob.zax'),
    );

    expect(text).toContain('LD E, (IX + $0004)');
    expect(text).toContain('LD D, (IX + $0005)');
    expect(text).toContain('LD HL, (GLOB_IDX_WORD)');
    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('ADD HL, DE');
    expect(text).not.toContain('LD A, (HL)');
  });

  it('uses EAW_GLOB_GLOB for global base + global word index', async () => {
    const text = await compileAsm(
      join(__dirname, '..', 'examples', 'language-tour', '69_word_glob_glob.zax'),
    );

    expect(text).toContain('LD DE, GLOB_WORDS');
    expect(text).toContain('LD HL, (GLOB_IDX_WORD)');
    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
    expect(text).not.toContain('LD A, (HL)');
  });
});
