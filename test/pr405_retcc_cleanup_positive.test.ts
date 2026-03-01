import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR405: ret cc cleanup positive coverage', () => {
  it('rewrites conditional returns through a synthetic epilogue when locals require cleanup', async () => {
    const entry = join(__dirname, 'fixtures', 'pr222_locals_multiple_retcc.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();

    expect(text).toContain('JP NZ, __ZAX_EPILOGUE_0');
    expect(text).toContain('JP Z, __ZAX_EPILOGUE_0');
    expect((text.match(/__ZAX_EPILOGUE_0:/g) ?? []).length).toBe(1);
    expect(text).toContain('__ZAX_EPILOGUE_0:');
    expect(text).toContain('RET');
  });
});
