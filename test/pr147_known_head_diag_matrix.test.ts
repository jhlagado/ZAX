import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR147: broad known-head diagnostic matrix', () => {
  it('reports specific diagnostics for malformed known instruction heads', async () => {
    const entry = join(__dirname, 'fixtures', 'pr147_known_head_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, { message: 'add expects two operands' });
    expectDiagnostic(res.diagnostics, { message: 'ld expects two operands' });
    expectDiagnostic(res.diagnostics, { message: 'inc expects one operand' });
    expectDiagnostic(res.diagnostics, { message: 'dec expects one operand' });
    expectDiagnostic(res.diagnostics, { message: 'push supports BC/DE/HL/AF/IX/IY only' });
    expectDiagnostic(res.diagnostics, { message: 'pop supports BC/DE/HL/AF/IX/IY only' });
    expectDiagnostic(res.diagnostics, { message: 'ex expects two operands' });
    expectDiagnostic(res.diagnostics, {
      message: 'call does not support register targets; use imm16',
    });
    expectDiagnostic(res.diagnostics, { message: 'call cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, { message: 'call cc, nn expects imm16' });
    expectDiagnostic(res.diagnostics, { message: 'jp cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, {
      message: 'jp indirect form supports (hl), (ix), or (iy) only',
    });
    expectDiagnostic(res.diagnostics, { message: 'jr cc, disp expects two operands (cc, disp8)' });
    expectDiagnostic(res.diagnostics, { message: 'jr cc expects valid condition code NZ/Z/NC/C' });
    expectDiagnostic(res.diagnostics, {
      message: 'djnz does not support register targets; expects disp8',
    });
    expectDiagnostic(res.diagnostics, { message: 'rst expects an imm8 multiple of 8 (0..56)' });
    expectDiagnostic(res.diagnostics, { message: 'im expects 0, 1, or 2' });
    expectDiagnostic(res.diagnostics, { message: 'in a,(n) expects an imm8 port number' });
    expectDiagnostic(res.diagnostics, {
      message: 'out (n),a immediate port form requires source A',
    });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});
