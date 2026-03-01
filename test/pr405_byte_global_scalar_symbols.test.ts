import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact, BinArtifact } from '../src/formats/types.js';

describe('PR405: byte global scalar symbols', () => {
  it('accepts bare global byte symbols and lowers A loads/stores through direct scalar forms', async () => {
    const entry = join(__dirname, 'fixtures', 'pr405_byte_global_scalar_symbols.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: true, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();
    expect(text).toContain('LD A, (GLOB_B)');
    expect(text).toContain('LD (GLOB_B), A');
    expect(text).not.toContain('__ZAX_EPILOGUE');

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    expect(bin!.bytes).toEqual(Uint8Array.of(0x3a, 0x00, 0x10, 0x32, 0x00, 0x10, 0xc9));
  });
});
