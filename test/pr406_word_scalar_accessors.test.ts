import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR406: word scalar accessors', () => {
  it('uses direct global word accessors for BC/DE', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_global_scalar_accessors.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD BC, (GLOB_W)');
    expect(text).toContain('LD DE, (GLOB_W)');
    expect(text).toContain('LD (GLOB_W), BC');
    expect(text).toContain('LD (GLOB_W), DE');
  });

  it('uses direct frame word accessors for BC/DE', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_frame_scalar_accessors.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD C, (IX - $0002)');
    expect(text).toContain('LD B, (IX - $0001)');
    expect(text).toContain('LD E, (IX - $0002)');
    expect(text).toContain('LD D, (IX - $0001)');
    expect(text).toContain('LD (IX - $0002), C');
    expect(text).toContain('LD (IX - $0001), B');
    expect(text).toContain('LD (IX - $0002), E');
    expect(text).toContain('LD (IX - $0001), D');
  });

  it('uses scalar word accessors for typed call arguments', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_call_scalar_arg.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD HL, (GLOB_W)');
    expect(text).toContain('PUSH HL');
    expect(text).toContain('LD L, (IX - $0002)');
    expect(text).toContain('LD H, (IX - $0001)');
    expect(text).not.toContain('EX DE, HL');
  });

  it('uses scalar word accessors for scalar mem-to-mem moves', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_mem_to_mem_scalar.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('LD DE, (GLOB_SRC)');
    expect(text).toContain('LD (GLOB_DST), DE');
    expect(text).toContain('LD (IX - $0002), E');
    expect(text).toContain('LD (IX - $0001), D');
    expect(text).toContain('LD E, (IX - $0002)');
    expect(text).toContain('LD D, (IX - $0001)');
    expect(text).not.toContain('LD A, (HL)');
  });
});
