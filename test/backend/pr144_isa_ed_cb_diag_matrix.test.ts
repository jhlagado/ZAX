import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../../src/compile.js';
import { defaultFormatWriters } from '../../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from '../helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR144: ED/CB diagnostics parity matrix', () => {
  it('reports explicit diagnostics for malformed ED/CB forms', async () => {
    const entry = join(__dirname, '..', 'fixtures', 'pr144_isa_ed_cb_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, { message: 'im expects 0, 1, or 2' });
    expectDiagnostic(res.diagnostics, {
      message: 'in a,(n) immediate port form requires destination A',
    });
    expectDiagnostic(res.diagnostics, { message: 'in a,(n) expects an imm8 port number' });
    expectDiagnostic(res.diagnostics, { message: 'in expects a reg8 destination' });
    expectDiagnostic(res.diagnostics, { message: 'out (c), n immediate form supports n=0 only' });
    expectDiagnostic(res.diagnostics, {
      message: 'out (n),a immediate port form requires source A',
    });
    expectDiagnostic(res.diagnostics, { message: 'out (n),a expects an imm8 port number' });
    expectDiagnostic(res.diagnostics, { message: 'adc HL, rr expects BC/DE/HL/SP' });
    expectDiagnostic(res.diagnostics, { message: 'sbc HL, rr expects BC/DE/HL/SP' });
    expectDiagnostic(res.diagnostics, { message: 'bit expects bit index 0..7' });
    expectDiagnostic(res.diagnostics, {
      message: 'res b,(ix/iy+disp),r requires an indexed memory source',
    });
    expectDiagnostic(res.diagnostics, { message: 'set (ix/iy+disp) expects disp8' });
    expectDiagnostic(res.diagnostics, {
      message: 'rl two-operand form requires (ix/iy+disp) source',
    });
    expectDiagnostic(res.diagnostics, { message: 'rr (ix/iy+disp) expects disp8' });
    expectDiagnostic(res.diagnostics, {
      message: 'sla indexed destination must use legacy reg8 B/C/D/E/H/L/A',
    });
    expectDiagnostic(res.diagnostics, { message: 'sra (ix/iy+disp),r expects reg8 destination' });
    expectDiagnostic(res.diagnostics, { message: 'rrc (ix/iy+disp) expects disp8' });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});
