import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const fixture = join(__dirname, 'fixtures', 'pr354_return_keyword_rejection.zax');

describe('PR354: register-list only return surface', () => {
  it('rejects legacy return keywords (void/long)', async () => {
    const res = await compile(fixture, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages.some((m) => m.includes('Legacy return keyword \"void\"'))).toBe(true);
    expect(messages.some((m) => m.includes('Legacy return keyword \"long\"'))).toBe(true);
  });
});
