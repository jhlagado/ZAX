import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ISA: indexed addressing (IX/IY + disp8)', () => {
  it('encodes ld r,(ix/iy+disp) and ld (ix/iy+disp),r', async () => {
    const entry = join(__dirname, 'fixtures', 'isa_indexed_ld.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    // ld a,(ix+5); ld (ix+5),a; ld c,(iy-2); ld (iy-2),b; implicit ret
    expect(bin!.bytes).toEqual(
      Uint8Array.of(0xdd, 0x7e, 0x05, 0xdd, 0x77, 0x05, 0xfd, 0x4e, 0xfe, 0xfd, 0x70, 0xfe, 0xc9),
    );
  });
});
