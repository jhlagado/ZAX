import { describe, expect, it } from 'vitest';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

describe('language-tour regeneration artifacts', () => {
  it('emits only asm and d8dbg files (no bin/hex/lst)', async () => {
    const dir = join(process.cwd(), 'examples', 'language-tour');
    const files = await readdir(dir);
    const hasBinHexLst = files.some((f) => f.match(/\.(bin|hex|lst)$/));
    expect(hasBinHexLst).toBe(false);
    const hasAsm = files.some((f) => f.endsWith('.asm'));
    const hasD8 = files.some((f) => f.endsWith('.d8dbg.json'));
    expect(hasAsm).toBe(true);
    expect(hasD8).toBe(true);
  });
});
