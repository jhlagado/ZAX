import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';

import type { PlacedNamedSectionContribution } from './sectionPlacement.js';

export type StartupInitCopyEntry = {
  kind: 'copy';
  destination: number;
  sourceOffset: number;
  length: number;
};

export type StartupInitZeroEntry = {
  kind: 'zero';
  destination: number;
  length: number;
};

export type StartupInitEntry = StartupInitCopyEntry | StartupInitZeroEntry;

export type StartupInitRegion = {
  copyEntries: StartupInitCopyEntry[];
  zeroEntries: StartupInitZeroEntry[];
  blob: number[];
  encoded: number[];
};

function encodeWord(value: number): [number, number] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function isProvisionallyWritableNamedDataContribution(
  placed: PlacedNamedSectionContribution,
): boolean {
  // v0.5 initial implementation rule: treat anchored named data sections as writable
  // until the root-program classification rule is formalized in a later slice.
  return placed.sink.anchor.key.section === 'data';
}

export function buildStartupInitRegion(
  placedContributions: PlacedNamedSectionContribution[],
): StartupInitRegion {
  const copyEntries: StartupInitCopyEntry[] = [];
  const zeroEntries: StartupInitZeroEntry[] = [];
  const blob: number[] = [];

  for (const placed of placedContributions) {
    if (!isProvisionallyWritableNamedDataContribution(placed)) continue;
    for (const action of placed.sink.startupInitActions) {
      if (action.kind === 'zero') {
        zeroEntries.push({
          kind: 'zero',
          destination: placed.baseAddress + action.offset,
          length: action.length,
        });
        continue;
      }
      const chunk: number[] = [];
      for (let i = 0; i < action.length; i++) {
        const value = placed.sink.bytes.get(action.offset + i) ?? 0;
        chunk.push(value);
      }
      copyEntries.push({
        kind: 'copy',
        destination: placed.baseAddress + action.offset,
        sourceOffset: blob.length,
        length: action.length,
      });
      blob.push(...chunk);
    }
  }

  const encoded: number[] = [];
  encoded.push(...encodeWord(copyEntries.length));
  for (const entry of copyEntries) {
    encoded.push(...encodeWord(entry.destination));
    encoded.push(...encodeWord(entry.sourceOffset));
    encoded.push(...encodeWord(entry.length));
  }
  encoded.push(...encodeWord(zeroEntries.length));
  for (const entry of zeroEntries) {
    encoded.push(...encodeWord(entry.destination));
    encoded.push(...encodeWord(entry.length));
  }
  encoded.push(...blob);

  return { copyEntries, zeroEntries, blob, encoded };
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
