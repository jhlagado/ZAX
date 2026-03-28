import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR213: condition-symbol base collision diagnostics parity', () => {
  it('treats condition-code symbolic bases as malformed conditional arity, not label fixups', async () => {
    const entry = join(
      __dirname,
      'fixtures',
      'pr213_condition_symbolic_base_collision_invalid.zax',
    );
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expectDiagnostic(res.diagnostics, { message: 'jp cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, { message: 'call cc, nn expects two operands (cc, nn)' });
    expectDiagnostic(res.diagnostics, { message: 'jr cc, disp expects two operands (cc, disp8)' });
    expect(
      res.diagnostics.filter((d) => d.message === 'jp cc, nn expects two operands (cc, nn)'),
    ).toHaveLength(2);
    expect(
      res.diagnostics.filter((d) => d.message === 'call cc, nn expects two operands (cc, nn)'),
    ).toHaveLength(2);
    expect(
      res.diagnostics.filter((d) => d.message === 'jr cc, disp expects two operands (cc, disp8)'),
    ).toHaveLength(2);

    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unresolved symbol' });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});
