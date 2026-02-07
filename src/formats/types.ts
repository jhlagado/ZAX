export interface AddressRange {
  start: number; // inclusive
  end: number; // exclusive
}

export interface EmittedByteMap {
  // Address -> byte (0..255). Addresses are 0..65535 for Z80.
  bytes: Map<number, number>;
  writtenRange?: AddressRange;
}

export interface SymbolKind {
  kind: 'label' | 'constant' | 'data' | 'unknown';
}

export interface SymbolEntry extends SymbolKind {
  name: string;
  address: number;
  file?: string;
  line?: number;
  scope?: 'global' | 'local';
  size?: number;
}

export interface WriteHexOptions {
  // v0.1: for Intel HEX record size, line endings, etc (implementation-defined)
  lineEnding?: '\n' | '\r\n';
}

export interface WriteBinOptions {}

export interface WriteD8mOptions {}

export interface HexArtifact {
  kind: 'hex';
  path?: string;
  text: string;
}

export interface BinArtifact {
  kind: 'bin';
  path?: string;
  bytes: Uint8Array;
}

export interface ListingArtifact {
  kind: 'lst';
  path?: string;
  text: string;
}

export interface D8mArtifact {
  kind: 'd8m';
  path?: string;
  json: unknown;
}

export type Artifact = HexArtifact | BinArtifact | ListingArtifact | D8mArtifact;

export interface FormatWriters {
  writeHex(map: EmittedByteMap, symbols: SymbolEntry[], opts?: WriteHexOptions): HexArtifact;
  writeBin(map: EmittedByteMap, symbols: SymbolEntry[], opts?: WriteBinOptions): BinArtifact;
  writeD8m(map: EmittedByteMap, symbols: SymbolEntry[], opts?: WriteD8mOptions): D8mArtifact;
  writeListing?(
    map: EmittedByteMap,
    symbols: SymbolEntry[],
    opts?: Record<string, unknown>,
  ): ListingArtifact;
}

