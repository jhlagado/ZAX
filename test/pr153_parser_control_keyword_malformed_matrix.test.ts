import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR153 parser: malformed control-keyword matrix', () => {
  it('reports explicit control-keyword diagnostics without unsupported-instruction fallback', async () => {
    const entry = join(__dirname, 'fixtures', 'pr153_parser_control_keyword_malformed_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);

    const messages = res.diagnostics.map((d) => d.message);
    expect(messages).toContain('"repeat" does not take operands');
    expect(messages).toContain('"until" without matching "repeat"');
    expect(messages).toContain('"if" expects a condition code');
    expect(messages).toContain('"while" expects a condition code');
    expect(messages).toContain('Invalid select selector');
    expect(messages).toContain('Invalid case value');
    expect(messages).toContain('"else" does not take operands');
    expect(messages).toContain('"select" must contain at least one arm ("case" or "else")');
    expect(messages).toContain('"end" does not take operands');
    expect(messages.some((m) => m.startsWith('Unsupported instruction:'))).toBe(false);
  });
});
