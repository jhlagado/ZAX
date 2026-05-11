import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { compile } from '../../src/compile.js';
import type { Diagnostic } from '../../src/diagnosticTypes.js';
import { defaultFormatWriters } from '../../src/formats/index.js';
import type { BinArtifact } from '../../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const manifest = {
  source: process.env.TETRO_SOURCE ?? '/Users/johnhardy/Documents/projects/tetro/src/tetro.asm',
};

type ListingRange = {
  start: number;
  end: number;
};

function normalizeExecutableCandidate(candidate: string): string {
  return candidate.includes('/') || candidate.includes('\\') ? resolve(candidate) : candidate;
}

const asm80Candidates = [
  process.env.ASM80,
  process.env.ASM80_PATH,
  '/Users/johnhardy/Documents/projects/debug80/node_modules/.bin/asm80',
  'asm80',
]
  .filter(
    (candidate): candidate is string => candidate !== undefined && candidate.trim().length > 0,
  )
  .map(normalizeExecutableCandidate);
const asm80 = asm80Candidates.find((candidate) => {
  const probe = spawnSync(candidate, ['-h'], { encoding: 'utf8' });
  return !probe.error;
});
const tetroFilesAvailable = existsSync(manifest.source);
const runTetroAcceptance = process.env.ZAX_RUN_TETRO_ACCEPTANCE === '1';
const describeTetro = tetroFilesAvailable && asm80 && runTetroAcceptance ? describe : describe.skip;

function byteHex(value: number | undefined): string {
  return value === undefined ? 'EOF' : `0x${value.toString(16).padStart(2, '0')}`;
}

function offsetHex(offset: number): string {
  return `0x${offset.toString(16).padStart(4, '0')}`;
}

function diagnosticLocation(diagnostic: Diagnostic): string {
  if (diagnostic.line === undefined || diagnostic.column === undefined) return diagnostic.file;
  return `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}`;
}

function summarizeDiagnostics(diagnostics: Diagnostic[], limit = 3): string {
  const preview = diagnostics
    .slice(0, limit)
    .map(
      (diagnostic) =>
        `${diagnosticLocation(diagnostic)}: ${diagnostic.severity} [${diagnostic.id}] ${
          diagnostic.message
        }`,
    );
  return [
    `Diagnostics preview (showing ${preview.length} of ${diagnostics.length}):`,
    ...preview,
  ].join('\n');
}

function findFirstMismatch(actual: Buffer, reference: Buffer): number {
  const maxLength = Math.max(actual.length, reference.length);
  for (let i = 0; i < maxLength; i++) {
    if (actual[i] !== reference[i]) return i;
  }
  return -1;
}

function summarizeBinaryMismatch(actual: Buffer, reference: Buffer): string {
  const firstMismatch = findFirstMismatch(actual, reference);
  const lines = [`Binary length: actual=${actual.length} reference=${reference.length}`];
  if (firstMismatch >= 0) {
    lines.push(
      `First mismatch @${offsetHex(firstMismatch)}: actual=${byteHex(
        actual[firstMismatch],
      )} reference=${byteHex(reference[firstMismatch])}`,
    );
  } else {
    lines.push('First mismatch: none');
  }
  return lines.join('\n');
}

function parseListingWrittenRange(listingPath: string): ListingRange {
  const text = readFileSync(listingPath, 'utf8');
  let start: number | undefined;
  let end = 0;
  for (const line of text.split(/\r?\n/)) {
    const match = /^([0-9A-Fa-f]{4})\s+/.exec(line);
    if (!match) continue;
    const address = Number.parseInt(match[1]!, 16);
    const bytes = line
      .slice(7, 31)
      .trim()
      .split(/\s+/)
      .filter((token) => /^[0-9A-Fa-f]{2}$/.test(token)).length;
    if (bytes === 0) continue;
    start = start === undefined ? address : Math.min(start, address);
    end = Math.max(end, address + bytes);
  }
  return { start: start ?? 0, end };
}

function binaryFromListingRange(bytes: Buffer, range: ListingRange): Buffer {
  if (bytes.length !== 0x10000) return bytes;
  let end = range.end;
  for (let index = bytes.length - 1; index >= range.start; index--) {
    if (bytes[index] !== 0) {
      end = Math.max(end, index + 1);
      break;
    }
  }
  return bytes.subarray(range.start, end);
}

function buildAsm80Reference(source: string): Buffer {
  if (!asm80) throw new Error('asm80 executable not found');
  const outDir = mkdtempSync(join(tmpdir(), 'zax-tetro-asm80-reference-'));
  const sourceRoot = dirname(source);
  const outName = 'tetro-reference.bin';
  const outBin = join(outDir, outName);
  const listing = join(outDir, 'tetro-reference.lst');
  try {
    cpSync(sourceRoot, outDir, { recursive: true });
    const result = spawnSync(asm80, ['-m', 'Z80', '-t', 'bin', '-o', outName, basename(source)], {
      cwd: outDir,
      encoding: 'utf8',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        [`asm80 failed with status ${result.status}`, result.stdout.trim(), result.stderr.trim()]
          .filter((part) => part.length > 0)
          .join('\n'),
      );
    }
    const bytes = readFileSync(outBin);
    const range = parseListingWrittenRange(listing);
    return binaryFromListingRange(bytes, range);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

describeTetro('ASM80 Tetro acceptance', () => {
  it('compiles Tetro and matches a fresh ASM80-built reference binary', async () => {
    const res = await compile(
      manifest.source,
      { emitBin: true, emitHex: false, emitD8m: false, emitListing: false },
      { formats: defaultFormatWriters },
    );
    const errors = res.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) throw new Error(summarizeDiagnostics(res.diagnostics));

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    if (!bin) throw new Error('missing bin artifact');

    const actual = Buffer.from(bin.bytes);
    const expected = buildAsm80Reference(manifest.source);
    const binarySummary = summarizeBinaryMismatch(actual, expected);

    if (actual.length !== expected.length || findFirstMismatch(actual, expected) !== -1) {
      throw new Error(binarySummary);
    }
  });
});

if (runTetroAcceptance && !tetroFilesAvailable) {
  describe('ASM80 Tetro acceptance', () => {
    it('requires the local Tetro source when opt-in acceptance is enabled', () => {
      throw new Error(`Tetro source is unavailable: ${manifest.source}`);
    });
  });
} else if (runTetroAcceptance && !asm80) {
  describe('ASM80 Tetro acceptance', () => {
    it('requires asm80 when opt-in acceptance is enabled', () => {
      throw new Error('asm80 executable is unavailable. Set ASM80 or ASM80_PATH.');
    });
  });
} else if (!tetroFilesAvailable) {
  describe('ASM80 Tetro acceptance', () => {
    it.todo('skipped: local Tetro source is unavailable');
  });
} else if (!asm80) {
  describe('ASM80 Tetro acceptance', () => {
    it.todo('skipped: asm80 executable is unavailable');
  });
} else if (!runTetroAcceptance) {
  describe('ASM80 Tetro acceptance', () => {
    it.todo('set ZAX_RUN_TETRO_ACCEPTANCE=1 to run the local Tetro acceptance check');
  });
}
