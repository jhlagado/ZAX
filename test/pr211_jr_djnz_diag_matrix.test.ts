import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR211: jr/djnz malformed-form diagnostics parity', () => {
  it('emits explicit diagnostics for invalid condition, disp, and indirect forms', async () => {
    const entry = join(__dirname, 'fixtures', 'pr211_jr_djnz_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jr cc expects valid condition code NZ/Z/NC/C',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jr cc, disp does not support register targets; expects disp8',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jr cc, disp does not support indirect targets',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jr does not support indirect targets; expects disp8',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'djnz does not support indirect targets; expects disp8',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'jr cc, disp expects NZ/Z/NC/C + disp8',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported instruction:',
    });
  });
});
