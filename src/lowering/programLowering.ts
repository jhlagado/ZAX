import type {
  EaExprNode,
  ImmExprNode,
  NamedSectionNode,
  OpDeclNode,
  ProgramNode,
  SourceSpan,
  TypeExprNode,
  VarDeclNode,
} from '../frontend/ast.js';
import type { Diagnostic } from '../diagnosticTypes.js';
import type {
  AddressRange,
  EmittedSourceSegment,
  SymbolEntry,
} from '../formats/types.js';
import type { CompileEnv } from '../semantics/env.js';
import type { FunctionLoweringContext, FunctionLoweringSharedContext } from './functionLowering.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';
import type {
  Callable,
  PendingSymbol,
  SectionKind,
} from './loweringTypes.js';
import type { LoweredAsmItem, LoweredImmExpr } from './loweredAsmTypes.js';
import type { PrescanResult } from './prescanTypes.js';
import type { AggregateType } from './typeResolution.js';
import { preScanProgramDeclarations as runProgramPrescan } from './programPrescan.js';
import { lowerProgramDeclarations as runProgramLoweringTraversal } from './programLoweringTraversal.js';

// Program lowering owns module-wide declaration traversal and the final
// emission/fixup passes after all symbols and section bases are known.
// --- Phase 0: shared context and products ---
export type Context = FunctionLoweringSharedContext & {
  program: ProgramNode;
  includeDirs: string[];
  localCallablesByFile: Map<string, Map<string, Callable>>;
  visibleCallables: Map<string, Callable>;
  localOpsByFile: Map<string, Map<string, OpDeclNode[]>>;
  visibleOpsByName: Map<string, OpDeclNode[]>;
  declaredOpNames: Set<string>;
  declaredBinNames: Set<string>;
  deferredExterns: Array<{
    name: string;
    baseLower: string;
    addend: number;
    file: string;
    line: number;
  }>;
  storageTypes: Map<string, TypeExprNode>;
  moduleAliasTargets: Map<string, EaExprNode>;
  moduleAliasDecls: Map<string, VarDeclNode>;
  rawAddressSymbols: Set<string>;
  absoluteSymbols: SymbolEntry[];
  symbols: SymbolEntry[];
  dataBytes: Map<number, number>;
  codeBytes: Map<number, number>;
  hexBytes: Map<number, number>;
  activeSectionRef: { current: SectionKind };
  codeOffsetRef: { current: number };
  dataOffsetRef: { current: number };
  varOffsetRef: { current: number };
  baseExprs: Partial<Record<SectionKind, ImmExprNode>>;
  advanceAlign: (a: number) => void;
  alignTo: (n: number, alignment: number) => number;
  loadBinInput: (
    file: string,
    fromPath: string,
    includeDirs: string[],
    diag: (file: string, message: string) => void,
  ) => Uint8Array | undefined;
  loadHexInput: (
    file: string,
    fromPath: string,
    includeDirs: string[],
    diag: (file: string, message: string) => void,
  ) => { bytes: Map<number, number>; minAddress: number } | undefined;
  resolveAggregateType: (type: TypeExprNode) => AggregateType | undefined;
  sizeOfTypeExpr: (
    typeExpr: TypeExprNode,
    env: CompileEnv,
    diagnostics: Diagnostic[],
  ) => number | undefined;
  lowerFunctionDecl: (ctx: FunctionLoweringContext) => void;
  recordLoweredAsmItem: (item: LoweredAsmItem, span?: SourceSpan) => void;
  lowerImmExprForLoweredAsm: (expr: ImmExprNode) => LoweredImmExpr;
  namedSectionSinksByNode: Map<NamedSectionNode, NamedSectionContributionSink>;
  withNamedSectionSink: <T>(sink: NamedSectionContributionSink, fn: () => T) => T;
};

export type ProgramPrescanContext = Pick<
  Context,
  | 'program'
  | 'env'
  | 'localCallablesByFile'
  | 'visibleCallables'
  | 'localOpsByFile'
  | 'visibleOpsByName'
  | 'declaredOpNames'
  | 'declaredBinNames'
  | 'storageTypes'
  | 'moduleAliasTargets'
  | 'moduleAliasDecls'
  | 'rawAddressSymbols'
  | 'resolveScalarKind'
>;

// --- Phase 2 product: lowered bytes, symbols, and deferred externs ---
export type LoweringResult = {
  codeOffset: number;
  dataOffset: number;
  varOffset: number;
  pending: Context['pending'];
  symbols: Context['symbols'];
  absoluteSymbols: Context['absoluteSymbols'];
  deferredExterns: Context['deferredExterns'];
  codeBytes: Context['codeBytes'];
  dataBytes: Context['dataBytes'];
  hexBytes: Context['hexBytes'];
};

// --- Phase 3 context: finalization inputs (placement, fixups, artifacts) ---
export type FinalizationContext = {
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  primaryFile: string;
  baseExprs: Partial<Record<SectionKind, ImmExprNode>>;
  evalImmExpr: (
    expr: ImmExprNode,
    env: CompileEnv,
    diagnostics: Diagnostic[],
  ) => number | undefined;
  env: CompileEnv;
  codeOffset: number;
  dataOffset: number;
  varOffset: number;
  pending: PendingSymbol[];
  symbols: SymbolEntry[];
  absoluteSymbols: SymbolEntry[];
  deferredExterns: Context['deferredExterns'];
  fixups: Array<{ offset: number; baseLower: string; addend: number; file: string }>;
  rel8Fixups: Array<{
    offset: number;
    origin: number;
    baseLower: string;
    addend: number;
    file: string;
    mnemonic: string;
  }>;
  codeBytes: Map<number, number>;
  dataBytes: Map<number, number>;
  hexBytes: Map<number, number>;
  bytes: Map<number, number>;
  codeSourceSegments: EmittedSourceSegment[];
  defaultCodeBase?: number;
  alignTo: (n: number, alignment: number) => number;
  writeSection: (
    base: number,
    section: Map<number, number>,
    bytes: Map<number, number>,
    report: (message: string) => void,
  ) => void;
  computeWrittenRange: (bytes: Map<number, number>) => AddressRange;
  rebaseCodeSourceSegments: (
    codeBase: number,
    segments: EmittedSourceSegment[],
  ) => EmittedSourceSegment[];
};

// --- Phase 1: prescan declarations (callables, ops, storage aliases) ---
export function preScanProgramDeclarations(ctx: ProgramPrescanContext): PrescanResult {
  return runProgramPrescan(ctx);
}

// --- Phase 2: lower declarations and functions into section bytes ---
export function lowerProgramDeclarations(ctx: Context, _prescan: PrescanResult): LoweringResult {
  return runProgramLoweringTraversal(ctx, _prescan);
}

// --- Phase 3: finalization (placement, fixups, emission) ---
export { finalizeProgramEmission } from './programLoweringFinalize.js';
