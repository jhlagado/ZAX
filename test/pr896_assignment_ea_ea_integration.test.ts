import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { Asm80Artifact } from '../src/formats/types.js';

describe('PR896 := scalar path-to-path lowering', () => {
  it('lowers byte, word, and @path storage transfers end-to-end', async () => {
    const entry = join(__dirname, 'fixtures', 'pr896_assignment_ea_ea.zax');
    const res = await compile(
      entry,
      { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is Asm80Artifact => a.kind === 'asm80');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('PUSH AF');
    expect(text).toContain('POP AF');
    expect(text).toContain('PUSH DE');
    expect(text).toContain('POP DE');
    expect(text).toContain('PUSH HL');
    expect(text).toContain('POP HL');
    expect(text).toContain('LD A, (HL)');
    expect(text).toContain('LD (HL), A');
    expect(text).toContain('LD DE, (SRC_WORD)');
    expect(text).toContain('LD (DST_WORD), DE');
  });

  it('avoids preserving HL for direct scalar fast paths', async () => {
    const entry = join(__dirname, 'fixtures', 'pr896_assignment_ea_ea_direct_fastpath.zax');
    const res = await compile(
      entry,
      { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is Asm80Artifact => a.kind === 'asm80');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text.match(/PUSH HL/g) ?? []).toHaveLength(1);
    expect(text.match(/POP HL/g) ?? []).toHaveLength(1);
    expect(text).toContain('LD DE, (SRC_WORD)');
    expect(text).toContain('LD (DST_WORD), DE');
  });

  it('promotes the hidden word transfer pair when either path needs DE', async () => {
    const entry = join(__dirname, 'fixtures', 'pr896_assignment_ea_ea_conflict.zax');
    const res = await compile(
      entry,
      { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is Asm80Artifact => a.kind === 'asm80');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('PUSH BC');
    expect(text).toContain('POP BC');
    expect(text).toContain('LD BC, (SRC_WORD)');
    expect(text).toContain('LD (DST_WORD), BC');
  });
});
