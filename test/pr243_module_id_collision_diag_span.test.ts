import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DiagnosticIds } from '../src/diagnostics/types.js';
import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR243 module-id collision diagnostics carry source spans', () => {
  it('pins collision diagnostics to the colliding module file location', async () => {
    const entry = join(__dirname, 'fixtures', 'pr243_modid_main.zax');
    const collidingModule = join(__dirname, 'fixtures', 'pr243_b', 'lib.zax');

    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.artifacts).toEqual([]);

    const diag = res.diagnostics.find(
      (d) => d.id === DiagnosticIds.SemanticsError && d.message.startsWith('Module ID collision:'),
    );
    expect(diag).toBeDefined();
    expect(diag?.file).toBe(collidingModule);
    expect(diag?.line).toBe(1);
    expect(diag?.column).toBe(1);
  });
});
