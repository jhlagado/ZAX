import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR204: adc/sbc malformed-form diagnostics parity', () => {
  it('emits explicit destination diagnostics for malformed two-operand forms', async () => {
    const entry = join(__dirname, 'fixtures', 'pr204_adc_sbc_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'adc expects destination A or HL',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'adc HL, rr expects BC/DE/HL/SP',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'sbc expects destination A or HL',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'sbc HL, rr expects BC/DE/HL/SP',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'adc has unsupported operand form',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'sbc has unsupported operand form',
    });
  });
});
