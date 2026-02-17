import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const normalizeAsm = (text: string): string => text.replace(/\r\n/g, '\n').trimEnd();

describe('PR307: baseline expected-trace harness', () => {
  it('matches expected v0.2 asm trace for baseline args+locals example and stays deterministic', async () => {
    const entry = join(
      __dirname,
      '..',
      'examples',
      'language-tour',
      '00_call_with_arg_and_local_baseline.zax',
    );
    const expectedPath = join(
      __dirname,
      '..',
      'examples',
      'language-tour',
      '00_call_with_arg_and_local_baseline.expected-v02.asm',
    );
    const expected = await readFile(expectedPath, 'utf8');

    const first = await compile(
      entry,
      {
        emitBin: false,
        emitHex: false,
        emitD8m: false,
        emitListing: false,
        emitAsm: true,
        defaultCodeBase: 0x0100,
      },
      { formats: defaultFormatWriters },
    );
    expect(first.diagnostics).toEqual([]);
    const asmFirst = first.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asmFirst).toBeDefined();
    expect(normalizeAsm(asmFirst!.text)).toBe(normalizeAsm(expected));

    const second = await compile(
      entry,
      {
        emitBin: false,
        emitHex: false,
        emitD8m: false,
        emitListing: false,
        emitAsm: true,
        defaultCodeBase: 0x0100,
      },
      { formats: defaultFormatWriters },
    );
    expect(second.diagnostics).toEqual([]);
    const asmSecond = second.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asmSecond).toBeDefined();
    expect(normalizeAsm(asmSecond!.text)).toBe(normalizeAsm(asmFirst!.text));
  });
});
