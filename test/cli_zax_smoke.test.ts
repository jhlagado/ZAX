import { describe, expect, it } from 'vitest';

import { runCli } from './helpers/cli.js';

describe('npm zax smoke', () => {
  it('builds and prints version via npm script wrapper', async () => {
    const res = await runCli(['--version']);
    expect(res.code).toBe(0);
    expect(res.stdout.trim()).not.toBe('');
  });
});
