import type { BinArtifact, EmittedByteMap, SymbolEntry, WriteBinOptions } from './types.js';
import { getWrittenRange } from './range.js';

const BINFROM_SYMBOL_NAME = '__zax_binfrom';

/**
 * Create a flat binary artifact from an emitted address->byte map.
 *
 * Bytes are emitted for the computed written range; unwritten addresses inside the range are `0x00`.
 */
export function writeBin(
  map: EmittedByteMap,
  symbols: SymbolEntry[],
  opts?: WriteBinOptions,
): BinArtifact {
  const { start: writtenStart, end } = getWrittenRange(map);
  const optionStart =
    (opts as { binFrom?: number; startAddress?: number } | undefined)?.binFrom ??
    (opts as { binFrom?: number; startAddress?: number } | undefined)?.startAddress;
  const symbolStart = symbols.find(
    (symbol) => symbol.kind === 'constant' && symbol.name === BINFROM_SYMBOL_NAME,
  );
  const start =
    optionStart ?? (symbolStart?.kind === 'constant' ? symbolStart.value : writtenStart);
  const out = new Uint8Array(Math.max(0, end - start));
  for (let i = 0; i < out.length; i++) {
    const addr = start + i;
    out[i] = map.bytes.get(addr) ?? 0;
  }
  return { kind: 'bin', bytes: out };
}
