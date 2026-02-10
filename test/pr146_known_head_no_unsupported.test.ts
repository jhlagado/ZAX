import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR146: known-head diagnostics avoid unsupported fallback', () => {
  it('uses specific diagnostics for malformed known instruction heads', async () => {
    const entry = join(__dirname, 'fixtures', 'pr146_known_head_no_unsupported.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('ld IXH, source expects (ix+disp)');
    expect(messages).toContain(
      `ex supports "AF, AF'", "DE, HL", "(SP), HL", "(SP), IX", and "(SP), IY" only`,
    );
    expect(messages).toContain('jp expects imm16');
    expect(messages).toContain('in (c) is the only one-operand in form');
    expect(messages).toContain('out expects two operands');
    expect(messages.some((m) => m.startsWith('Unsupported instruction:'))).toBe(false);
  });
});
