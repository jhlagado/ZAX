import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { Asm80Artifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('LOWER-01 typed reinterpretation integration', () => {
  it('lowers scalar load/store, aggregate continuation, and ea-op use through reinterpretation', async () => {
    const entry = join(__dirname, 'fixtures', 'pr770_typed_reinterpretation_positive.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((artifact): artifact is Asm80Artifact => artifact.kind === 'asm80');
    expect(asm).toBeDefined();

    const text = asm!.text.toUpperCase();
    expect(text).toContain('LD A, (HL)');
    expect(text).toContain('LD H, D');
    expect(text).toContain('LD L, E');
    expect(text).toContain('LD (HL), A');
    expect(text).toContain('CALL TOUCH_PAIR');
    expect(text).toContain('ADD HL, DE');
  });
});
