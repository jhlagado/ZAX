import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { DiagnosticIds } from '../src/diagnosticTypes.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PR149_CONDITION_MATRIX_FIXTURE = join(__dirname, 'fixtures', 'pr149_condition_diag_matrix_invalid.zax');

type ConditionMatrixRow = {
  label: string;
  fixture: string;
  id: (typeof DiagnosticIds)[keyof typeof DiagnosticIds];
  message: string;
};

describe('PR149: condition diagnostics parity matrix', () => {
  // IDs observed from `compile(PR149_CONDITION_MATRIX_FIXTURE)` (EmitError = lowering diagAt;
  // EncodeError = encoder `diag` in encode.ts).
  it.each([
    {
      label: 'ret invalid cc',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'ret cc expects a valid condition code',
    },
    {
      label: 'ret arity',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'ret expects no operands or one condition code',
    },
    {
      label: 'jp cc nn arity',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'jp cc, nn expects two operands (cc, nn)',
    },
    {
      label: 'jp cc validation',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'jp cc expects valid condition code NZ/Z/NC/C/PO/PE/P/M',
    },
    {
      label: 'jp arity',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'jp expects one operand (nn/(hl)/(ix)/(iy)) or two operands (cc, nn)',
    },
    {
      label: 'call cc nn arity',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'call cc, nn expects two operands (cc, nn)',
    },
    {
      label: 'call cc validation',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'call cc expects valid condition code NZ/Z/NC/C/PO/PE/P/M',
    },
    {
      label: 'call arity',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'call expects one operand (nn) or two operands (cc, nn)',
    },
    {
      label: 'jr cc disp arity',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'jr cc, disp expects two operands (cc, disp8)',
    },
    {
      label: 'jr cc validation',
      fixture: 'pr149_condition_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'jr cc expects valid condition code NZ/Z/NC/C',
    },
  ] satisfies ConditionMatrixRow[])('$label — explicit diagnostics for malformed condition operands/forms', async (row) => {
    const entry = join(__dirname, 'fixtures', row.fixture);
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: row.id,
      severity: 'error',
      message: row.message,
    });
  });

  it('does not fall back to unresolved-symbol or unsupported-instruction diagnostics', async () => {
    const res = await compile(PR149_CONDITION_MATRIX_FIXTURE, {}, { formats: defaultFormatWriters });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unresolved symbol' });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});
