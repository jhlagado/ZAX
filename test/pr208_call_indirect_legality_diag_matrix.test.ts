import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR208: call indirect-form legality diagnostics parity', () => {
  it('emits explicit diagnostics for unsupported indirect call targets', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr208_call_indirect_legality_diag_matrix_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'call does not support indirect targets; use imm16',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'call cc, nn does not support indirect targets',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'call expects imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'call cc, nn expects condition + imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported instruction:',
    });
  });
});
