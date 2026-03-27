import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR205: indexed CB destination diagnostics parity', () => {
  it('reports explicit indexed destination legality diagnostics for CB/DD/FD forms', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr205_indexed_cb_destination_diag_matrix_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'res indexed destination must use legacy reg8 B/C/D/E/H/L/A',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'res indexed destination family must match source index base',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'set indexed destination must use legacy reg8 B/C/D/E/H/L/A',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'set indexed destination family must match source index base',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'rl indexed destination must use legacy reg8 B/C/D/E/H/L/A',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'rl indexed destination family must match source index base',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'rrc indexed destination must use legacy reg8 B/C/D/E/H/L/A',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'rrc indexed destination family must match source index base',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'res b,(ix/iy+disp),r expects reg8 destination',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'set b,(ix/iy+disp),r expects reg8 destination',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'rl (ix/iy+disp),r expects reg8 destination',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'rrc (ix/iy+disp),r expects reg8 destination',
    });
  });
});
