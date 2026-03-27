import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR206: in/out indexed-byte-register diagnostics parity', () => {
  it('emits explicit diagnostics for ED in/out forms using IX*/IY* byte registers', async () => {
    const entry = join(__dirname, 'fixtures', 'pr206_in_out_indexed_reg_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'in destination must use legacy reg8 B/C/D/E/H/L/A',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'out source must use legacy reg8 B/C/D/E/H/L/A',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'in expects a reg8 destination',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'out expects a reg8 source',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported instruction:',
    });
  });
});
