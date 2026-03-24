import type { Diagnostic } from '../diagnostics/types.js';
import type { EmittedByteMap, EmittedSourceSegment, SymbolEntry } from '../formats/types.js';
import type { SourceSpan } from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import {
  finalizeProgramEmission,
  type FinalizationContext,
} from './programLowering.js';
import { computeSectionBases } from './programLoweringFinalize.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';
import {
  collectPlacedNamedSectionSymbols,
  placeNonBankedSectionContributions,
  resolvePlacedNamedSectionFixups,
} from './sectionPlacement.js';
import {
  collectNamedSectionOrigins,
  placeLoweredAsmStream,
} from './loweredAsmPlacement.js';
import {
  emitLoweredAsmBlockBytes,
  emitLoweredAsmProgramBytes,
} from './loweredAsmByteEmission.js';
import {
  buildStartupInitRegion,
  buildStartupInitRoutine,
  STARTUP_ENTRY_LABEL,
} from './startupInit.js';
import type { LoweredAsmProgram, LoweredAsmStream } from './loweredAsmTypes.js';

export type EmitFinalizationContext = {
  namedSectionSinks: NamedSectionContributionSink[];
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  primaryFile: string;
  baseExprs: FinalizationContext['baseExprs'];
  evalImmExpr: FinalizationContext['evalImmExpr'];
  env: CompileEnv;
  loweredAsmStream: LoweredAsmStream;
  codeOffset: number;
  dataOffset: number;
  varOffset: number;
  pending: FinalizationContext['pending'];
  symbols: SymbolEntry[];
  absoluteSymbols: FinalizationContext['absoluteSymbols'];
  deferredExterns: FinalizationContext['deferredExterns'];
  fixups: FinalizationContext['fixups'];
  rel8Fixups: FinalizationContext['rel8Fixups'];
  codeBytes: FinalizationContext['codeBytes'];
  dataBytes: FinalizationContext['dataBytes'];
  hexBytes: FinalizationContext['hexBytes'];
  bytes: Map<number, number>;
  codeSourceSegments: EmittedSourceSegment[];
  alignTo: FinalizationContext['alignTo'];
  writeSection: FinalizationContext['writeSection'];
  computeWrittenRange: FinalizationContext['computeWrittenRange'];
  rebaseCodeSourceSegments: FinalizationContext['rebaseCodeSourceSegments'];
  defaultCodeBase?: number;
};

