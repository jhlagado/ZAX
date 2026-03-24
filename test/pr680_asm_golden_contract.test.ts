import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { Asm80Artifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CorpusEntry = {
  name: string;
  source: string;
  kind: string;
};

type CorpusManifest = {
  curatedCases: CorpusEntry[];
  negativeCases: CorpusEntry[];
  goldenZ80Dir: string;
  opcodeHexDir: string;
  mirrorDir: string;
};

type LineMismatch = {
  lineNumber: number;
  expectedLine: string | undefined;
  actualLine: string | undefined;
};

async function readManifest(): Promise<CorpusManifest> {
  const path = join(__dirname, 'fixtures', 'corpus', 'manifest.json');
  return JSON.parse(await readFile(path, 'utf8')) as CorpusManifest;
}

function splitAsmLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function findFirstLineMismatch(expected: string, actual: string): LineMismatch | undefined {
  const expectedLines = splitAsmLines(expected);
  const actualLines = splitAsmLines(actual);
  const max = Math.max(expectedLines.length, actualLines.length);
  for (let i = 0; i < max; i += 1) {
    if (expectedLines[i] !== actualLines[i]) {
      return {
        lineNumber: i + 1,
        expectedLine: expectedLines[i],
        actualLine: actualLines[i],
      };
    }
  }
  return undefined;
}

function formatMismatch(caseName: string, mismatch: LineMismatch): string {
  const expectedLine = mismatch.expectedLine ?? '<missing>';
  const actualLine = mismatch.actualLine ?? '<missing>';
  return [
    `.z80 golden mismatch for "${caseName}" at line ${mismatch.lineNumber}.`,
    `expected: ${JSON.stringify(expectedLine)}`,
    `actual:   ${JSON.stringify(actualLine)}`,
    'Refresh fixtures with: npm run regen:codegen-corpus',
  ].join('\n');
}

describe('PR680: asm80 golden contract coverage for curated corpus', () => {
  it('matches emitted asm80 to checked-in corpus goldens with clear mismatch output', async () => {
    const manifest = await readManifest();

    for (const entry of manifest.curatedCases) {
      const sourcePath = join(__dirname, '..', entry.source);
      const expectedZ80Path = join(__dirname, '..', manifest.goldenZ80Dir, `${entry.name}.z80`);
      const expectedZ80 = await readFile(expectedZ80Path, 'utf8');

      const result = await compile(
        sourcePath,
        {
          emitBin: false,
          emitHex: false,
          emitD8m: false,
          emitListing: false,
          emitAsm80: true,
        },
        { formats: defaultFormatWriters },
      );
      expect(result.diagnostics).toEqual([]);

      const asm80 = result.artifacts.find(
        (artifact): artifact is Asm80Artifact => artifact.kind === 'asm80',
      );
      expect(asm80).toBeDefined();

      const mismatch = findFirstLineMismatch(expectedZ80, asm80!.text);
      if (mismatch) {
        throw new Error(formatMismatch(entry.name, mismatch));
      }
    }
  });
});
