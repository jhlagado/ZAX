import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR1 minimal end-to-end', () => {
  it('emits bin/hex/d8m for a minimal file', async () => {
    const entry = join(__dirname, 'fixtures', 'pr1_minimal.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expect(res.diagnostics).toEqual([]);

    const bin = res.artifacts.find((a) => a.kind === 'bin');
    const hex = res.artifacts.find((a) => a.kind === 'hex');
    const d8m = res.artifacts.find((a) => a.kind === 'd8m');
    expect(bin && hex && d8m).toBeTruthy();

    expect((bin as any).bytes).toEqual(Uint8Array.of(0x00, 0x3e, 0x2a, 0xc3, 0x34, 0x12, 0xc9));
    expect((hex as any).text).toContain(':07000000003E2AC33412C9BF');

    expect((d8m as any).json.format).toBe('d8-debug-map');
    expect((d8m as any).json.version).toBe(1);
    expect((d8m as any).json.arch).toBe('z80');
  });
});
