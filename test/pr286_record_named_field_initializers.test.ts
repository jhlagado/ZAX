import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact, D8mArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR286 data record initializers: positional + named-field forms', () => {
  it('emits deterministic bytes for named-field and positional record aggregates', async () => {
    const entry = join(__dirname, 'fixtures', 'pr286_record_named_init_positive.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    const d8m = res.artifacts.find((a): a is D8mArtifact => a.kind === 'd8m');
    expect(bin).toBeDefined();
    expect(d8m).toBeDefined();

    expect(bin!.bytes).toEqual(Uint8Array.of(0xc9, 0x00, 0x34, 0x12, 0x56, 0x78));

    const symbols = d8m!.json['symbols'] as Array<{ name: string; kind: string; address?: number }>;
    const byName = new Map(symbols.map((s) => [s.name, s]));
    expect(byName.get('named')).toMatchObject({ kind: 'data', address: 2 });
    expect(byName.get('positional')).toMatchObject({ kind: 'data', address: 4 });
  });

  it('keeps stable diagnostics for unknown/duplicate/missing/shape errors', async () => {
    const entry = join(__dirname, 'fixtures', 'pr286_record_named_init_negative.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('Unknown record field "xx" in initializer for "bad_unknown".');
    expect(messages).toContain('Duplicate record field "lo" in initializer for "bad_duplicate".');
    expect(messages).toContain('Missing record field "hi" in initializer for "bad_missing".');
    expect(messages).toContain(
      'Named-field aggregate initializer requires a record type for "bad_shape".',
    );
  });

  it('rejects mixed positional + named aggregate entries in one initializer', async () => {
    const entry = join(__dirname, 'fixtures', 'pr286_record_named_init_mixed_negative.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain(
      'Mixed positional and named aggregate initializer entries are not allowed for "bad_mixed".',
    );
  });
});
