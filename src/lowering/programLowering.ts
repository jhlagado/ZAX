import type {
  AlignDirectiveNode,
  BinDeclNode,
  ConstDeclNode,
  DataBlockNode,
  DataDeclNode,
  EnumDeclNode,
  EaExprNode,
  ExternDeclNode,
  FuncDeclNode,
  HexDeclNode,
  ImmExprNode,
  ModuleFileNode,
  ModuleItemNode,
  NamedSectionNode,
  RawDataDeclNode,
  OpDeclNode,
  ProgramNode,
  SectionItemNode,
  SourceSpan,
  TypeExprNode,
  VarBlockNode,
  VarDeclNode,
} from '../frontend/ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import type {
  AddressRange,
  EmittedAsmTraceEntry,
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
import type { AggregateType, ScalarKind } from './typeResolution.js';
import { sizeOfTypeExpr } from '../semantics/layout.js';
import { lowerDataBlock } from './programLoweringData.js';

// Program lowering owns module-wide declaration traversal and the final
// emission/fixup passes after all symbols and section bases are known.
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
  namedSectionSinksByNode: Map<NamedSectionNode, NamedSectionContributionSink>;
  withNamedSectionSink: <T>(sink: NamedSectionContributionSink, fn: () => T) => T;
};

export type PrescanResult = {
  localCallablesByFile: Context['localCallablesByFile'];
  visibleCallables: Context['visibleCallables'];
  localOpsByFile: Context['localOpsByFile'];
  visibleOpsByName: Context['visibleOpsByName'];
  declaredOpNames: Context['declaredOpNames'];
  declaredBinNames: Context['declaredBinNames'];
  storageTypes: Context['storageTypes'];
  moduleAliasTargets: Context['moduleAliasTargets'];
  moduleAliasDecls: Context['moduleAliasDecls'];
  rawAddressSymbols: Context['rawAddressSymbols'];
};

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
  codeAsmTrace: EmittedAsmTraceEntry[];
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
  rebaseAsmTrace: (codeBase: number, trace: EmittedAsmTraceEntry[]) => EmittedAsmTraceEntry[];
};

