import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR207: jp indirect-form legality diagnostics parity', () => {
  it('emits explicit diagnostics for unsupported indirect jp addressing forms', async () => {
    const entry = join(__dirname, 'fixtures', 'pr207_jp_indirect_legality_diag_matrix_invalid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      message: 'jp indirect form supports (hl), (ix), or (iy) only',
    });
    expectNoDiagnostic(res.diagnostics, {
      message: 'jp expects imm16',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported instruction:',
    });
  });
});
