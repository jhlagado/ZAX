import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';

import type { PlacedNamedSectionContribution } from './sectionPlacement.js';

export type StartupInitEntry = {
  destination: number;
  sourceOffset: number;
  length: number;
};

export type StartupInitRegion = {
  entries: StartupInitEntry[];
  blob: number[];
  encoded: number[];
};

function encodeWord(value: number): [number, number] {
  return [value & 0xff, (value >> 8) & 0xff];
}

export function buildStartupInitRegion(
  placedContributions: PlacedNamedSectionContribution[],
): StartupInitRegion {
  const entries: StartupInitEntry[] = [];
  const blob: number[] = [];

  for (const placed of placedContributions) {
    if (placed.sink.anchor.key.section !== 'data') continue;
    const ordered = [...placed.sink.bytes.entries()].sort((a, b) => a[0] - b[0]);
    if (ordered.length === 0) continue;

    let runStartOffset = ordered[0]![0];
    let runValues: number[] = [ordered[0]![1]];
    for (let i = 1; i < ordered.length; i++) {
      const [offset, value] = ordered[i]!;
      const expectedNext = runStartOffset + runValues.length;
      if (offset === expectedNext) {
        runValues.push(value);
        continue;
      }
      entries.push({
        destination: placed.baseAddress + runStartOffset,
        sourceOffset: blob.length,
        length: runValues.length,
      });
      blob.push(...runValues);
      runStartOffset = offset;
      runValues = [value];
    }
    entries.push({
      destination: placed.baseAddress + runStartOffset,
      sourceOffset: blob.length,
      length: runValues.length,
    });
    blob.push(...runValues);
  }

  const encoded: number[] = [];
  encoded.push(...encodeWord(entries.length));
  for (const entry of entries) {
    encoded.push(...encodeWord(entry.destination));
    encoded.push(...encodeWord(entry.sourceOffset));
    encoded.push(...encodeWord(entry.length));
  }
  encoded.push(...blob);

  return { entries, blob, encoded };
}

export function appendStartupInitRegion(
  bytes: Map<number, number>,
  diagnostics: Diagnostic[],
  file: string,
  region: StartupInitRegion,
): void {
  if (region.encoded.length === 0) return;
  const highest = [...bytes.keys()].reduce((max, value) => (value > max ? value : max), -1);
  const start = highest + 1;
  const end = start + region.encoded.length - 1;
  if (end > 0xffff) {
    diagnostics.push({
      id: DiagnosticIds.EmitError,
      severity: 'error',
      file,
      message: `Compiler-owned startup init region exceeds 16-bit address space.`,
    });
    return;
  }
  for (let i = 0; i < region.encoded.length; i++) {
    bytes.set(start + i, region.encoded[i]!);
  }
}
