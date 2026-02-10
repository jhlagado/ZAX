import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR112: add A forms', () => {
  it('encodes add A,r / add A,n / add A,(hl) / add A,(ix/iy+disp)', async () => {
    const entry = join(__dirname, 'fixtures', 'pr112_isa_add_a_forms.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(
      Uint8Array.of(
        0x80, // add a,b
        0xc6,
        0x01, // add a,1
        0x86, // add a,(hl)
        0xdd,
        0x86,
        0x02, // add a,(ix+2)
        0xfd,
        0x86,
        0xfd, // add a,(iy-3)
        0xc9, // ret
      ),
    );
  });
});
