import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { ensureCliBuilt, runCli } from './helpers/cli.js';

describe('PR578 legacy warning CLI enablement', () => {
  it('emits legacy syntax warnings only when the CLI flag is enabled', async () => {
    await ensureCliBuilt();
    const work = await mkdtemp(join(tmpdir(), 'zax-cli-legacy-warn-'));
    const entry = join(work, 'legacy.zax');
    await writeFile(
      entry,
      ['globals', '  count: byte', '', 'func main()', '  ret', 'end', ''].join('\n'),
      'utf8',
    );

    const quiet = await runCli([entry], work);
    expect(quiet.code).toBe(0);
    expect(quiet.stderr).not.toContain('[ZAX101]');

    const warned = await runCli(['--legacy-syntax-warn', entry], work);
    expect(warned.code).toBe(0);
    expect(warned.stderr).toContain('[ZAX101]');
    expect(warned.stderr).toContain('Legacy "globals ... end" storage blocks are deprecated');
  });
});
