import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ISA: indexed rotates/shifts (IX/IY + disp8)', () => {
  it('encodes CB rotates/shifts on (ix/iy+disp)', async () => {
    const entry = join(__dirname, 'fixtures', 'isa_indexed_rotates.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    // rl (ix+1); rr (iy-1); rlc (ix+0); rrc (iy+2); sla (ix-2); sra (iy+0); srl (ix+127); implicit ret
    expect(bin!.bytes).toEqual(
      Uint8Array.of(
        0xdd,
        0xcb,
        0x01,
        0x16,
        0xfd,
        0xcb,
        0xff,
        0x1e,
        0xdd,
        0xcb,
        0x00,
        0x06,
        0xfd,
        0xcb,
        0x02,
        0x0e,
        0xdd,
        0xcb,
        0xfe,
        0x26,
        0xfd,
        0xcb,
        0x00,
        0x2e,
        0xdd,
        0xcb,
        0x7f,
        0x3e,
        0xc9,
      ),
    );
  });
});
