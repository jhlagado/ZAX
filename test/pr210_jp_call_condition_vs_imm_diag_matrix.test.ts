import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR210: conditional jp/call condition-vs-imm diagnostics parity', () => {
  it('emits distinct diagnostics for invalid condition code vs invalid imm16', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr210_jp_call_condition_vs_imm_diag_matrix_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jp cc expects valid condition code NZ/Z/NC/C/PO/PE/P/M',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jp cc, nn expects imm16',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'call cc expects valid condition code NZ/Z/NC/C/PO/PE/P/M',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'call cc, nn expects imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'jp cc, nn expects condition + imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'call cc, nn expects condition + imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported instruction:',
    });
  });
});
