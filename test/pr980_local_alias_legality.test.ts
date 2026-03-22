import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compileFixture = async (name: string) => {
  const entry = join(__dirname, 'fixtures', name);
  return compile(entry, {}, { formats: defaultFormatWriters });
};

describe('PR980 local alias legality + raw access', () => {
  it('accepts alias to global aggregate in typed code', async () => {
    const res = await compileFixture('pr980_local_alias_global_typed.zax');
    expect(res.diagnostics).toEqual([]);
  });

  it('accepts alias to global aggregate in raw code', async () => {
    const res = await compileFixture('pr980_local_alias_raw_aggregate.zax');
    expect(res.diagnostics).toEqual([]);
  });

  it('accepts alias to global scalar in raw code', async () => {
    const res = await compileFixture('pr980_local_alias_raw_scalar.zax');
    expect(res.diagnostics).toEqual([]);
  });

  it('keeps non-scalar parameter forwarding working', async () => {
    const res = await compileFixture('pr980_local_alias_param_forwarding.zax');
    expect(res.diagnostics).toEqual([]);
  });

  it('rejects alias to parameter', async () => {
    const res = await compileFixture('pr980_local_alias_bad_param.zax');
    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Function-local alias "a" cannot target parameter "buf".');
  });

  it('rejects alias to local', async () => {
    const res = await compileFixture('pr980_local_alias_bad_local.zax');
    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Function-local alias "c" cannot target local "count".');
  });

  it('rejects alias to alias', async () => {
    const res = await compileFixture('pr980_local_alias_bad_alias.zax');
    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Function-local alias "b" cannot target alias "a".');
  });

  it('rejects alias to field path', async () => {
    const res = await compileFixture('pr980_local_alias_bad_field.zax');
    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Function-local alias "p" must target a direct module-scope storage name.');
  });

  it('rejects alias to indexed path', async () => {
    const res = await compileFixture('pr980_local_alias_bad_index.zax');
    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Function-local alias "x" must target a direct module-scope storage name.');
  });

  it('rejects alias to constant', async () => {
    const res = await compileFixture('pr980_local_alias_bad_const.zax');
    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Function-local alias "s" must target a direct module-scope storage name.');
  });
});
