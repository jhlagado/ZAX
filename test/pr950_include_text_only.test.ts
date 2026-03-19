import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

describe('PR950: text-only include directive', () => {
  it('inlines included text before parsing', async () => {
    const entry = join(__dirname, 'fixtures', 'pr950_include_entry.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    expect(asm!.text.toUpperCase()).toMatch(/LD A, \$0*1/);
  });

  it('diagnoses missing includes', async () => {
    const entry = join(__dirname, 'fixtures', 'pr950_missing_include.zax');
    const res = await compile(
      entry,
      { emitAsm: false, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.some((d) => d.message.includes('Failed to resolve include'))).toBe(true);
  });

  it('preserves provenance for included diagnostics', async () => {
    const entry = join(__dirname, 'fixtures', 'pr950_bad_include_entry.zax');
    const res = await compile(
      entry,
      { emitAsm: false, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    const bad = res.diagnostics.find((d) => d.message.includes('Unsupported operand'));
    expect(bad?.file).toContain('pr950_bad_include.inc');
  });
});
