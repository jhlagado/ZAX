import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { Asm80Artifact } from '../src/formats/types.js';

const compileAsm = async (entry: string): Promise<string> => {
  const res = await compile(
    entry,
    { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
    { formats: defaultFormatWriters },
  );
  expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const asm = res.artifacts.find((a): a is Asm80Artifact => a.kind === 'asm80');
  expect(asm).toBeDefined();
  return asm!.text;
};

describe('PR543 function lowering integration', () => {
  it('keeps implicit-ret function setup stable', async () => {
    const text = await compileAsm(join(__dirname, 'fixtures', 'pr14_epilogue_locals.zax'));

    expect(text).toContain('push IX');
    expect(text).toContain('ld IX, $0000');
    expect(text).toContain('add IX, SP');
    expect(text).toContain('__zax_epilogue_0:');
    expect(text).toContain('ret');
  });

  it('keeps explicit ret routed through the synthetic epilogue', async () => {
    const text = await compileAsm(join(__dirname, 'fixtures', 'pr543_function_ret_epilogue.zax'));

    expect(text).toContain('jp __zax_epilogue_0');
    expect(text).toContain('__zax_epilogue_0:');
    expect(text).toContain('ret');
  });
});
