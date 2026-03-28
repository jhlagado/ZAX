import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../../src/compile.js';
import { defaultFormatWriters } from '../../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR254 parser: module var removal', () => {
  it('diagnoses top-level var blocks as removed syntax', async () => {
    const entry = join(__dirname, '..', 'fixtures', 'pr254_module_var_renamed_globals.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0]?.message).toBe(
      `Legacy "var ... end" storage blocks are removed; use direct declarations inside named data sections.`,
    );
    expect(res.diagnostics[0]?.line).toBe(1);
    expect(res.diagnostics[0]?.column).toBe(1);
  });
});
