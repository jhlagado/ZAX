import type { Diagnostic } from '../diagnostics/types.js';
import type {
  EmittedAsmTraceEntry,
  EmittedByteMap,
  EmittedSourceSegment,
  SymbolEntry,
} from '../formats/types.js';
import type { SourceSpan } from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import {
  finalizeProgramEmission,
  type FinalizationContext,
} from './programLowering.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';
import {
  collectPlacedNamedSectionSymbols,
  placeNonBankedSectionContributions,
  resolvePlacedNamedSectionFixups,
} from './sectionPlacement.js';
import {
  appendStartupInitRegion,
  buildStartupInitRegion,
  buildStartupInitRoutine,
  STARTUP_ENTRY_LABEL,
} from './startupInit.js';

export type EmitFinalizationContext = {
  namedSectionSinks: NamedSectionContributionSink[];
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  primaryFile: string;
  baseExprs: FinalizationContext['baseExprs'];
  evalImmExpr: FinalizationContext['evalImmExpr'];
  env: CompileEnv;
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
  codeAsmTrace: EmittedAsmTraceEntry[];
  alignTo: FinalizationContext['alignTo'];
  writeSection: FinalizationContext['writeSection'];
  computeWrittenRange: FinalizationContext['computeWrittenRange'];
  rebaseCodeSourceSegments: FinalizationContext['rebaseCodeSourceSegments'];
  rebaseAsmTrace: FinalizationContext['rebaseAsmTrace'];
  defaultCodeBase?: number;
};

export function finalizeEmitProgram(context: EmitFinalizationContext): {
  map: EmittedByteMap;
  symbols: SymbolEntry[];
} {
  const { placedContributions } = placeNonBankedSectionContributions(context.namedSectionSinks, {
    diagnostics: context.diagnostics,
    env: context.env,
    evalImmExpr: context.evalImmExpr,
  });
  const placedSymbols = collectPlacedNamedSectionSymbols(placedContributions, context.diagnostics);
  context.symbols.push(...placedSymbols);

  const placedSourceSegments: EmittedSourceSegment[] = [];
  const placedAsmTrace: EmittedAsmTraceEntry[] = [];
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
      placedAsmTrace.push(...context.rebaseAsmTrace(placed.baseAddress, sink.asmTrace));
    }
  }

  const { writtenRange, sourceSegments, asmTrace } = finalizeProgramEmission({
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
    codeBytes: context.codeBytes,
    dataBytes: context.dataBytes,
    hexBytes: context.hexBytes,
    bytes: context.bytes,
    codeSourceSegments: context.codeSourceSegments,
    codeAsmTrace: context.codeAsmTrace,
    alignTo: context.alignTo,
    writeSection: context.writeSection,
    computeWrittenRange: context.computeWrittenRange,
    rebaseCodeSourceSegments: context.rebaseCodeSourceSegments,
    rebaseAsmTrace: context.rebaseAsmTrace,
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
  const mergedAsmTrace = [...placedAsmTrace, ...asmTrace].sort((a, b) =>
    a.offset === b.offset ? a.kind.localeCompare(b.kind) : a.offset - b.offset,
  );

  const startupInitRegion = buildStartupInitRegion(placedContributions);
  let finalWrittenRange = writtenRange;
  if (startupInitRegion.encoded.length > 0) {
    const mainEntry = context.symbols.find(
      (symbol): symbol is SymbolEntry & { kind: 'label' } =>
        symbol.kind === 'label' && symbol.name.toLowerCase() === 'main',
    );
    if (!mainEntry) {
      const highest = [...context.bytes.keys()].reduce((max, value) => (value > max ? value : max), -1);
      appendStartupInitRegion(context.bytes, context.diagnostics, context.primaryFile, startupInitRegion);
      finalWrittenRange = { start: writtenRange.start, end: highest + startupInitRegion.encoded.length };
    } else {
      const highest = [...context.bytes.keys()].reduce((max, value) => (value > max ? value : max), -1);
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
        for (let i = 0; i < startupBytes.length; i++) {
          context.bytes.set(startupAddress + i, startupBytes[i]!);
        }
        appendStartupInitRegion(context.bytes, context.diagnostics, context.primaryFile, startupInitRegion);
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
      ...(mergedAsmTrace.length > 0 ? { asmTrace: mergedAsmTrace } : {}),
    },
    symbols: context.symbols,
  };
}
