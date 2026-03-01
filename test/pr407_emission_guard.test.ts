import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const compileAsm = async (entry: string): Promise<string> => {
  const res = await compile(
    entry,
    { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
    { formats: defaultFormatWriters },
  );
  expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
  expect(asm).toBeDefined();
  return asm!.text;
};

const assertSingleInstructionTraceLines = (label: string, text: string) => {
  const traceLines = text.split('\n').filter((line) => /;\s+[0-9A-F]{4}:/i.test(line));

  expect(traceLines.length, `${label} should contain traced instructions`).toBeGreaterThan(0);

  for (const line of traceLines) {
    const semicolons = line.match(/;/g) ?? [];
    expect(semicolons.length, `${label} contains bundled trace emission: ${line}`).toBe(1);
  }
};

describe('PR407: emitted trace lines stay single-instruction for covered lowering paths', () => {
  it('guards representative byte and word lowering fixtures', async () => {
    const fixtures = [
      ['byte global non-A', join(__dirname, 'fixtures', 'pr405_byte_global_non_a_symbols.zax')],
      ['byte indexed templates', join(__dirname, 'fixtures', 'pr405_byte_indexed_templates.zax')],
      ['word scalar accessors', join(__dirname, 'fixtures', 'pr406_word_mem_to_mem_scalar.zax')],
      [
        'word mixed edge cases',
        join(__dirname, 'fixtures', 'pr406_word_mem_to_mem_mixed_reverse.zax'),
      ],
      ['word fallback store', join(__dirname, 'fixtures', 'pr406_word_hl_fallback_store.zax')],
      ['word fallback ix load', join(__dirname, 'fixtures', 'pr406_word_ix_fallback_load.zax')],
    ] as const;

    for (const [label, entry] of fixtures) {
      const text = await compileAsm(entry);
      assertSingleInstructionTraceLines(label, text);
    }
  });
});
