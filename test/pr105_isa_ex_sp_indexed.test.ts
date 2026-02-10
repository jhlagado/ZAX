import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR105: ISA ex (sp),ix/iy', () => {
  it('encodes ex (sp),ix and ex (sp),iy', async () => {
    const entry = join(__dirname, 'fixtures', 'pr105_isa_ex_sp_indexed.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    // ex (sp),ix; ex iy,(sp); ret
    expect(bin!.bytes).toEqual(Uint8Array.of(0xdd, 0xe3, 0xfd, 0xe3, 0xc9));
  });
});
