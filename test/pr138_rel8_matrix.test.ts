import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR138: rel8 branch matrix hardening', () => {
  it('encodes valid jr/jr cc/djnz label forms across forward/backward edges', async () => {
    const entry = join(__dirname, 'fixtures', 'pr138_rel8_valid_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(Uint8Array.of(0x18, 0x01, 0x00, 0x20, 0x01, 0x00, 0x10, 0xfb, 0xc9));
  });

  it('diagnoses out-of-range rel8 displacements for jr/jr cc/djnz', async () => {
    const entry = join(__dirname, 'fixtures', 'pr138_rel8_out_of_range_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('jr target out of range for rel8 branch (144, expected -128..127).');
    expect(messages).toContain(
      'jr nz target out of range for rel8 branch (142, expected -128..127).',
    );
    expect(messages).toContain(
      'djnz target out of range for rel8 branch (140, expected -128..127).',
    );
  });
});
