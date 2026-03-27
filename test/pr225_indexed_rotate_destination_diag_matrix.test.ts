import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR225: indexed rotate/shift destination diagnostics parity matrix', () => {
  it('emits explicit legacy-reg and index-family diagnostics across all indexed rotate/shift heads', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr225_indexed_rotate_destination_diag_matrix_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const heads = ['rlc', 'rrc', 'rl', 'rr', 'sla', 'sra', 'sll', 'srl'];
    for (const head of heads) {
      expectDiagnostic(res.diagnostics, {
        severity: 'error',
        message: `${head} indexed destination must use legacy reg8 B/C/D/E/H/L/A`,
      });
      expectDiagnostic(res.diagnostics, {
        severity: 'error',
        message: `${head} indexed destination family must match source index base`,
      });
      expectNoDiagnostic(res.diagnostics, {
        message: `${head} (ix/iy+disp),r expects reg8 destination`,
      });
    }
  });
});
