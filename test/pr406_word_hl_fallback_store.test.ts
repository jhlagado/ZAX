import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

describe('PR406: HL fallback word store', () => {
  it('now rejects typed-EA word stores from HL with the addr-first diagnostic', async () => {
    const entry = join(__dirname, 'fixtures', 'pr406_word_hl_fallback_store.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    const errors = res.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain('Typed-EA transitional form `ld ea, hl` is not supported');
  });
});
