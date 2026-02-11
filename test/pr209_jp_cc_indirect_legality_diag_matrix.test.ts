import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR209: jp cc indirect-form legality diagnostics parity', () => {
  it('emits explicit diagnostics for unsupported conditional indirect jp targets', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr209_jp_cc_indirect_legality_diag_matrix_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('jp cc, nn does not support indirect targets');
    expect(messages).not.toContain('jp cc, nn expects condition + imm16');
    expect(messages.some((m) => m.startsWith('Unsupported instruction:'))).toBe(false);
  });
});
