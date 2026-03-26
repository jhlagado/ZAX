import { describe, expect, it } from 'vitest';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const skipTour = process.env.SKIP_LANGUAGE_TOUR === '1';

(skipTour ? describe.skip : describe)('language-tour regeneration artifacts', () => {
  it('emits only d8dbg files (no bin/hex/lst)', async () => {
    const dir = join(process.cwd(), 'test', 'language-tour');
    const files = await readdir(dir);
    const hasBinHexLst = files.some((f) => f.match(/\.(bin|hex|lst)$/));
    expect(hasBinHexLst).toBe(false);
    const hasD8 = files.some((f) => f.endsWith('.d8dbg.json'));
    expect(hasD8).toBe(true);
  });
});
