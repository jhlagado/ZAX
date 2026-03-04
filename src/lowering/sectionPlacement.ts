import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import type { SymbolEntry } from '../formats/types.js';
import type { CompileEnv } from '../semantics/env.js';
import type { ImmExprNode } from '../frontend/ast.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';

export type PlacedNamedSectionContribution = {
  sink: NamedSectionContributionSink;
  baseAddress: number;
};

export type PlacedNamedSectionRegion = {
  keyId: string;
  section: 'code' | 'data';
  name: string;
  baseAddress: number;
  totalSize: number;
  endAddress: number | undefined;
  contributions: PlacedNamedSectionContribution[];
};

type Context = {
  diagnostics: Diagnostic[];
  env: CompileEnv;
  evalImmExpr: (expr: ImmExprNode, env: CompileEnv, diagnostics: Diagnostic[]) => number | undefined;
};

function diagAt(
  diagnostics: Diagnostic[],
  file: string,
  line: number,
  column: number,
  message: string,
): void {
  diagnostics.push({
    id: DiagnosticIds.EmitError,
    severity: 'error',
    file,
    line,
    column,
    message,
  });
}

function toHexWord(value: number): string {
  return `$${(value & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}

function startOf(sink: NamedSectionContributionSink): { file: string; line: number; column: number } {
  return {
    file: sink.anchor.node.span.file,
    line: sink.anchor.node.span.start.line,
    column: sink.anchor.node.span.start.column,
  };
}

function formatKey(sink: NamedSectionContributionSink): string {
  return `${sink.anchor.key.section} ${sink.anchor.key.name}`;
}

function evaluateAnchorBase(ctx: Context, sink: NamedSectionContributionSink): number | undefined {
  const anchor = sink.anchor.node.anchor;
  if (!anchor) return undefined;
  const at = ctx.evalImmExpr(anchor.at, ctx.env, ctx.diagnostics);
  if (at === undefined) {
    const where = startOf(sink);
    diagAt(
      ctx.diagnostics,
      where.file,
      where.line,
      where.column,
      `Failed to evaluate anchor base for section "${formatKey(sink)}".`,
    );
    return undefined;
  }
  if (at < 0 || at > 0xffff) {
    const where = startOf(sink);
    diagAt(
      ctx.diagnostics,
      where.file,
      where.line,
      where.column,
      `Anchor base out of range for section "${formatKey(sink)}": ${at}.`,
    );
    return undefined;
  }
  return at;
}

function evaluateCapacity(
  ctx: Context,
  sink: NamedSectionContributionSink,
  baseAddress: number,
): number | undefined {
  const anchor = sink.anchor.node.anchor;
  if (!anchor) return undefined;
  if (anchor.size) {
    const size = ctx.evalImmExpr(anchor.size, ctx.env, ctx.diagnostics);
    if (size === undefined) {
      const where = startOf(sink);
      diagAt(
        ctx.diagnostics,
        where.file,
        where.line,
        where.column,
        `Failed to evaluate anchor size for section "${formatKey(sink)}".`,
      );
      return undefined;
    }
    if (size < 0) {
      const where = startOf(sink);
      diagAt(
        ctx.diagnostics,
        where.file,
        where.line,
        where.column,
        `Anchor size must be non-negative for section "${formatKey(sink)}".`,
      );
      return undefined;
    }
    return size;
  }
  if (anchor.end) {
    const end = ctx.evalImmExpr(anchor.end, ctx.env, ctx.diagnostics);
    if (end === undefined) {
      const where = startOf(sink);
      diagAt(
        ctx.diagnostics,
        where.file,
        where.line,
        where.column,
        `Failed to evaluate anchor end for section "${formatKey(sink)}".`,
      );
      return undefined;
    }
    if (end < baseAddress) {
      const where = startOf(sink);
      diagAt(
        ctx.diagnostics,
        where.file,
        where.line,
        where.column,
        `Anchor end must be greater than or equal to the base for section "${formatKey(sink)}".`,
      );
      return undefined;
    }
    if (end > 0xffff) {
      const where = startOf(sink);
      diagAt(
        ctx.diagnostics,
        where.file,
        where.line,
        where.column,
        `Anchor end out of range for section "${formatKey(sink)}": ${end}.`,
      );
      return undefined;
    }
    return end - baseAddress + 1;
  }
  return undefined;
}

export function placeNonBankedSectionContributions(
  sinks: NamedSectionContributionSink[],
  ctx: Context,
): { placedRegions: PlacedNamedSectionRegion[]; placedContributions: PlacedNamedSectionContribution[] } {
  const placedRegions: PlacedNamedSectionRegion[] = [];
  const placedContributions: PlacedNamedSectionContribution[] = [];
  const regionsByKey = new Map<string, PlacedNamedSectionRegion>();

  for (const sink of sinks) {
    let region = regionsByKey.get(sink.anchor.keyId);
    if (!region) {
      const baseAddress = evaluateAnchorBase(ctx, sink);
      if (baseAddress === undefined) continue;
      region = {
        keyId: sink.anchor.keyId,
        section: sink.anchor.key.section,
        name: sink.anchor.key.name,
        baseAddress,
        totalSize: 0,
        endAddress: undefined,
        contributions: [],
      };
      regionsByKey.set(sink.anchor.keyId, region);
      placedRegions.push(region);
    }

    const placed: PlacedNamedSectionContribution = {
      sink,
      baseAddress: region.baseAddress + region.totalSize,
    };
    region.contributions.push(placed);
    placedContributions.push(placed);
    region.totalSize += sink.offset;
  }

  for (const region of placedRegions) {
    if (region.totalSize > 0) {
      region.endAddress = region.baseAddress + region.totalSize - 1;
      if (region.endAddress > 0xffff) {
        const where = startOf(region.contributions[0]!.sink);
        diagAt(
          ctx.diagnostics,
          where.file,
          where.line,
          where.column,
          `Section "${region.section} ${region.name}" exceeds the 16-bit address space.`,
        );
      }
    }

    const capacity = evaluateCapacity(ctx, region.contributions[0]!.sink, region.baseAddress);
    if (capacity !== undefined && region.totalSize > capacity) {
      const where = startOf(region.contributions[0]!.sink);
      diagAt(
        ctx.diagnostics,
        where.file,
        where.line,
        where.column,
        `Section "${region.section} ${region.name}" exceeds its anchored capacity (${region.totalSize} > ${capacity}).`,
      );
    }
  }

  for (let i = 0; i < placedRegions.length; i++) {
    const left = placedRegions[i]!;
    if (left.endAddress === undefined) continue;
    for (let j = i + 1; j < placedRegions.length; j++) {
      const right = placedRegions[j]!;
      if (right.endAddress === undefined) continue;
      if (left.endAddress < right.baseAddress || right.endAddress < left.baseAddress) continue;
      const where = startOf(left.contributions[0]!.sink);
      diagAt(
        ctx.diagnostics,
        where.file,
        where.line,
        where.column,
        `Anchored sections overlap: "${left.section} ${left.name}" (${toHexWord(left.baseAddress)}..${toHexWord(
          left.endAddress,
        )}) and "${right.section} ${right.name}" (${toHexWord(right.baseAddress)}..${toHexWord(
          right.endAddress,
        )}).`,
      );
    }
  }

  return { placedRegions, placedContributions };
}

export function collectPlacedNamedSectionSymbols(
  placedContributions: PlacedNamedSectionContribution[],
  diagnostics: Diagnostic[],
): SymbolEntry[] {
  const symbols: SymbolEntry[] = [];

  for (const placed of placedContributions) {
    for (const pending of placed.sink.pendingSymbols) {
      const address = placed.baseAddress + pending.offset;
      if (address < 0 || address > 0xffff) {
        const where = startOf(placed.sink);
        diagAt(
          diagnostics,
          where.file,
          where.line,
          where.column,
          `Named section symbol "${pending.name}" resolves out of range in section "${formatKey(placed.sink)}".`,
        );
        continue;
      }
      symbols.push({
        kind: pending.kind,
        name: pending.name,
        address,
        ...(pending.file !== undefined ? { file: pending.file } : {}),
        ...(pending.line !== undefined ? { line: pending.line } : {}),
        ...(pending.scope !== undefined ? { scope: pending.scope } : {}),
        ...(pending.size !== undefined ? { size: pending.size } : {}),
      });
    }
  }

  return symbols;
}

export function resolvePlacedNamedSectionFixups(
  placedContributions: PlacedNamedSectionContribution[],
  diagnostics: Diagnostic[],
  bytes: Map<number, number>,
  symbols: SymbolEntry[],
): void {
  const addrByNameLower = new Map<string, number>();
  for (const sym of symbols) {
    if (sym.kind === 'constant' || sym.address === undefined) continue;
    addrByNameLower.set(sym.name.toLowerCase(), sym.address);
  }

  for (const placed of placedContributions) {
    const sink = placed.sink;

    for (const fx of sink.fixups) {
      const base = addrByNameLower.get(fx.baseLower);
      const addr = base === undefined ? undefined : base + fx.addend;
      if (addr === undefined) {
        const where = startOf(sink);
        diagAt(
          diagnostics,
          where.file,
          where.line,
          where.column,
          `Unresolved symbol "${fx.baseLower}" in named-section 16-bit fixup.`,
        );
        continue;
      }
      if (addr < 0 || addr > 0xffff) {
        const where = startOf(sink);
        diagAt(
          diagnostics,
          where.file,
          where.line,
          where.column,
          `Named-section 16-bit fixup address out of range for "${fx.baseLower}" with addend ${fx.addend}: ${addr}.`,
        );
        continue;
      }
      const patch = placed.baseAddress + fx.offset;
      bytes.set(patch, addr & 0xff);
      bytes.set(patch + 1, (addr >> 8) & 0xff);
    }

    for (const fx of sink.rel8Fixups) {
      const base = addrByNameLower.get(fx.baseLower);
      const target = base === undefined ? undefined : base + fx.addend;
      if (target === undefined) {
        const where = startOf(sink);
        diagAt(
          diagnostics,
          where.file,
          where.line,
          where.column,
          `Unresolved symbol "${fx.baseLower}" in named-section rel8 ${fx.mnemonic} fixup.`,
        );
        continue;
      }
      const origin = placed.baseAddress + fx.origin;
      const disp = target - origin;
      if (disp < -128 || disp > 127) {
        const where = startOf(sink);
        diagAt(
          diagnostics,
          where.file,
          where.line,
          where.column,
          `Named-section ${fx.mnemonic} target out of range for rel8 branch (${disp}, expected -128..127).`,
        );
        continue;
      }
      bytes.set(placed.baseAddress + fx.offset, disp & 0xff);
    }
  }
}