export function finalizeEmitProgram(context: EmitFinalizationContext): {
  map: EmittedByteMap;
  symbols: SymbolEntry[];
  placedLoweredAsmProgram: LoweredAsmProgram;
} {
  const { placedContributions } = placeNonBankedSectionContributions(context.namedSectionSinks, {
    diagnostics: context.diagnostics,
    env: context.env,
    evalImmExpr: context.evalImmExpr,
  });
  const placedSymbols = collectPlacedNamedSectionSymbols(placedContributions, context.diagnostics);
  context.symbols.push(...placedSymbols);

  const { codeBase, dataBase, varBase } = computeSectionBases(
    {
      baseExprs: context.baseExprs,
      evalImmExpr: context.evalImmExpr,
      env: context.env,
      diagnostics: context.diagnostics,
      diag: context.diag,
      primaryFile: context.primaryFile,
      alignTo: context.alignTo,
      codeOffset: context.codeOffset,
      dataOffset: context.dataOffset,
    },
    context.defaultCodeBase,
    { quiet: true },
  );
  const namedSectionOrigins = collectNamedSectionOrigins(placedContributions);
  const placedProgram = placeLoweredAsmStream(context.loweredAsmStream, {
    diagnostics: context.diagnostics,
    diag: context.diag,
    primaryFile: context.primaryFile,
    baseAddresses: { codeBase, dataBase, varBase },
    namedSectionOrigins,
  });
  const emission = emitLoweredAsmProgramBytes(placedProgram, {
    diagnostics: context.diagnostics,
    diag: context.diag,
    primaryFile: context.primaryFile,
    env: context.env,
  });
  for (const placed of placedContributions) {
    const key = `contrib:${placed.sink.contribution.order}`;
    const replacement = emission.namedBytesByKey.get(key) ?? new Map<number, number>();
    const size = emission.blockSizesByKey.get(key);
    if (size !== undefined && size !== placed.sink.offset) {
      context.diag(
        context.diagnostics,
        context.primaryFile,
        `Lowered named section size mismatch for "${placed.sink.anchor.key.section} ${placed.sink.anchor.key.name}" (${size} vs ${placed.sink.offset}).`,
      );
    }
    placed.sink.bytes = replacement;
  }

  const placedSourceSegments: EmittedSourceSegment[] = [];
  for (const placed of placedContributions) {
    const sink = placed.sink;
    for (const [offset, value] of sink.bytes) {
      const addr = placed.baseAddress + offset;
      if (addr < 0 || addr > 0xffff) {
        context.diagAt(
          context.diagnostics,
          sink.contribution.node.span,
          `Named section byte address out of range for section "${sink.anchor.key.section} ${sink.anchor.key.name}": ${addr}.`,
        );
        continue;
      }
      if (context.bytes.has(addr)) {
        context.diagAt(
          context.diagnostics,
          sink.contribution.node.span,
          `Named section content overlaps emitted bytes at address ${addr}.`,
        );
        continue;
      }
      context.bytes.set(addr, value);
    }
    if (sink.anchor.key.section === 'code') {
      placedSourceSegments.push(
        ...context.rebaseCodeSourceSegments(placed.baseAddress, sink.sourceSegments),
      );
    }
  }

  const { writtenRange, sourceSegments } = finalizeProgramEmission({
    diagnostics: context.diagnostics,
    diag: context.diag,
    primaryFile: context.primaryFile,
    baseExprs: context.baseExprs,
    evalImmExpr: context.evalImmExpr,
    env: context.env,
    codeOffset: context.codeOffset,
    dataOffset: context.dataOffset,
    varOffset: context.varOffset,
    pending: context.pending,
    symbols: context.symbols,
    absoluteSymbols: context.absoluteSymbols,
    deferredExterns: context.deferredExterns,
    fixups: context.fixups,
    rel8Fixups: context.rel8Fixups,
    codeBytes: emission.codeBytes,
    dataBytes: emission.dataBytes,
    hexBytes: context.hexBytes,
    bytes: context.bytes,
    codeSourceSegments: context.codeSourceSegments,
    alignTo: context.alignTo,
    writeSection: context.writeSection,
    computeWrittenRange: context.computeWrittenRange,
    rebaseCodeSourceSegments: context.rebaseCodeSourceSegments,
    ...(context.defaultCodeBase !== undefined
      ? { defaultCodeBase: context.defaultCodeBase }
      : {}),
  });

  resolvePlacedNamedSectionFixups(
    placedContributions,
    context.diagnostics,
    context.bytes,
    context.symbols,
  );

  const mergedSourceSegments = [...placedSourceSegments, ...sourceSegments].sort((a, b) =>
    a.start === b.start ? a.end - b.end : a.start - b.start,
  );

  const startupInitRegion = buildStartupInitRegion(placedContributions);
  let finalWrittenRange = writtenRange;
  if (startupInitRegion.encoded.length > 0) {
    const mainEntry = context.symbols.find(
      (symbol): symbol is SymbolEntry & { kind: 'label' } =>
        symbol.kind === 'label' && symbol.name.toLowerCase() === 'main',
    );
    const literalValues = (values: number[]) =>
      values.map((value) => ({ kind: 'literal' as const, value }));
    const highest = [...context.bytes.keys()].reduce((max, value) => (value > max ? value : max), -1);
    if (!mainEntry) {
      const start = highest + 1;
      const end = start + startupInitRegion.encoded.length - 1;
      if (end > 0xffff) {
        context.diag(
          context.diagnostics,
          context.primaryFile,
          'Compiler-owned startup init region exceeds 16-bit address space.',
        );
      } else {
        const startupBlock = {
          kind: 'absolute' as const,
          origin: start,
          items: [{ kind: 'db' as const, values: literalValues(startupInitRegion.encoded) }],
        };
        placedProgram.blocks.push(startupBlock);
        const emitted = emitLoweredAsmBlockBytes(startupBlock, {
          diagnostics: context.diagnostics,
          diag: context.diag,
          primaryFile: context.primaryFile,
          env: context.env,
        });
        for (const [offset, value] of emitted.bytes) {
          context.bytes.set(start + offset, value);
        }
        finalWrittenRange = { start: writtenRange.start, end: highest + startupInitRegion.encoded.length };
      }
    } else {
      const startupAddress = highest + 1;
      const startupTemplate = buildStartupInitRoutine(0, startupInitRegion, 0);
      const initRegionAddress = startupAddress + startupTemplate.length;
      const startupBytes = buildStartupInitRoutine(initRegionAddress, startupInitRegion, mainEntry.address);
      const startupEnd = startupAddress + startupBytes.length - 1;
      const startupRegionEnd = startupEnd + startupInitRegion.encoded.length;
      if (startupRegionEnd > 0xffff) {
        context.diag(
          context.diagnostics,
          context.primaryFile,
          'Compiler-owned startup routine exceeds 16-bit address space.',
        );
      } else {
        const startupBlock = {
          kind: 'absolute' as const,
          origin: startupAddress,
          items: [
            { kind: 'label' as const, name: STARTUP_ENTRY_LABEL },
            { kind: 'db' as const, values: literalValues(startupBytes) },
            { kind: 'db' as const, values: literalValues(startupInitRegion.encoded) },
          ],
        };
        placedProgram.blocks.push(startupBlock);
        const emitted = emitLoweredAsmBlockBytes(startupBlock, {
          diagnostics: context.diagnostics,
          diag: context.diag,
          primaryFile: context.primaryFile,
          env: context.env,
        });
        for (const [offset, value] of emitted.bytes) {
          context.bytes.set(startupAddress + offset, value);
        }
        context.symbols.push({
          kind: 'label',
          name: STARTUP_ENTRY_LABEL,
          address: startupAddress,
          file: context.primaryFile,
          scope: 'global',
        });
        finalWrittenRange = { start: writtenRange.start, end: startupRegionEnd };
      }
    }
  }

  return {
    map: {
      bytes: context.bytes,
      writtenRange: finalWrittenRange,
      ...(mergedSourceSegments.length > 0 ? { sourceSegments: mergedSourceSegments } : {}),
    },
    symbols: context.symbols,
    placedLoweredAsmProgram: placedProgram,
  };
}
