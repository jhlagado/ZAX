import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR120 ISA: core load/stack/misc matrix', () => {
  it('encodes core r8 loads, mem forms, stack ops, and misc single-byte instructions', async () => {
    const entry = join(__dirname, 'fixtures', 'pr120_isa_core_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(
      Uint8Array.of(
        0x41, // ld b,c
        0x4a, // ld c,d
        0x53, // ld d,e
        0x5c, // ld e,h
        0x65, // ld h,l
        0x6f, // ld l,a
        0x78, // ld a,b
        0x46, // ld b,(hl)
        0x71, // ld (hl),c
        0x36,
        0x7f, // ld (hl),$7f
        0x0a, // ld a,(bc)
        0x12, // ld (de),a
        0x21,
        0x45,
        0x23, // ld hl,$2345
        0x3a,
        0x00,
        0x80, // ld a,($8000)
        0x32,
        0x03,
        0x80, // ld ($8003),a
        0x22,
        0x00,
        0x80, // ld ($8000),hl
        0x31,
        0x56,
        0x34, // ld sp,$3456
        0xf9, // ld sp,hl
        0xf5, // push af
        0xf1, // pop af
        0xeb, // ex de,hl
        0xe3, // ex (sp),hl
        0xf3, // di
        0xfb, // ei
        0x2f, // cpl
        0x37, // scf
        0x3f, // ccf
        0x00, // nop
        0x76, // halt
        0xc9, // ret (implicit epilogue)
      ),
    );
  });
});
