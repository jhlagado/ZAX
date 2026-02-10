import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR121 ISA: 16-bit core ALU/stack/exchange', () => {
  it('encodes add hl,rr, inc/dec rr, push/pop rr, and exx', async () => {
    const entry = join(__dirname, 'fixtures', 'pr121_isa_16bit_core.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(
      Uint8Array.of(
        0x09, // add hl,bc
        0x19, // add hl,de
        0x29, // add hl,hl
        0x39, // add hl,sp
        0x03, // inc bc
        0x13, // inc de
        0x23, // inc hl
        0x33, // inc sp
        0x0b, // dec bc
        0x1b, // dec de
        0x2b, // dec hl
        0x3b, // dec sp
        0xc5, // push bc
        0xd5, // push de
        0xe5, // push hl
        0xf5, // push af
        0xf1, // pop af
        0xe1, // pop hl
        0xd1, // pop de
        0xc1, // pop bc
        0xd9, // exx
        0xc9, // ret (implicit epilogue)
      ),
    );
  });
});
