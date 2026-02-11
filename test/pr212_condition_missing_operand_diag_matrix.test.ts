import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR212: condition missing-operand diagnostics parity', () => {
  it('emits explicit diagnostics when conditional jp/call/jr omit displacement/target', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr212_condition_missing_operand_diag_matrix_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('jp cc, nn expects two operands (cc, nn)');
    expect(messages).toContain('call cc, nn expects two operands (cc, nn)');
    expect(messages).toContain('jr cc, disp expects two operands (cc, disp8)');

    expect(messages).not.toContain('jp expects imm16');
    expect(messages).not.toContain('call expects imm16');
    expect(messages).not.toContain('jr expects disp8');
    expect(messages.some((m) => m.startsWith('Unsupported instruction:'))).toBe(false);
  });
});
