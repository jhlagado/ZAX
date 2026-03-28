import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../../src/compile.js';
import { defaultFormatWriters } from '../../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from '../helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR184 parser: func/extern parameter and return diagnostics matrix', () => {
  it('emits explicit expected-shape diagnostics for malformed parameter/return forms', async () => {
    const entry = join(__dirname, '..', 'fixtures', 'pr184_func_extern_param_return_diag_matrix.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      line: 1,
      message: 'Invalid parameter declaration: expected <name>: <type>',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      line: 5,
      message: 'Invalid parameter type "[byte]": expected <type>',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      line: 9,
      message: 'Invalid return register "[word]": expected HL, DE, BC, or AF.',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      line: 13,
      message: 'Invalid op parameter declaration: expected <name>: <matcher>',
    });
    expectDiagnostic(res.diagnostics, {
      severity: 'error',
      line: 19,
      message: 'Invalid return register "[word]": expected HL, DE, BC, or AF.',
    });

    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported type in parameter declaration',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported return type',
    });
    expectNoDiagnostic(res.diagnostics, {
      messageIncludes: 'Unsupported extern func return type',
    });
  });
});
