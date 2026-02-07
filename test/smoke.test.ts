import { describe, expect, it } from 'vitest';

import { compile } from '../src/pipeline.js';

describe('smoke', () => {
  it('compile() returns a result object', async () => {
    const result = await compile('entry.zax', {}, { formats: {} as any });
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('artifacts');
  });
});

