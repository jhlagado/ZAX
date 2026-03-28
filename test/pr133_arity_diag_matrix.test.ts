import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR133: broad arity diagnostics matrix', () => {
  it('reports explicit arity diagnostics for unsupported instruction counts', async () => {
    const entry = join(__dirname, 'fixtures', 'pr133_arity_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, { message: 'add expects two operands' });
    expectDiagnostic(res.diagnostics, { message: 'ld expects two operands' });
    expectDiagnostic(res.diagnostics, { message: 'inc expects one operand' });
    expectDiagnostic(res.diagnostics, { message: 'dec expects one operand' });
    expectDiagnostic(res.diagnostics, { message: 'push expects one operand' });
    expectDiagnostic(res.diagnostics, { message: 'pop expects one operand' });
    expectDiagnostic(res.diagnostics, { message: 'ex expects two operands' });
    expectDiagnostic(res.diagnostics, { message: 'bit expects two operands' });
    expectDiagnostic(res.diagnostics, {
      message: 'res expects two operands, or three with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'set expects two operands, or three with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'rl expects one operand, or two with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'rr expects one operand, or two with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'sla expects one operand, or two with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'sra expects one operand, or two with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'srl expects one operand, or two with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'sll expects one operand, or two with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'rlc expects one operand, or two with indexed source + reg8 destination',
    });
    expectDiagnostic(res.diagnostics, {
      message: 'rrc expects one operand, or two with indexed source + reg8 destination',
    });
  });
});
