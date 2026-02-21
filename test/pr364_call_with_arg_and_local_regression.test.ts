import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

function canonicalProgramAsm(text: string): string {
  const out: string[] = [];
  const canonicalizeIxIyDisp = (input: string): string =>
    input.replace(
      /\(\s*(IX|IY)\s*([+-])\s*\$([0-9A-F]{1,4})\s*\)/gi,
      (_m, base: string, sign: string, hex: string) => {
        const value = Number.parseInt(hex, 16) & 0xff;
        return `(${base.toUpperCase()}${sign}$${value.toString(16).toUpperCase().padStart(2, '0')})`;
      },
    );
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith(';')) continue;
    if (line.toLowerCase() === '; symbols:') continue;
    if (/^; (label|var|data|constant)\b/i.test(line)) continue;
    if (line.endsWith(':')) {
      out.push(line.toUpperCase());
      continue;
    }
    const noTraceComment = line.replace(/\s*;\s*[0-9A-F]{4}:\s+[0-9A-F ]+\s*$/i, '');
    const noInlineComment = noTraceComment.replace(/\s*;.*/, '');
    const normalized = canonicalizeIxIyDisp(noInlineComment.replace(/\s+/g, ' ').trim());
    if (!normalized) continue;
    out.push(normalized.toUpperCase());
  }
  return out.join('\n');
}

describe('PR364: baseline arg/local lowering regression guard', () => {
  it('matches handcrafted asm for call-with-arg-and-local baseline', async () => {
    const entry = join(__dirname, 'fixtures', 'pr364_call_with_arg_and_local.zax');
    const expectedPath = join(__dirname, 'fixtures', 'pr364_call_with_arg_and_local.expected.asm');
    const expected = await readFile(expectedPath, 'utf8');

    const result = await compile(
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
    expect(result.diagnostics).toEqual([]);

    const asm = result.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();

    expect(canonicalProgramAsm(asm!.text)).toBe(canonicalProgramAsm(expected));
  });
});
