import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { ensureCliBuilt, runCli } from './helpers/cli.js';

describe('PR578 legacy warning CLI removal', () => {
  it('rejects the removed legacy warning flag', async () => {
    await ensureCliBuilt();
    const work = await mkdtemp(join(tmpdir(), 'zax-cli-legacy-warn-'));
    const entry = join(work, 'legacy.zax');
    await writeFile(
      entry,
      ['globals', '  count: byte', '', 'func main()', '  ret', 'end', ''].join('\n'),
      'utf8',
    );

    const warned = await runCli(['--legacy-syntax-warn', entry], work);
    expect(warned.code).not.toBe(0);
    expect(warned.stderr).toContain('Unknown option "--legacy-syntax-warn"');
  }, 15000);
});
