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

describe('PR544 program lowering integration', () => {
  it('keeps top-level declaration traversal stable', async () => {
    const text = await compileAsm(join(__dirname, 'fixtures', 'pr544_program_lowering.zax'));

    expect(text).toContain('helper:');
    expect(text).toContain('main:');
    expect(text).toContain('arr');
    expect(text).toContain('Mode.Read');
    expect(text).toContain('K');
  });
});
