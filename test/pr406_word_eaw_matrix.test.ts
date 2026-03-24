import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';
import {
  compilePlacedProgram,
  flattenLoweredInstructions,
  isMemIxDisp,
  isMemName,
  isReg,
} from './helpers/lowered_program.js';

const compileLowered = async (entry: string) => {
  const res = await compilePlacedProgram(entry);
  expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return flattenLoweredInstructions(res.program);
};

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
    const instrs = await compileLowered(
      join(__dirname, '..', 'test', 'language-tour', '66_word_glob_fvar.zax'),
    );
    const text = await compileAsm(
      join(__dirname, '..', 'test', 'language-tour', '66_word_glob_fvar.zax'),
    );

    expect(text).toContain('LD DE, GLOB_WORDS');
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'E') && isMemIxDisp(ins.operands[1], 4),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'D') && isMemIxDisp(ins.operands[1], 5),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'add' && isReg(ins.operands[0], 'HL') && isReg(ins.operands[1], 'HL'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'add' && isReg(ins.operands[0], 'HL') && isReg(ins.operands[1], 'DE'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'A') && isMemName(ins.operands[1], 'HL'),
      ),
    ).toBe(false);
  });

  it('uses EAW_FVAR_FVAR for frame base + frame word index', async () => {
    const instrs = await compileLowered(
      join(__dirname, '..', 'test', 'language-tour', '67_word_fvar_fvar.zax'),
    );

    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'E') && isMemIxDisp(ins.operands[1], 4),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'D') && isMemIxDisp(ins.operands[1], 5),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ex' && isReg(ins.operands[0], 'DE') && isReg(ins.operands[1], 'HL'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'E') && isMemIxDisp(ins.operands[1], 6),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'D') && isMemIxDisp(ins.operands[1], 7),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'add' && isReg(ins.operands[0], 'HL') && isReg(ins.operands[1], 'HL'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isMemName(ins.operands[0], 'HL') && isReg(ins.operands[1], 'E'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isMemName(ins.operands[0], 'HL') && isReg(ins.operands[1], 'D'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'A') && isMemName(ins.operands[1], 'HL'),
      ),
    ).toBe(false);
  });

  it('uses EAW_FVAR_GLOB for frame base + global word index', async () => {
    const instrs = await compileLowered(
      join(__dirname, '..', 'test', 'language-tour', '68_word_fvar_glob.zax'),
    );
    const text = await compileAsm(
      join(__dirname, '..', 'test', 'language-tour', '68_word_fvar_glob.zax'),
    );

    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'E') && isMemIxDisp(ins.operands[1], 4),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'D') && isMemIxDisp(ins.operands[1], 5),
      ),
    ).toBe(true);
    expect(text).toContain('LD HL, (GLOB_IDX_WORD)');
    expect(
      instrs.some(
        (ins) => ins.head === 'add' && isReg(ins.operands[0], 'HL') && isReg(ins.operands[1], 'HL'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'add' && isReg(ins.operands[0], 'HL') && isReg(ins.operands[1], 'DE'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'A') && isMemName(ins.operands[1], 'HL'),
      ),
    ).toBe(false);
  });

  it('uses EAW_GLOB_GLOB for global base + global word index', async () => {
    const instrs = await compileLowered(
      join(__dirname, '..', 'test', 'language-tour', '69_word_glob_glob.zax'),
    );
    const text = await compileAsm(
      join(__dirname, '..', 'test', 'language-tour', '69_word_glob_glob.zax'),
    );

    expect(text).toContain('LD DE, GLOB_WORDS');
    expect(text).toContain('LD HL, (GLOB_IDX_WORD)');
    expect(
      instrs.some(
        (ins) => ins.head === 'add' && isReg(ins.operands[0], 'HL') && isReg(ins.operands[1], 'HL'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'add' && isReg(ins.operands[0], 'HL') && isReg(ins.operands[1], 'DE'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isMemName(ins.operands[0], 'HL') && isReg(ins.operands[1], 'E'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isMemName(ins.operands[0], 'HL') && isReg(ins.operands[1], 'D'),
      ),
    ).toBe(true);
    expect(
      instrs.some(
        (ins) => ins.head === 'ld' && isReg(ins.operands[0], 'A') && isMemName(ins.operands[1], 'HL'),
      ),
    ).toBe(false);
  });
});