export function preScanProgramDeclarations(ctx: Context): PrescanResult {
  const preScanItem = (
    item: ModuleItemNode | SectionItemNode,
    namedSection?: NamedSectionNode,
  ): void => {
    if (item.kind === 'NamedSection') {
      for (const sectionItem of item.items) preScanItem(sectionItem, item);
      return;
    }

    if (item.kind === 'FuncDecl') {
      const f = item as FuncDeclNode;
      const fileCallables =
        ctx.localCallablesByFile.get(f.span.file) ??
        (() => {
          const m = new Map<string, Callable>();
          ctx.localCallablesByFile.set(f.span.file, m);
          return m;
        })();
      fileCallables.set(f.name.toLowerCase(), { kind: 'func', node: f });
      if (f.exported) {
        const moduleId = (ctx.env.moduleIds?.get(f.span.file) ?? f.span.file).toLowerCase();
        ctx.visibleCallables.set(`${moduleId}.${f.name.toLowerCase()}`, { kind: 'func', node: f });
      }
    } else if (item.kind === 'OpDecl') {
      const op = item as OpDeclNode;
      const key = op.name.toLowerCase();
      const fileOps =
        ctx.localOpsByFile.get(op.span.file) ??
        (() => {
          const m = new Map<string, OpDeclNode[]>();
          ctx.localOpsByFile.set(op.span.file, m);
          return m;
        })();
      const existing = fileOps.get(key);
      if (existing) existing.push(op);
      else fileOps.set(key, [op]);
      if (op.exported) {
        const moduleId = (ctx.env.moduleIds?.get(op.span.file) ?? op.span.file).toLowerCase();
        const qualified = `${moduleId}.${key}`;
        const visible = ctx.visibleOpsByName.get(qualified);
        if (visible) visible.push(op);
        else ctx.visibleOpsByName.set(qualified, [op]);
      }
    } else if (item.kind === 'ExternDecl') {
      const ex = item as ExternDeclNode;
      const fileCallables =
        ctx.localCallablesByFile.get(ex.span.file) ??
        (() => {
          const m = new Map<string, Callable>();
          ctx.localCallablesByFile.set(ex.span.file, m);
          return m;
        })();
      for (const fn of ex.funcs) {
        fileCallables.set(fn.name.toLowerCase(), {
          kind: 'extern',
          node: fn,
          targetLower: fn.name.toLowerCase(),
        });
      }
    } else if (item.kind === 'VarBlock' && item.scope === 'module') {
      if (namedSection) return;
      const vb = item as VarBlockNode;
      for (const decl of vb.decls) {
        const lower = decl.name.toLowerCase();
        if (decl.form === 'typed') {
          ctx.storageTypes.set(lower, decl.typeExpr);
          continue;
        }
        if (decl.initializer.kind === 'VarInitAlias') {
          ctx.moduleAliasTargets.set(lower, decl.initializer.expr);
          ctx.moduleAliasDecls.set(lower, decl);
        }
      }
    } else if (item.kind === 'BinDecl') {
      const bd = item as BinDeclNode;
      if (namedSection && bd.section !== namedSection.section) return;
      ctx.declaredBinNames.add(bd.name.toLowerCase());
      ctx.rawAddressSymbols.add(bd.name.toLowerCase());
      ctx.storageTypes.set(bd.name.toLowerCase(), { kind: 'TypeName', span: bd.span, name: 'addr' });
    } else if (item.kind === 'HexDecl') {
      const hd = item as HexDeclNode;
      ctx.rawAddressSymbols.add(hd.name.toLowerCase());
      ctx.storageTypes.set(hd.name.toLowerCase(), { kind: 'TypeName', span: hd.span, name: 'addr' });
    } else if (item.kind === 'DataBlock') {
      const db = item as DataBlockNode;
      for (const decl of db.decls) {
        const lower = decl.name.toLowerCase();
        ctx.storageTypes.set(lower, decl.typeExpr);
        const scalar = ctx.resolveScalarKind(decl.typeExpr);
        if (!scalar) ctx.rawAddressSymbols.add(lower);
      }
    } else if (item.kind === 'DataDecl') {
      if (namedSection && namedSection.section !== 'data') return;
      const decl = item as DataDeclNode;
      const lower = decl.name.toLowerCase();
      ctx.storageTypes.set(lower, decl.typeExpr);
      const scalar = ctx.resolveScalarKind(decl.typeExpr);
      if (!scalar) ctx.rawAddressSymbols.add(lower);
    } else if (item.kind === 'RawDataDecl') {
      if (namedSection && namedSection.section !== 'data') return;
      const decl = item as RawDataDeclNode;
      ctx.rawAddressSymbols.add(decl.name.toLowerCase());
    }
  };

  for (const module of ctx.program.files) {
    for (const item of module.items) preScanItem(item);
  }

  return {
    localCallablesByFile: ctx.localCallablesByFile,
    visibleCallables: ctx.visibleCallables,
    localOpsByFile: ctx.localOpsByFile,
    visibleOpsByName: ctx.visibleOpsByName,
    declaredOpNames: ctx.declaredOpNames,
    declaredBinNames: ctx.declaredBinNames,
    storageTypes: ctx.storageTypes,
    moduleAliasTargets: ctx.moduleAliasTargets,
    moduleAliasDecls: ctx.moduleAliasDecls,
    rawAddressSymbols: ctx.rawAddressSymbols,
  };
}

