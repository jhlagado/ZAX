import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR203: ld diagnostics parity matrix', () => {
  it('emits explicit ld diagnostics and avoids fallback/unresolved-fixup noise', async () => {
    const entry = join(__dirname, 'fixtures', 'pr203_ld_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'ld does not support memory-to-memory transfers',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'ld r8, (bc/de) supports destination A only',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'ld (bc/de), r8 supports source A only',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'ld does not support AF in this form',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'ld rr, rr supports SP <- HL/IX/IY only',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'ld has unsupported operand form',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'Unresolved symbol "bc" in 16-bit fixup.',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'Unresolved symbol "de" in 16-bit fixup.',
    });
  });
});
