import { resolve } from 'node:path';
import type { OpDeclNode, ProgramNode, TypeExprNode, VarDeclNode, EaExprNode } from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { EmittedSourceSegment, SymbolEntry } from '../formats/types.js';
import type { EmitProgramOptions } from './emitPipeline.js';
import type { Callable, PendingSymbol } from './loweringTypes.js';
import type { LoweredAsmStream, LoweredAsmStreamBlock } from './loweredAsmTypes.js';
import { createEmitVisibilityHelpers } from './emitVisibility.js';
import { createOpStackAnalysisHelpers } from './opStackAnalysis.js';

export type EmitPhase1Workspace = {
  bytes: Map<number, number>;
  codeBytes: Map<number, number>;
  dataBytes: Map<number, number>;
  hexBytes: Map<number, number>;
  codeSourceSegments: EmittedSourceSegment[];
  loweredAsmStream: LoweredAsmStream;
  loweredAsmBlocksByKey: Map<string, LoweredAsmStreamBlock>;
  absoluteSymbols: SymbolEntry[];
  symbols: SymbolEntry[];
  pending: PendingSymbol[];
  taken: Set<string>;
  fixups: { offset: number; baseLower: string; addend: number; file: string }[];
  rel8Fixups: {
    offset: number;
    origin: number;
    baseLower: string;
    addend: number;
    file: string;
    mnemonic: string;
  }[];
  deferredExterns: {
    name: string;
    baseLower: string;
    addend: number;
    file: string;
    line: number;
  }[];
  localCallablesByFile: Map<string, Map<string, Callable>>;
  visibleCallables: Map<string, Callable>;
  localOpsByFile: Map<string, Map<string, OpDeclNode[]>>;
  visibleOpsByName: Map<string, OpDeclNode[]>;
  opStackPolicyMode: NonNullable<EmitProgramOptions['opStackPolicy']>;
  rawTypedCallWarningsEnabled: boolean;
  declaredOpNames: Set<string>;
  declaredBinNames: Set<string>;
  storageTypes: Map<string, TypeExprNode>;
  moduleAliasTargets: Map<string, EaExprNode>;
  moduleAliasDecls: Map<string, VarDeclNode>;
  rawAddressSymbols: Set<string>;
  stackSlotTypes: Map<string, TypeExprNode>;
  stackSlotOffsets: Map<string, number>;
  localAliasTargets: Map<string, EaExprNode>;
  baseExprs: Partial<Record<'code' | 'data' | 'var', import('../frontend/ast.js').ImmExprNode>>;
  primaryFile: string;
  includeDirs: string[];
  resolveVisibleCallable: ReturnType<typeof createEmitVisibilityHelpers>['resolveVisibleCallable'];
  resolveVisibleOpCandidates: ReturnType<typeof createEmitVisibilityHelpers>['resolveVisibleOpCandidates'];
  summarizeOpStackEffect: ReturnType<typeof createOpStackAnalysisHelpers>['summarizeOpStackEffect'];
};

export function createEmitPhase1Workspace(
  program: ProgramNode,
  env: CompileEnv,
  options?: EmitProgramOptions,
): EmitPhase1Workspace {
  const bytes = new Map<number, number>();
  const codeBytes = new Map<number, number>();
  const dataBytes = new Map<number, number>();
  const hexBytes = new Map<number, number>();
  const codeSourceSegments: EmittedSourceSegment[] = [];
  const loweredAsmStream: LoweredAsmStream = { blocks: [] };
  const loweredAsmBlocksByKey = new Map<string, LoweredAsmStreamBlock>();
  const absoluteSymbols: SymbolEntry[] = [];
  const symbols: SymbolEntry[] = [];
  const pending: PendingSymbol[] = [];
  const taken = new Set<string>();
  const fixups: { offset: number; baseLower: string; addend: number; file: string }[] = [];
  const rel8Fixups: {
    offset: number;
    origin: number;
    baseLower: string;
    addend: number;
    file: string;
    mnemonic: string;
  }[] = [];
  const deferredExterns: {
    name: string;
    baseLower: string;
    addend: number;
    file: string;
    line: number;
  }[] = [];

  const localCallablesByFile = new Map<string, Map<string, Callable>>();
  const visibleCallables = new Map<string, Callable>();
  const localOpsByFile = new Map<string, Map<string, OpDeclNode[]>>();
  const visibleOpsByName = new Map<string, OpDeclNode[]>();
  const opStackPolicyMode = options?.opStackPolicy ?? 'off';
  const rawTypedCallWarningsEnabled = options?.rawTypedCallWarnings === true;
  const declaredOpNames = new Set<string>();
  const declaredBinNames = new Set<string>();
  const { resolveVisibleCallable, resolveVisibleOpCandidates } = createEmitVisibilityHelpers({
    env,
    localCallablesByFile,
    visibleCallables,
    localOpsByFile,
    visibleOpsByName,
  });
  const { summarizeOpStackEffect } = createOpStackAnalysisHelpers({
    resolveOpCandidates: resolveVisibleOpCandidates,
  });

  const storageTypes = new Map<string, TypeExprNode>();
  const moduleAliasTargets = new Map<string, EaExprNode>();
  const moduleAliasDecls = new Map<string, VarDeclNode>();
  const rawAddressSymbols = new Set<string>();
  const stackSlotTypes = new Map<string, TypeExprNode>();
  const stackSlotOffsets = new Map<string, number>();
  const localAliasTargets = new Map<string, EaExprNode>();
  const baseExprs: Partial<Record<'code' | 'data' | 'var', import('../frontend/ast.js').ImmExprNode>> = {};

  const firstModule = program.files[0]!;

  const primaryFile = firstModule.span.file ?? program.entryFile;
  const includeDirs = (options?.includeDirs ?? []).map((p) => resolve(p));

  return {
    bytes,
    codeBytes,
    dataBytes,
    hexBytes,
    codeSourceSegments,
    loweredAsmStream,
    loweredAsmBlocksByKey,
    absoluteSymbols,
    symbols,
    pending,
    taken,
    fixups,
    rel8Fixups,
    deferredExterns,
    localCallablesByFile,
    visibleCallables,
    localOpsByFile,
    visibleOpsByName,
    opStackPolicyMode,
    rawTypedCallWarningsEnabled,
    declaredOpNames,
    declaredBinNames,
    storageTypes,
    moduleAliasTargets,
    moduleAliasDecls,
    rawAddressSymbols,
    stackSlotTypes,
    stackSlotOffsets,
    localAliasTargets,
    baseExprs,
    primaryFile,
    includeDirs,
    resolveVisibleCallable,
    resolveVisibleOpCandidates,
    summarizeOpStackEffect,
  };
}
