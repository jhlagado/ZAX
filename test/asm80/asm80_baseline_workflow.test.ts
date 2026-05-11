import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..');

describe('ASM80 baseline acceptance workflow', () => {
  it('exposes a single npm script for the external MON3 and TEC-1G gates', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['test:asm80:baseline']).toBe('node scripts/dev/run-asm80-baseline.mjs');
  });

  it('documents the opt-in baseline command with both external corpora', () => {
    const doc = readFileSync(
      join(repoRoot, 'docs', 'reference', 'testing-verification-guide.md'),
      'utf8',
    );

    expect(doc).toContain('npm run test:asm80:baseline');
    expect(doc).toContain('MON3');
    expect(doc).toContain('TEC-1G');
  });
});
