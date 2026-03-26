import type { Diagnostic } from '../diagnosticTypes.js';
import type { PlacedNamedSectionContribution } from './sectionPlacement.js';
import type { SectionKind } from './loweringTypes.js';
import type {
  LoweredAsmBlock,
  LoweredAsmProgram,
  LoweredAsmStream,
  LoweredAsmStreamBlock,
} from './loweredAsmTypes.js';

export type LoweredAsmPlacementContext = {
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  primaryFile: string;
  baseAddresses: {
    codeBase: number;
    dataBase: number;
    varBase: number;
  };
  namedSectionOrigins: Map<string, number>;
};

export function collectNamedSectionOrigins(
  contributions: PlacedNamedSectionContribution[],
): Map<string, number> {
  const origins = new Map<string, number>();
  for (const placed of contributions) {
    const key = `${placed.sink.anchor.key.section}:${placed.sink.anchor.key.name}:${placed.sink.contribution.order}`;
    origins.set(key, placed.baseAddress);
  }
  return origins;
}

function baseOriginForSection(section: SectionKind, baseAddresses: LoweredAsmPlacementContext['baseAddresses']): number {
  switch (section) {
    case 'code':
      return baseAddresses.codeBase;
    case 'data':
      return baseAddresses.dataBase;
    case 'var':
      return baseAddresses.varBase;
  }
}

function resolveBlockOrigin(
  block: LoweredAsmStreamBlock,
  ctx: LoweredAsmPlacementContext,
): number {
  if (block.kind === 'base') {
    return baseOriginForSection(block.section, ctx.baseAddresses);
  }
  const key = `${block.section}:${block.name ?? ''}:${block.contributionOrder ?? 'unknown'}`;
  const origin = ctx.namedSectionOrigins.get(key);
  if (origin !== undefined) return origin;
  ctx.diag(
    ctx.diagnostics,
    ctx.primaryFile,
    `Failed to resolve placed base address for named section "${block.section} ${block.name ?? ''}".`,
  );
  return 0;
}

export function placeLoweredAsmStream(
  stream: LoweredAsmStream,
  ctx: LoweredAsmPlacementContext,
): LoweredAsmProgram {
  const blocks: LoweredAsmBlock[] = [];
  for (const block of stream.blocks) {
    blocks.push({
      kind: 'section',
      origin: resolveBlockOrigin(block, ctx),
      section: block.section,
      ...(block.name ? { name: block.name } : {}),
      ...(block.contributionOrder !== undefined ? { contributionOrder: block.contributionOrder } : {}),
      items: block.items,
    });
  }
  return { blocks };
}
