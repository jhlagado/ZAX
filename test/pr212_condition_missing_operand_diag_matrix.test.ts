import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR212: condition missing-operand diagnostics parity', () => {
  it('emits explicit diagnostics when conditional jp/call/jr omit displacement/target', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr212_condition_missing_operand_diag_matrix_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, { message: 'jp cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, { message: 'call cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, { message: 'jr cc, disp expects two operands (cc, disp8)' });

    expectNoDiagnostic(res.diagnostics, { message: 'jp expects imm16' });
    expectNoDiagnostic(res.diagnostics, { message: 'call expects imm16' });
    expectNoDiagnostic(res.diagnostics, { message: 'jr expects disp8' });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});
