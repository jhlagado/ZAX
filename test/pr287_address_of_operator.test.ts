import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

type MaybeAsm = AsmArtifact | undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR287 explicit address-of operator (@place)', () => {
  it('accepts @place and preserves explicit address intent in lowering', async () => {
    const entry = join(__dirname, 'fixtures', 'pr287_address_of_positive.zax');
    const res = await compile(
      entry,
      { emitBin: false, emitHex: false, emitD8m: false, emitListing: false, emitAsm: true },
      { formats: defaultFormatWriters },
    );

    const errors = res.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm') as MaybeAsm;
    expect(asm).toBeDefined();

    const text = asm!.text;
    expect(text).toContain('call accept');
    expect(text).toContain('ld HL, b');
    expect(text).not.toContain('ld A, (b)');
  });

  it('rejects invalid @ targets with stable diagnostics', async () => {
    const entry = join(__dirname, 'fixtures', 'pr287_address_of_invalid_targets_negative.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages.filter((m) => m.includes('Invalid address-of target')).length).toBe(3);
    expect(messages).toContain('Invalid address-of target "@": expected @<place>.');
    expect(messages).toContain('Invalid address-of target "@(3 + 2)": expected @<place>.');
    expect(messages).toContain('Invalid address-of target "@3": expected @<place>.');
  });
});
