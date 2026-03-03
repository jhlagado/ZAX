import type { EmittedAsmTraceEntry, EmittedSourceSegment } from '../formats/types.js';
import type { SourceSegmentTag } from './loweringTypes.js';
import type {
  NonBankedSectionKeyCollection,
  SectionAnchorRecord,
  SectionContributionRecord,
} from '../sectionKeys.js';

export type AbsoluteFixupRecord = {
  offset: number;
  baseLower: string;
  addend: number;
  file: string;
};

export type Rel8FixupRecord = {
  offset: number;
  origin: number;
  baseLower: string;
  addend: number;
  file: string;
  mnemonic: string;
};

export type NamedSectionContributionSink = {
  contribution: SectionContributionRecord;
  anchor: SectionAnchorRecord;
  bytes: Map<number, number>;
  offset: number;
  pendingSymbols: Array<{
    name: string;
    kind: 'label' | 'data' | 'var';
    offset: number;
    file?: string;
    line?: number;
    scope?: 'global' | 'local';
    size?: number;
  }>;
  fixups: AbsoluteFixupRecord[];
  rel8Fixups: Rel8FixupRecord[];
  sourceSegments: EmittedSourceSegment[];
  asmTrace: EmittedAsmTraceEntry[];
  currentSourceTag?: SourceSegmentTag;
};

export function createNamedSectionContributionSinks(
  collected: NonBankedSectionKeyCollection,
): NamedSectionContributionSink[] {
  const sinks: NamedSectionContributionSink[] = [];

  for (const contribution of collected.orderedContributions) {
    const anchor = collected.anchorsByKey.get(contribution.keyId);
    if (!anchor) continue;
    sinks.push({
      contribution,
      anchor,
      bytes: new Map(),
      offset: 0,
      pendingSymbols: [],
      fixups: [],
      rel8Fixups: [],
      sourceSegments: [],
      asmTrace: [],
    });
  }

  return sinks;
}
