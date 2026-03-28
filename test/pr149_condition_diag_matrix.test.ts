import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR149: condition diagnostics parity matrix', () => {
  it('reports explicit diagnostics for malformed condition operands/forms', async () => {
    const entry = join(__dirname, 'fixtures', 'pr149_condition_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, { message: 'ret cc expects a valid condition code' });
    expectDiagnostic(res.diagnostics, { message: 'ret expects no operands or one condition code' });
    expectDiagnostic(res.diagnostics, { message: 'jp cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, {
      message: 'jp cc expects valid condition code NZ/Z/NC/C/PO/PE/P/M',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'jp expects one operand (nn/(hl)/(ix)/(iy)) or two operands (cc, nn)',
    });
    expectDiagnostic(res.diagnostics, { message: 'call cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, {
      message: 'call cc expects valid condition code NZ/Z/NC/C/PO/PE/P/M',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'call expects one operand (nn) or two operands (cc, nn)',
    });
    expectDiagnostic(res.diagnostics, { message: 'jr cc, disp expects two operands (cc, disp8)' });
    expectDiagnostic(res.diagnostics, { message: 'jr cc expects valid condition code NZ/Z/NC/C' });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unresolved symbol' });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});
