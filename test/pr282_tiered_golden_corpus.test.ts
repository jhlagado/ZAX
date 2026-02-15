import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type TierCase = {
  tier: 'basic' | 'intermediate' | 'advanced';
  entry: string;
  golden: string;
};

const tierCases: TierCase[] = [
  {
    tier: 'basic',
    entry: join(__dirname, 'fixtures', 'corpus', 'basic_control_flow.zax'),
    golden: join(__dirname, 'fixtures', 'corpus', 'golden', 'basic_control_flow.asm'),
  },
  {
    tier: 'intermediate',
    entry: join(__dirname, 'fixtures', 'corpus', 'intermediate_indexing.zax'),
    golden: join(__dirname, 'fixtures', 'corpus', 'golden', 'intermediate_indexing.asm'),
  },
  {
    tier: 'advanced',
    entry: join(__dirname, 'fixtures', 'corpus', 'advanced_typed_calls.zax'),
    golden: join(__dirname, 'fixtures', 'corpus', 'golden', 'advanced_typed_calls.asm'),
  },
];

describe('PR282: tiered golden corpus for lowering verification', () => {
  it('matches golden .asm for each tier and stays deterministic', async () => {
    for (const c of tierCases) {
      const expected = await readFile(c.golden, 'utf8');

      const first = await compile(
        c.entry,
        {
          emitBin: false,
          emitHex: false,
          emitD8m: false,
          emitListing: false,
          emitAsm: true,
        },
        { formats: defaultFormatWriters },
      );
      expect(first.diagnostics, `${c.tier}:diagnostics`).toEqual([]);
      const asmFirst = first.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
      expect(asmFirst, `${c.tier}:asm-artifact`).toBeDefined();
      expect(asmFirst!.text, `${c.tier}:golden`).toBe(expected);

      const second = await compile(
        c.entry,
        {
          emitBin: false,
          emitHex: false,
          emitD8m: false,
          emitListing: false,
          emitAsm: true,
        },
        { formats: defaultFormatWriters },
      );
      expect(second.diagnostics, `${c.tier}:diagnostics-2`).toEqual([]);
      const asmSecond = second.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
      expect(asmSecond, `${c.tier}:asm-artifact-2`).toBeDefined();
      expect(asmSecond!.text, `${c.tier}:determinism`).toBe(asmFirst!.text);
    }
  });

  it('includes a negative runtime-atom-budget rejection case in corpus tests', async () => {
    const entry = join(__dirname, 'fixtures', 'corpus', 'invalid_runtime_atom_budget.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(
      res.diagnostics.some((d) =>
        d.message.includes('Source ea expression exceeds runtime-atom budget (max 1; found 2).'),
      ),
    ).toBe(true);
  });
});
