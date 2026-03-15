import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR820 exact-size cleanup', () => {
  it('lowers nested exact-size record indexing through the exact scale path', async () => {
    const entry = join(__dirname, 'fixtures', 'pr820_exact_nested_indexing.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('PUSH DE');
    expect(text).toContain('LD D, H');
    expect(text).toContain('LD E, L');
    expect(text).toContain('ADD HL, HL');
    expect(text).toContain('ADD HL, DE');
    expect(text).toContain('POP DE');
    expect(text).toContain('LD DE, $0003');
    expect((text.match(/ADD HL, DE/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});
