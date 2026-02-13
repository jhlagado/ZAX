import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact, D8mArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR215: const/data follow-up closure matrix', () => {
  it('keeps enum + const + data semantics and D8M constant value/address contract stable', async () => {
    const entry = join(__dirname, 'fixtures', 'pr215_const_data_followups_valid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    const d8m = res.artifacts.find((a): a is D8mArtifact => a.kind === 'd8m');
    expect(bin).toBeDefined();
    expect(d8m).toBeDefined();
    expect(bin!.bytes.slice(0, 3)).toEqual(Uint8Array.of(0x3e, 0x02, 0xc9));

    const symbols = d8m!.json['symbols'] as Array<{
      name: string;
      kind: string;
      value?: number;
      address?: number;
    }>;
    const byName = new Map(symbols.map((s) => [s.name, s]));

    expect(byName.get('Mode.Read')).toMatchObject({ kind: 'constant', value: 0 });
    expect(byName.get('Mode.Write')).toMatchObject({ kind: 'constant', value: 1 });
    expect(byName.get('Mode.Append')).toMatchObject({ kind: 'constant', value: 2 });
    expect(byName.get('Next')).toMatchObject({ kind: 'constant', value: 2, address: 2 });
    expect(byName.get('Big')).toMatchObject({
      kind: 'constant',
      value: 70000,
      address: 70000 & 0xffff,
    });
  });

  it('keeps const/data negative diagnostic surfaces stable', async () => {
    const followups = await compile(
      join(__dirname, 'fixtures', 'pr215_const_data_followups_invalid.zax'),
      {},
      { formats: defaultFormatWriters },
    );
    const undefinedName = await compile(
      join(__dirname, 'fixtures', 'pr4_undefined_name.zax'),
      {},
      {
        formats: defaultFormatWriters,
      },
    );
    const forwardRef = await compile(
      join(__dirname, 'fixtures', 'pr4_forward_ref.zax'),
      {},
      {
        formats: defaultFormatWriters,
      },
    );
    const lengthMismatch = await compile(
      join(__dirname, 'fixtures', 'pr4_data_length_mismatch.zax'),
      {},
      { formats: defaultFormatWriters },
    );
    const unsupportedType = await compile(
      join(__dirname, 'fixtures', 'pr4_data_unsupported_type.zax'),
      {},
      { formats: defaultFormatWriters },
    );

    expect(followups.artifacts).toEqual([]);
    expect(followups.diagnostics.map((d) => d.message)).toEqual([
      'Failed to evaluate const "A".',
      'Failed to evaluate const "B".',
    ]);

    expect(undefinedName.diagnostics.map((d) => d.message)).toEqual([
      'Failed to evaluate const "X".',
    ]);
    expect(forwardRef.diagnostics.map((d) => d.message)).toEqual(['Failed to evaluate const "B".']);
    expect(lengthMismatch.diagnostics.map((d) => d.message)).toEqual([
      'String length mismatch for "msg".',
    ]);
    expect(unsupportedType.diagnostics.map((d) => d.message)).toEqual([
      'Unsupported data type for "p" (expected byte/word/addr/ptr or fixed-length arrays of those).',
    ]);
  });
});
