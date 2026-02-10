import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR111: IX/IY immediate label fixups', () => {
  it('resolves forward label for ld ix/iy, label', async () => {
    const entry = join(__dirname, 'fixtures', 'pr111_isa_ixiy_label_fixup.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    // ld ix,target; ld iy,target; target: ret
    expect(bin!.bytes).toEqual(Uint8Array.of(0xdd, 0x21, 0x08, 0x00, 0xfd, 0x21, 0x08, 0x00, 0xc9));
  });
});
