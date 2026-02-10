import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR112: indexed ALU-A family', () => {
  it('encodes add/adc/sub/sbc/and/xor/or/cp against (ix/iy+disp)', async () => {
    const entry = join(__dirname, 'fixtures', 'pr112_isa_indexed_alu_a.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(
      Uint8Array.of(
        0xdd,
        0x86,
        0x01, // add a,(ix+1)
        0xfd,
        0x8e,
        0xfe, // adc a,(iy-2)
        0xdd,
        0x96,
        0x00, // sub (ix+0)
        0xfd,
        0x9e,
        0x05, // sbc a,(iy+5)
        0xdd,
        0xa6,
        0xff, // and (ix-1)
        0xfd,
        0xae,
        0x02, // xor (iy+2)
        0xdd,
        0xb6,
        0x7f, // or (ix+127)
        0xfd,
        0xbe,
        0x80, // cp (iy-128)
        0xc9, // ret
      ),
    );
  });
});
