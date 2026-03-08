import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

describe('#733 typed-EA transition diagnostics', () => {
  it('rejects typed-EA transitional word stores from HL with an explicit addr-first diagnostic', async () => {
    const entry = join(__dirname, 'fixtures', 'pr733_typed_ea_store_from_hl.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    const errors = res.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain('Typed-EA transitional form `ld ea, hl` is not supported');
    expect(errors[0]!.message).toContain('Use `addr hl, ea` followed by an explicit word store sequence or a dedicated op.');
  });

  it('still allows explicit non-typed-EA HL word stores', async () => {
    const entry = join(__dirname, 'fixtures', 'pr733_plain_mem_store_from_hl.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});
