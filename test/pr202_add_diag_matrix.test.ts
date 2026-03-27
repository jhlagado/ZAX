import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR202: add malformed-form diagnostics parity', () => {
  it('emits explicit add diagnostics without generic known-head fallback', async () => {
    const entry = join(__dirname, 'fixtures', 'pr202_add_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);

    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'add expects destination A, HL, IX, or IY',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'add HL, rr expects BC/DE/HL/SP',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'add IX, rr supports BC/DE/SP and same-index pair only',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'add IY, rr supports BC/DE/SP and same-index pair only',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'add has unsupported operand form',
    });
  });
});
