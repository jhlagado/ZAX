import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR165 parser: data keyword-name recovery', () => {
  it('reports keyword-name collisions in data blocks without cascading to top-level parse errors', async () => {
    const entry = join(__dirname, 'fixtures', 'pr165_data_keyword_name_recovery.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain(
      'Invalid data declaration name "func": collides with a top-level keyword.',
    );
    expect(messages).toContain(
      'Invalid data declaration name "op": collides with a top-level keyword.',
    );
    expect(messages).not.toContain('Invalid func header');
    expect(messages.some((m) => m.startsWith('Unsupported top-level construct:'))).toBe(false);
  });
});
