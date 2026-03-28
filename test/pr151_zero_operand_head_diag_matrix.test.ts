import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR151: zero-operand known-head diagnostics matrix', () => {
  it('rejects extra operands on zero-operand known heads without generic fallback', async () => {
    const entry = join(__dirname, 'fixtures', 'pr151_zero_operand_head_diag_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, { message: 'nop expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'halt expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'di expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'ei expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'scf expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'ccf expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'cpl expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'daa expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'rlca expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'rrca expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'rla expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'rra expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'exx expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'neg expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'reti expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'retn expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'rrd expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'rld expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'ldi expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'ldir expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'ldd expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'lddr expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'cpi expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'cpir expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'cpd expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'cpdr expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'ini expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'inir expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'ind expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'indr expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'outi expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'otir expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'outd expects no operands' });
    expectDiagnostic(res.diagnostics, { message: 'otdr expects no operands' });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});