export function lowerProgramDeclarations(ctx: Context, _prescan: PrescanResult): LoweringResult {
  const sinkOffsetRef = (sink: NamedSectionContributionSink) => ({
    get current() {
      return sink.offset;
    },
    set current(value: number) {
      sink.offset = value;
    },
  });
  const alignNamedSection = (sink: NamedSectionContributionSink, value: number): void => {
    sink.offset = ctx.alignTo(sink.offset, value);
  };
  const lowerVarBlock = (varBlock: VarBlockNode): void => {
    for (const decl of varBlock.decls) {
      if (decl.form !== 'typed') continue;
      const size = sizeOfTypeExpr(decl.typeExpr, ctx.env, ctx.diagnostics);
      if (size === undefined) continue;
      if (ctx.env.consts.has(decl.name)) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Var name "${decl.name}" collides with a const.`);
        ctx.varOffsetRef.current += size;
        continue;
      }
      if (ctx.env.enums.has(decl.name)) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Var name "${decl.name}" collides with an enum member.`);
        ctx.varOffsetRef.current += size;
        continue;
      }
      if (ctx.env.types.has(decl.name)) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Var name "${decl.name}" collides with a type name.`);
        ctx.varOffsetRef.current += size;
        continue;
      }
      if (ctx.taken.has(decl.name)) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Duplicate symbol name "${decl.name}" for var declaration.`);
        ctx.varOffsetRef.current += size;
        continue;
      }
      ctx.taken.add(decl.name);
      ctx.pending.push({
        kind: 'var',
        name: decl.name,
        section: 'var',
        offset: ctx.varOffsetRef.current,
        file: decl.span.file,
        line: decl.span.start.line,
        scope: 'global',
        size,
      });
      ctx.varOffsetRef.current += size;
    }
  };
  const lowerExternDecl = (ex: ExternDeclNode): void => {
    const baseLower = ex.base?.toLowerCase();
    if (baseLower !== undefined && !ctx.declaredBinNames.has(baseLower)) {
      ctx.diag(
        ctx.diagnostics,
        ex.span.file,
        `extern base "${ex.base}" does not reference a declared bin symbol.`,
      );
      return;
    }
    for (const fn of ex.funcs) {
      if (ctx.taken.has(fn.name)) {
        ctx.diag(ctx.diagnostics, fn.span.file, `Duplicate symbol name "${fn.name}".`);
        continue;
      }
      ctx.taken.add(fn.name);
      if (baseLower !== undefined) {
        const offset = ctx.evalImmExpr(fn.at, ctx.env, ctx.diagnostics);
        if (offset === undefined) {
          ctx.diag(ctx.diagnostics, fn.span.file, `Failed to evaluate extern func offset for "${fn.name}".`);
          continue;
        }
        if (offset < 0 || offset > 0xffff) {
          ctx.diag(ctx.diagnostics, fn.span.file, `extern func "${fn.name}" offset out of range (0..65535).`);
          continue;
        }
        ctx.deferredExterns.push({
          name: fn.name,
          baseLower,
          addend: offset,
          file: fn.span.file,
          line: fn.span.start.line,
        });
        continue;
      }
      const addr = ctx.evalImmExpr(fn.at, ctx.env, ctx.diagnostics);
      if (addr === undefined) {
        ctx.diag(ctx.diagnostics, fn.span.file, `Failed to evaluate extern func address for "${fn.name}".`);
        continue;
      }
      if (addr < 0 || addr > 0xffff) {
        ctx.diag(ctx.diagnostics, fn.span.file, `extern func "${fn.name}" address out of range (0..65535).`);
        continue;
      }
      ctx.symbols.push({
        kind: 'label',
        name: fn.name,
        address: addr,
        file: fn.span.file,
        line: fn.span.start.line,
        scope: 'global',
      });
    }
  };
  const lowerBinDecl = (
    binDecl: BinDeclNode,
    namedSection?: { node: NamedSectionNode; sink: NamedSectionContributionSink },
  ): void => {
    if (ctx.taken.has(binDecl.name)) {
      ctx.diag(ctx.diagnostics, binDecl.span.file, `Duplicate symbol name "${binDecl.name}".`);
      return;
    }
    ctx.taken.add(binDecl.name);
    const blob = ctx.loadBinInput(
      binDecl.span.file,
      binDecl.fromPath,
      ctx.includeDirs,
      (file, message) => ctx.diag(ctx.diagnostics, file, message),
    );
    if (!blob) return;
    if (binDecl.section === 'var') {
      ctx.diag(ctx.diagnostics, binDecl.span.file, `bin declarations cannot target section "var" in v0.2.`);
      return;
    }
    if (namedSection) {
      const targetSection = namedSection.node.section;
      if (binDecl.section !== targetSection) {
        ctx.diag(
          ctx.diagnostics,
          binDecl.span.file,
          `bin declaration "${binDecl.name}" section "${binDecl.section}" does not match enclosing named section "${targetSection} ${namedSection.node.name}".`,
        );
        return;
      }
      namedSection.sink.pendingSymbols.push({
        kind: 'data',
        name: binDecl.name,
        section: targetSection,
        offset: namedSection.sink.offset,
        file: binDecl.span.file,
        line: binDecl.span.start.line,
        scope: 'global',
      });
      for (const b of blob) namedSection.sink.bytes.set(namedSection.sink.offset++, b & 0xff);
      return;
    }
    if (binDecl.section === 'code') {
      ctx.pending.push({ kind: 'data', name: binDecl.name, section: 'code', offset: ctx.codeOffsetRef.current, file: binDecl.span.file, line: binDecl.span.start.line, scope: 'global' });
      for (const b of blob) ctx.codeBytes.set(ctx.codeOffsetRef.current++, b & 0xff);
      return;
    }
    ctx.pending.push({ kind: 'data', name: binDecl.name, section: 'data', offset: ctx.dataOffsetRef.current, file: binDecl.span.file, line: binDecl.span.start.line, scope: 'global' });
    for (const b of blob) ctx.dataBytes.set(ctx.dataOffsetRef.current++, b & 0xff);
  };
  const symbolicTargetFromExpr = (
    expr: ImmExprNode,
  ): { baseLower: string; addend: number } | undefined => {
    if (expr.kind === 'ImmName') return { baseLower: expr.name.toLowerCase(), addend: 0 };
    if (expr.kind !== 'ImmBinary') return undefined;
    if (expr.op !== '+' && expr.op !== '-') return undefined;

    const leftName = expr.left.kind === 'ImmName' ? expr.left.name.toLowerCase() : undefined;
    const rightName = expr.right.kind === 'ImmName' ? expr.right.name.toLowerCase() : undefined;

    if (leftName) {
      const right = ctx.evalImmExpr(expr.right, ctx.env, ctx.diagnostics);
      if (right === undefined) return undefined;
      return { baseLower: leftName, addend: expr.op === '+' ? right : -right };
    }

    if (expr.op === '+' && rightName) {
      const left = ctx.evalImmExpr(expr.left, ctx.env, ctx.diagnostics);
      if (left === undefined) return undefined;
      return { baseLower: rightName, addend: left };
    }

    return undefined;
  };
  const lowerRawDataDecl = (
    decl: RawDataDeclNode,
    namedSection?: { node: NamedSectionNode; sink: NamedSectionContributionSink },
  ): void => {
    if (!namedSection || namedSection.node.section !== 'data') {
      const sectionName = namedSection?.node.name ?? 'module scope';
      ctx.diag(
        ctx.diagnostics,
        decl.span.file,
        `Raw data declarations are only allowed inside data sections${namedSection ? ` like "${sectionName}"` : ''}.`,
      );
      return;
    }

    const okToDeclareSymbol = !ctx.taken.has(decl.name);
    if (!okToDeclareSymbol) {
      ctx.diag(ctx.diagnostics, decl.span.file, `Duplicate symbol name "${decl.name}".`);
    } else {
      ctx.taken.add(decl.name);
      namedSection.sink.pendingSymbols.push({
        kind: 'data',
        name: decl.name,
        section: namedSection.node.section,
        offset: namedSection.sink.offset,
        file: decl.span.file,
        line: decl.span.start.line,
        scope: 'global',
      });
    }

    const emitByte = (b: number): void => {
      namedSection.sink.bytes.set(namedSection.sink.offset, b & 0xff);
      namedSection.sink.offset++;
    };
    const emitWord = (w: number): void => {
      emitByte(w & 0xff);
      emitByte((w >> 8) & 0xff);
    };

    if (decl.directive === 'ds') {
      const size = ctx.evalImmExpr(decl.size, ctx.env, ctx.diagnostics);
      if (size === undefined) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Failed to evaluate raw data size for "${decl.name}".`);
        return;
      }
      if (size < 0) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Raw data size for "${decl.name}" must be non-negative.`);
        return;
      }
      for (let i = 0; i < size; i++) emitByte(0);
      return;
    }

    for (const value of decl.values) {
      const v = ctx.evalImmExpr(value, ctx.env, ctx.diagnostics);
      if (v !== undefined) {
        if (decl.directive === 'db') emitByte(v);
        else emitWord(v);
        continue;
      }
      if (decl.directive === 'dw') {
        const symbolic = symbolicTargetFromExpr(value);
        if (symbolic) {
          namedSection.sink.fixups.push({
            offset: namedSection.sink.offset,
            baseLower: symbolic.baseLower,
            addend: symbolic.addend,
            file: decl.span.file,
          });
          emitWord(0);
          continue;
        }
      }
      ctx.diag(ctx.diagnostics, decl.span.file, `Failed to evaluate raw data value for "${decl.name}".`);
      if (decl.directive === 'db') emitByte(0);
      else emitWord(0);
    }
  };
  const lowerItem = (
    item: ModuleItemNode | SectionItemNode,
    namedSection?: { node: NamedSectionNode; sink: NamedSectionContributionSink },
  ): void => {
    if (item.kind === 'NamedSection') {
      const sectionNode = item as NamedSectionNode;
      const sink = ctx.namedSectionSinksByNode.get(sectionNode);
      if (!sink) return;
      const prevSection = ctx.activeSectionRef.current;
      ctx.activeSectionRef.current = sectionNode.section;
      ctx.withNamedSectionSink(sink, () => {
        for (const sectionItem of sectionNode.items) {
          lowerItem(sectionItem, { node: sectionNode, sink });
        }
      });
      ctx.activeSectionRef.current = prevSection;
      return;
    }

    if (item.kind === 'ConstDecl') {
      const constItem = item as ConstDeclNode;
      const v = ctx.env.consts.get(constItem.name);
      if (v !== undefined) {
        if (ctx.taken.has(constItem.name)) {
          ctx.diag(ctx.diagnostics, constItem.span.file, `Duplicate symbol name "${constItem.name}".`);
          return;
        }
        ctx.taken.add(constItem.name);
        ctx.symbols.push({
          kind: 'constant',
          name: constItem.name,
          value: v,
          address: v & 0xffff,
          file: constItem.span.file,
          line: constItem.span.start.line,
          scope: 'global',
        });
      }
      return;
    }

    if (item.kind === 'EnumDecl') {
      const e = item as EnumDeclNode;
      for (let idx = 0; idx < e.members.length; idx++) {
        const member = e.members[idx]!;
        const name = `${e.name}.${member}`;
        if (ctx.env.enums.get(name) !== idx) continue;
        if (ctx.taken.has(name)) {
          ctx.diag(ctx.diagnostics, e.span.file, `Duplicate symbol name "${name}".`);
          continue;
        }
        ctx.taken.add(name);
        ctx.symbols.push({
          kind: 'constant',
          name,
          value: idx,
          address: idx & 0xffff,
          file: e.span.file,
          line: e.span.start.line,
          scope: 'global',
        });
      }
      return;
    }

    if (item.kind === 'Align') {
      const a = item as AlignDirectiveNode;
      const v = ctx.evalImmExpr(a.value, ctx.env, ctx.diagnostics);
      if (v === undefined) {
        ctx.diag(ctx.diagnostics, a.span.file, `Failed to evaluate align value.`);
        return;
      }
      if (v <= 0) {
        ctx.diag(ctx.diagnostics, a.span.file, `align value must be > 0.`);
        return;
      }
      if (namedSection) alignNamedSection(namedSection.sink, v);
      else ctx.advanceAlign(v);
      return;
    }

    if (item.kind === 'ExternDecl') {
      lowerExternDecl(item as ExternDeclNode);
      return;
    }

    if (item.kind === 'BinDecl') {
      lowerBinDecl(item as BinDeclNode, namedSection);
      return;
    }

    if (item.kind === 'HexDecl') {
      const hexDecl = item as HexDeclNode;
      if (ctx.taken.has(hexDecl.name)) {
        ctx.diag(ctx.diagnostics, hexDecl.span.file, `Duplicate symbol name "${hexDecl.name}".`);
        return;
      }
      ctx.taken.add(hexDecl.name);
      const parsed = ctx.loadHexInput(
        hexDecl.span.file,
        hexDecl.fromPath,
        ctx.includeDirs,
        (file, message) => ctx.diag(ctx.diagnostics, file, message),
      );
      if (!parsed) return;
      for (const [addr, b] of parsed.bytes) {
        if (ctx.hexBytes.has(addr)) {
          ctx.diag(ctx.diagnostics, hexDecl.span.file, `HEX overlap at address ${addr}.`);
          continue;
        }
        ctx.hexBytes.set(addr, b);
      }
      ctx.absoluteSymbols.push({
        kind: 'data',
        name: hexDecl.name,
        address: parsed.minAddress,
        file: hexDecl.span.file,
        line: hexDecl.span.start.line,
        scope: 'global',
      });
      return;
    }

    if (item.kind === 'OpDecl') {
      const op = item as OpDeclNode;
      const key = op.name.toLowerCase();
      if (ctx.taken.has(op.name) && !ctx.declaredOpNames.has(key)) {
        ctx.diag(ctx.diagnostics, op.span.file, `Duplicate symbol name "${op.name}".`);
      } else {
        ctx.taken.add(op.name);
        ctx.declaredOpNames.add(key);
      }
      return;
    }

    if (item.kind === 'FuncDecl') {
      if (namedSection && namedSection.node.section !== 'code') {
        ctx.diag(
          ctx.diagnostics,
          item.span.file,
          `Function "${item.name}" is not allowed inside data section "${namedSection.node.name}".`,
        );
        return;
      }
      ctx.lowerFunctionDecl({
        ...ctx,
        item,
        ...(namedSection ? { pending: namedSection.sink.pendingSymbols } : {}),
      });
      return;
    }

    if (item.kind === 'DataBlock') {
      if (namedSection && namedSection.node.section !== 'data') {
        ctx.diag(
          ctx.diagnostics,
          item.span.file,
          `Data declarations are not allowed inside code section "${namedSection.node.name}".`,
        );
        return;
      }
      if (namedSection) {
        lowerDataBlock(ctx, item as DataBlockNode, {
          section: namedSection.node.section,
          bytes: namedSection.sink.bytes,
          offsetRef: sinkOffsetRef(namedSection.sink),
          pending: namedSection.sink.pendingSymbols,
          startupInitActions: namedSection.sink.startupInitActions,
        });
      } else {
        lowerDataBlock(ctx, item as DataBlockNode);
      }
      return;
    }

    if (item.kind === 'DataDecl') {
      if (!namedSection || namedSection.node.section !== 'data') {
        const sectionName = namedSection?.node.name ?? 'module scope';
        ctx.diag(
          ctx.diagnostics,
          item.span.file,
          `Data declarations are only allowed inside data sections${namedSection ? ` like "${sectionName}"` : ''}.`,
        );
        return;
      }
      lowerDataBlock(
        ctx,
        {
          kind: 'DataBlock',
          span: item.span,
          decls: [item as DataDeclNode],
        },
        {
          section: namedSection.node.section,
          bytes: namedSection.sink.bytes,
          offsetRef: sinkOffsetRef(namedSection.sink),
          pending: namedSection.sink.pendingSymbols,
          startupInitActions: namedSection.sink.startupInitActions,
        },
      );
      return;
    }

    if (item.kind === 'RawDataDecl') {
      lowerRawDataDecl(item as RawDataDeclNode, namedSection);
      return;
    }

    if (item.kind === 'VarBlock' && item.scope === 'module') {
      if (namedSection) {
        ctx.diag(
          ctx.diagnostics,
          item.span.file,
          `Module-scope var blocks are not allowed inside named section "${namedSection.node.name}".`,
        );
        return;
      }
      lowerVarBlock(item as VarBlockNode);
    }
  };

  for (const module of ctx.program.files) {
    ctx.activeSectionRef.current = 'code';
    for (const item of module.items) lowerItem(item);
  }

  return {
    codeOffset: ctx.codeOffsetRef.current,
    dataOffset: ctx.dataOffsetRef.current,
    varOffset: ctx.varOffsetRef.current,
    pending: ctx.pending,
    symbols: ctx.symbols,
    absoluteSymbols: ctx.absoluteSymbols,
    deferredExterns: ctx.deferredExterns,
    codeBytes: ctx.codeBytes,
    dataBytes: ctx.dataBytes,
    hexBytes: ctx.hexBytes,
  };
}

export { finalizeProgramEmission } from './programLoweringFinalize.js';
