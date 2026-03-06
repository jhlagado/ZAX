import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

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
  goldenAsmDir: string;
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
    `ASM golden mismatch for "${caseName}" at line ${mismatch.lineNumber}.`,
    `expected: ${JSON.stringify(expectedLine)}`,
    `actual:   ${JSON.stringify(actualLine)}`,
    'Refresh fixtures with: npm run regen:codegen-corpus',
  ].join('\n');
}

describe('PR680: asm golden contract coverage for curated corpus', () => {
  it('matches emitted asm to checked-in corpus goldens with clear mismatch output', async () => {
    const manifest = await readManifest();

    for (const entry of manifest.curatedCases) {
      const sourcePath = join(__dirname, '..', entry.source);
      const expectedAsmPath = join(__dirname, '..', manifest.goldenAsmDir, `${entry.name}.asm`);
      const expectedAsm = await readFile(expectedAsmPath, 'utf8');

      const result = await compile(
        sourcePath,
        {
          emitBin: false,
          emitHex: false,
          emitD8m: false,
          emitListing: false,
          emitAsm: true,
        },
        { formats: defaultFormatWriters },
      );
      expect(result.diagnostics).toEqual([]);

      const asm = result.artifacts.find((artifact): artifact is AsmArtifact => artifact.kind === 'asm');
      expect(asm).toBeDefined();

      const mismatch = findFirstLineMismatch(expectedAsm, asm!.text);
      if (mismatch) {
        throw new Error(formatMismatch(entry.name, mismatch));
      }
    }
  });
});
