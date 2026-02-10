import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR164 parser: extern missing-end recovery', () => {
  it('recovers at next top-level declaration and emits focused extern diagnostics', async () => {
    const entry = join(__dirname, 'fixtures', 'pr164_extern_missing_end_recovery.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('Unterminated extern "legacy": missing "end"');
    expect(messages).not.toContain('Invalid extern func declaration');
    expect(messages.some((m) => m.startsWith('Unsupported top-level construct:'))).toBe(false);
  });
});
