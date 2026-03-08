import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR406: word scalar accessors', () => {
  it('routes global word loads and stores through addr-style HL materialization for BC/DE', async () => {
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

    expect((text.match(/\bPUSH AF\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(text).toContain('LD HL, GLOB_W');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD D, (HL)');
    expect(text).toContain('LD C, E');
    expect(text).toContain('LD B, D');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
  });

  it('routes frame word loads and stores through addr-style HL materialization for BC/DE', async () => {
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

    expect((text.match(/\bPUSH AF\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(text).toContain('PUSH IX');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD D, (HL)');
    expect(text).toContain('LD C, E');
    expect(text).toContain('LD B, D');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
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
    expect(text).toContain('EX DE, HL');
    expect(text).toContain('LD E, (IX - $0002)');
    expect(text).toContain('LD D, (IX - $0001)');
  });

  it('routes scalar mem-to-mem moves through addr-style HL materialization', async () => {
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

    expect((text.match(/\bPUSH DE\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(text).toContain('LD HL, GLOB_SRC');
    expect(text).toContain('LD HL, GLOB_DST');
    expect(text).toContain('LD E, (HL)');
    expect(text).toContain('LD D, (HL)');
    expect(text).toContain('LD (HL), E');
    expect(text).toContain('LD (HL), D');
  });
});
