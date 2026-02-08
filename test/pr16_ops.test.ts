import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { BinArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR16 op declarations and expansion', () => {
  it('expands a basic op invocation with matcher substitution', async () => {
    const entry = join(__dirname, 'fixtures', 'pr16_op_basic.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(Uint8Array.of(0x06, 0x07, 0xc9));
  });

  it('diagnoses when no op overload matches operands', async () => {
    const entry = join(__dirname, 'fixtures', 'pr16_op_no_match.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(res.diagnostics.some((d) => d.message.includes('No matching op overload'))).toBe(true);
  });

  it('diagnoses ambiguous op overload resolution', async () => {
    const entry = join(__dirname, 'fixtures', 'pr16_op_ambiguous.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(res.diagnostics.some((d) => d.message.includes('Ambiguous op overload'))).toBe(true);
  });

  it('diagnoses cyclic op expansion', async () => {
    const entry = join(__dirname, 'fixtures', 'pr16_op_cycle.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(res.diagnostics.some((d) => d.message.includes('Cyclic op expansion'))).toBe(true);
  });
});
