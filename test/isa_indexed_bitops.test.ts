import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ISA: indexed bit ops (IX/IY + disp8)', () => {
  it('encodes bit/res/set on (ix/iy+disp)', async () => {
    const entry = join(__dirname, 'fixtures', 'isa_indexed_bitops.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    // bit 3,(ix+5); res 2,(iy-1); set 7,(ix+0); implicit ret
    expect(bin!.bytes).toEqual(
      Uint8Array.of(0xdd, 0xcb, 0x05, 0x5e, 0xfd, 0xcb, 0xff, 0x96, 0xdd, 0xcb, 0x00, 0xfe, 0xc9),
    );
  });
});
