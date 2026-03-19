import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact, BinArtifact } from '../src/formats/types.js';
import { parseProgram } from '../src/frontend/parser.js';
import type { Diagnostic } from '../src/diagnostics/types.js';

const indexOfSubarray = (haystack: number[], needle: number[]): number => {
  if (needle.length === 0) return 0;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
};

describe('PR922: parenthesized imm indirection and backslash separators', () => {
  it('lowers parenthesized imm expressions as absolute memory indirection', async () => {
    const entry = join(__dirname, 'fixtures', 'pr922_paren_imm_indirection.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: true, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    const bytes = Array.from(bin!.bytes);
    expect(indexOfSubarray(bytes, [0x3a, 0x05, 0x00])).toBeGreaterThanOrEqual(0);
    expect(indexOfSubarray(bytes, [0x3a, 0x01, 0x40])).toBeGreaterThanOrEqual(0);
    expect(indexOfSubarray(bytes, [0x3e, 0x06])).toBeGreaterThanOrEqual(0);
  });

  it('splits statements on backslash separators', async () => {
    const entry = join(__dirname, 'fixtures', 'pr922_backslash_separator.zax');
    const res = await compile(
      entry,
      { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const text = asm!.text.toUpperCase();
    expect(text).toContain('OR A');
    expect(text).toMatch(/JR\s+NZ,?\s+DONE/);
  });

  it('diagnoses a trailing backslash separator', () => {
    const diagnostics: Diagnostic[] = [];
    parseProgram(
      'pr922_backslash_trailing.zax',
      ['export func main()', '  ld a, 1 \\', 'end', ''].join('\n'),
      diagnostics,
    );
    expect(diagnostics.some((d) => d.message.includes('Trailing backslash must be followed'))).toBe(true);
  });
});
