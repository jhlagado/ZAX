import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR57: ISA im/rst/reti/retn', () => {
  it('encodes im, rst, reti, and retn', async () => {
    const entry = join(__dirname, 'fixtures', 'pr57_isa_im_rst.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(
      // im 1, rst 0, rst 8, rst 56, reti, retn
      Uint8Array.of(0xed, 0x56, 0xc7, 0xcf, 0xff, 0xed, 0x4d, 0xed, 0x45),
    );
  });
});
