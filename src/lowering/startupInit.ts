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

export const STARTUP_ENTRY_LABEL = '__zax_startup';

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

  if (copyEntries.length === 0 && zeroEntries.length === 0) {
    return { copyEntries, zeroEntries, blob, encoded: [] };
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

export function buildStartupInitRoutine(
  initRegionAddress: number,
  region: StartupInitRegion,
  mainAddress: number,
): number[] {
  const bytes: number[] = [];
  const labels = new Map<string, number>();
  const relPatches: Array<{ index: number; origin: number; label: string }> = [];
  const blobBase = initRegionAddress + (region.encoded.length - region.blob.length);

  const emit = (...values: number[]) => {
    bytes.push(...values.map((value) => value & 0xff));
  };
  const mark = (label: string) => {
    labels.set(label, bytes.length);
  };
  const emitWord = (value: number) => {
    emit(value & 0xff, (value >> 8) & 0xff);
  };
  const emitLdHlImm = (value: number) => {
    emit(0x21);
    emitWord(value);
  };
  const emitJr = (opcode: number, label: string) => {
    emit(opcode, 0x00);
    relPatches.push({ index: bytes.length - 1, origin: bytes.length, label });
  };

  emitLdHlImm(initRegionAddress);
  emit(0x4e, 0x23, 0x46, 0x23); // ld c,(hl) / inc hl / ld b,(hl) / inc hl

  mark('copy_count_test');
  emit(0x78, 0xb1); // ld a,b / or c
  emitJr(0x28, 'load_zero_count');

  emit(0xc5); // push bc
  emit(0x5e, 0x23, 0x56, 0x23); // ld e,(hl) / inc hl / ld d,(hl) / inc hl
  emit(0x4e, 0x23, 0x46, 0x23); // ld c,(hl) / inc hl / ld b,(hl) / inc hl
  emit(0xe5); // push hl
  emitLdHlImm(blobBase);
  emit(0x09, 0xe3); // add hl,bc / ex (sp),hl
  emit(0x4e, 0x23, 0x46, 0x23); // ld c,(hl) / inc hl / ld b,(hl) / inc hl
  emit(0xe3); // ex (sp),hl
  emit(0xed, 0xb0); // ldir
  emit(0xe1, 0xc1, 0x0b); // pop hl / pop bc / dec bc
  emitJr(0x18, 'copy_count_test');

  mark('load_zero_count');
  emit(0x4e, 0x23, 0x46, 0x23); // ld c,(hl) / inc hl / ld b,(hl) / inc hl

  mark('zero_count_test');
  emit(0x78, 0xb1); // ld a,b / or c
  emitJr(0x28, 'jump_main');

  emit(0xc5); // push bc
  emit(0x5e, 0x23, 0x56, 0x23); // ld e,(hl) / inc hl / ld d,(hl) / inc hl
  emit(0x4e, 0x23, 0x46, 0x23); // ld c,(hl) / inc hl / ld b,(hl) / inc hl

  mark('zero_bytes_test');
  emit(0x78, 0xb1); // ld a,b / or c
  emitJr(0x28, 'zero_done');
  emit(0xaf, 0x12, 0x13, 0x0b); // xor a / ld (de),a / inc de / dec bc
  emitJr(0x18, 'zero_bytes_test');

  mark('zero_done');
  emit(0xc1, 0x0b); // pop bc / dec bc
  emitJr(0x18, 'zero_count_test');

  mark('jump_main');
  emit(0xc3);
  emitWord(mainAddress);

  for (const patch of relPatches) {
    const target = labels.get(patch.label);
    if (target === undefined) {
      throw new Error(`Unknown startup routine label "${patch.label}".`);
    }
    const displacement = target - patch.origin;
    if (displacement < -128 || displacement > 127) {
      throw new Error(`Startup routine jump out of range for "${patch.label}".`);
    }
    bytes[patch.index] = displacement & 0xff;
  }

  return bytes;
}
