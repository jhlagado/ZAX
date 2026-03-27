import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR240: ISA register-target diagnostics parity', () => {
  it('emits explicit diagnostics for register-target misuse in call/jp/jr/djnz', async () => {
    const entry = join(__dirname, 'fixtures', 'pr240_isa_register_target_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'call does not support register targets; use imm16',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jp indirect form requires parentheses; use (hl), (ix), or (iy)',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jp does not support register targets; use imm16',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jr does not support register targets; expects disp8',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jr cc, disp does not support register targets; expects disp8',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'djnz does not support register targets; expects disp8',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'call expects imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'jp expects imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'jr expects disp8',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'djnz expects disp8',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported instruction:',
    });
  });
});
