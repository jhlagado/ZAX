import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR508: extracted runtime-immediate helpers', () => {
  it('preserves runtime-affine scaling and immediate materialization in lowering', async () => {
    const entry = join(__dirname, 'fixtures', 'pr272_runtime_affine_valid.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics).toEqual([]);
  });

  it('preserves byte call-arg zero-extension materialization', async () => {
    const entry = join(__dirname, 'fixtures', 'pr405_byte_call_scalar_arg.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const asm = res.artifacts.find((a) => a.kind === 'asm80');

    expect(res.diagnostics).toEqual([]);
    expect(asm?.kind).toBe('asm');
    expect(asm?.text).toContain('ld H, $0000');
    expect(asm?.text).toContain('push HL');
  });
});
