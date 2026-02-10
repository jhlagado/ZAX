import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR141: abs16 symbolic addend ld matrix', () => {
  it('encodes ld abs16 forms with symbolic addends', async () => {
    const entry = join(__dirname, 'fixtures', 'pr141_abs16_symbolic_addend_ld_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(
      Uint8Array.of(
        0x3a,
        0x1d,
        0x00,
        0x32,
        0x1e,
        0x00,
        0x2a,
        0x1f,
        0x00,
        0x22,
        0x20,
        0x00,
        0xed,
        0x5b,
        0x21,
        0x00,
        0xed,
        0x53,
        0x22,
        0x00,
        0xdd,
        0x2a,
        0x23,
        0x00,
        0xdd,
        0x22,
        0x24,
        0x00,
        0x00,
        0xc9,
      ),
    );
  });
});
