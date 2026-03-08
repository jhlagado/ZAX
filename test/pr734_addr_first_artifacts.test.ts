import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact, D8mArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const addrFirstExamples = [
  '00_call_with_arg_and_local_baseline',
  '01_args_locals_basics',
  '02_fibonacci_args_locals',
  '14_ops_and_calls',
] as const;

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

describe('PR734: addr-first language-tour artifacts stay locked', () => {
  for (const stem of addrFirstExamples) {
    it(`${stem} matches checked-in asm and d8dbg after the addr-first migration`, async () => {
      const entry = join(__dirname, '..', 'examples', 'language-tour', `${stem}.zax`);
      const asmPath = join(__dirname, '..', 'examples', 'language-tour', `${stem}.asm`);
      const d8Path = join(__dirname, '..', 'examples', 'language-tour', `${stem}.d8dbg.json`);

      const [expectedAsm, expectedD8Text] = await Promise.all([
        readFile(asmPath, 'utf8'),
        readFile(d8Path, 'utf8'),
      ]);

      const result = await compile(
        entry,
        {
          emitBin: false,
          emitHex: false,
          emitD8m: true,
          emitListing: false,
          emitAsm: true,
          defaultCodeBase: 0x0100,
        },
        { formats: defaultFormatWriters },
      );

      expect(result.diagnostics).toEqual([]);

      const asm = result.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
      const d8m = result.artifacts.find((a): a is D8mArtifact => a.kind === 'd8m');

      expect(asm).toBeDefined();
      expect(d8m).toBeDefined();
      expect(canonicalProgramAsm(asm!.text)).toBe(canonicalProgramAsm(expectedAsm));
      expect(d8m!.json).toEqual(JSON.parse(expectedD8Text));
    });
  }
});
