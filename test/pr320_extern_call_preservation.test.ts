import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const fixture = join(__dirname, 'fixtures', 'pr320_extern_and_internal_calls.zax');

describe('PR320 extern typed-call preservation', () => {
  it('does not push preserves for extern typed calls but does for internal typed calls', async () => {
    const res = await compile(
      fixture,
      { emitBin: false, emitHex: false, emitD8m: false, emitListing: false, emitAsm: true },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text;

    // callee_internal prologue preserves AF/BC/DE (return in HL, volatile) per table
    const idxCallee = text.indexOf('callee_internal:');
    expect(idxCallee).toBeGreaterThanOrEqual(0);
    const endCallee = text.indexOf('__zax_epilogue', idxCallee);
    const prologue = text.slice(idxCallee, endCallee > idxCallee ? endCallee : idxCallee + 256);
    expect(prologue).toMatch(/push AF/i);
    expect(prologue).toMatch(/push BC/i);
    expect(prologue).toMatch(/push DE/i);

    // extern call site should not push preserves around callee_extern
    const lines = text.split('\n');
    const callIdx = lines.findIndex((l) => /call callee_extern/i.test(l));
    expect(callIdx).toBeGreaterThanOrEqual(0);
    const window = lines.slice(Math.max(0, callIdx - 3), callIdx + 1).join('\n');
    expect(window).not.toMatch(/push AF/i);
    expect(window).not.toMatch(/push BC/i);
    expect(window).not.toMatch(/push DE/i);
  });
});
