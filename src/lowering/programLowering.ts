import type {
  AlignDirectiveNode,
  BinDeclNode,
  ConstDeclNode,
  DataBlockNode,
  EnumDeclNode,
  EaExprNode,
  ExternDeclNode,
  FuncDeclNode,
  HexDeclNode,
  ImmExprNode,
  ModuleFileNode,
  OpDeclNode,
  ProgramNode,
  SectionDirectiveNode,
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
import type { FunctionLoweringContext } from './functionLowering.js';
import type {
  Callable,
  PendingSymbol,
  SectionKind,
} from './loweringTypes.js';
import type { AggregateType, ScalarKind } from './typeResolution.js';

// Program lowering owns module-wide declaration traversal and the final
// emission/fixup passes after all symbols and section bases are known.
type Context = Omit<FunctionLoweringContext, 'item'> & {
  program: ProgramNode;
  includeDirs: string[];
  callables: Map<string, Callable>;
  opsByName: Map<string, OpDeclNode[]>;
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
  baseExprs: Partial<Record<SectionKind, SectionDirectiveNode['at']>>;
  setBaseExpr: (kind: SectionKind, at: SectionDirectiveNode['at'], file: string) => void;
  advanceAlign: (a: number) => void;
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
};

type FinalizationContext = {
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  primaryFile: string;
  baseExprs: Partial<Record<SectionKind, SectionDirectiveNode['at']>>;
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

export function preScanProgramDeclarations(ctx: Context): void {
  for (const module of ctx.program.files) {
    for (const item of module.items) {
      if (item.kind === 'FuncDecl') {
        const f = item as FuncDeclNode;
        ctx.callables.set(f.name.toLowerCase(), { kind: 'func', node: f });
      } else if (item.kind === 'OpDecl') {
        const op = item as OpDeclNode;
        const key = op.name.toLowerCase();
        const existing = ctx.opsByName.get(key);
        if (existing) existing.push(op);
        else ctx.opsByName.set(key, [op]);
      } else if (item.kind === 'ExternDecl') {
        const ex = item as ExternDeclNode;
        for (const fn of ex.funcs) {
          ctx.callables.set(fn.name.toLowerCase(), {
            kind: 'extern',
            node: fn,
            targetLower: fn.name.toLowerCase(),
          });
        }
      } else if (item.kind === 'VarBlock' && item.scope === 'module') {
        const vb = item as VarBlockNode;
        for (const decl of vb.decls) {
          const lower = decl.name.toLowerCase();
          if (decl.typeExpr) {
            ctx.storageTypes.set(lower, decl.typeExpr);
            continue;
          }
          if (decl.initializer?.kind === 'VarInitAlias') {
            ctx.moduleAliasTargets.set(lower, decl.initializer.expr);
            ctx.moduleAliasDecls.set(lower, decl);
          }
        }
      } else if (item.kind === 'BinDecl') {
        const bd = item as BinDeclNode;
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
      }
    }
  }
}

export function lowerProgramDeclarations(ctx: Context): void {
  for (const module of ctx.program.files) {
    ctx.activeSectionRef.current = 'code';

    for (const item of module.items) {
      if (item.kind === 'ConstDecl') {
        const constItem = item as ConstDeclNode;
        const v = ctx.env.consts.get(constItem.name);
        if (v !== undefined) {
          if (ctx.taken.has(constItem.name)) {
            ctx.diag(ctx.diagnostics, constItem.span.file, `Duplicate symbol name "${constItem.name}".`);
            continue;
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
        continue;
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
        continue;
      }

      if (item.kind === 'Section') {
        const s = item as SectionDirectiveNode;
        ctx.activeSectionRef.current = s.section;
        if (s.at) ctx.setBaseExpr(s.section, s.at, s.span.file);
        continue;
      }

      if (item.kind === 'Align') {
        const a = item as AlignDirectiveNode;
        const v = ctx.evalImmExpr(a.value, ctx.env, ctx.diagnostics);
        if (v === undefined) {
          ctx.diag(ctx.diagnostics, a.span.file, `Failed to evaluate align value.`);
          continue;
        }
        if (v <= 0) {
          ctx.diag(ctx.diagnostics, a.span.file, `align value must be > 0.`);
          continue;
        }
        ctx.advanceAlign(v);
        continue;
      }

      if (item.kind === 'ExternDecl') {
        const ex = item as ExternDeclNode;
        const baseLower = ex.base?.toLowerCase();
        if (baseLower !== undefined && !ctx.declaredBinNames.has(baseLower)) {
          ctx.diag(
            ctx.diagnostics,
            ex.span.file,
            `extern base "${ex.base}" does not reference a declared bin symbol.`,
          );
          continue;
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
        continue;
      }

      if (item.kind === 'BinDecl') {
        const binDecl = item as BinDeclNode;
        if (ctx.taken.has(binDecl.name)) {
          ctx.diag(ctx.diagnostics, binDecl.span.file, `Duplicate symbol name "${binDecl.name}".`);
          continue;
        }
        ctx.taken.add(binDecl.name);
        const blob = ctx.loadBinInput(
          binDecl.span.file,
          binDecl.fromPath,
          ctx.includeDirs,
          (file, message) => ctx.diag(ctx.diagnostics, file, message),
        );
        if (!blob) continue;
        if (binDecl.section === 'var') {
          ctx.diag(ctx.diagnostics, binDecl.span.file, `bin declarations cannot target section "var" in v0.2.`);
          continue;
        }
        if (binDecl.section === 'code') {
          ctx.pending.push({ kind: 'data', name: binDecl.name, section: 'code', offset: ctx.codeOffsetRef.current, file: binDecl.span.file, line: binDecl.span.start.line, scope: 'global' });
          for (const b of blob) ctx.codeBytes.set(ctx.codeOffsetRef.current++, b & 0xff);
        } else {
          ctx.pending.push({ kind: 'data', name: binDecl.name, section: 'data', offset: ctx.dataOffsetRef.current, file: binDecl.span.file, line: binDecl.span.start.line, scope: 'global' });
          for (const b of blob) ctx.dataBytes.set(ctx.dataOffsetRef.current++, b & 0xff);
        }
        continue;
      }

      if (item.kind === 'HexDecl') {
        const hexDecl = item as HexDeclNode;
        if (ctx.taken.has(hexDecl.name)) {
          ctx.diag(ctx.diagnostics, hexDecl.span.file, `Duplicate symbol name "${hexDecl.name}".`);
          continue;
        }
        ctx.taken.add(hexDecl.name);
        const parsed = ctx.loadHexInput(
          hexDecl.span.file,
          hexDecl.fromPath,
          ctx.includeDirs,
          (file, message) => ctx.diag(ctx.diagnostics, file, message),
        );
        if (!parsed) continue;
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
        continue;
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
        continue;
      }

      if (item.kind === 'FuncDecl') {
        ctx.lowerFunctionDecl({ ...ctx, item });
        continue;
      }

      if (item.kind === 'DataBlock') {
        lowerDataBlock(ctx, item as DataBlockNode);
        continue;
      }

      if (item.kind === 'VarBlock' && item.scope === 'module') {
        const varBlock = item as VarBlockNode;
        for (const decl of varBlock.decls) {
          if (!decl.typeExpr) continue;
          const size = ctx.sizeOfTypeExpr(decl.typeExpr, ctx.env, ctx.diagnostics);
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
      }
    }
  }
}

function lowerDataBlock(ctx: Context, dataBlock: DataBlockNode): void {
  for (const decl of dataBlock.decls) {
    const okToDeclareSymbol = !ctx.taken.has(decl.name);
    if (!okToDeclareSymbol) {
      ctx.diag(ctx.diagnostics, decl.span.file, `Duplicate symbol name "${decl.name}".`);
    } else {
      ctx.taken.add(decl.name);
      ctx.pending.push({
        kind: 'data',
        name: decl.name,
        section: 'data',
        offset: ctx.dataOffsetRef.current,
        file: decl.span.file,
        line: decl.span.start.line,
        scope: 'global',
      });
    }

    const type = decl.typeExpr;
    const init = decl.initializer;

    const emitByte = (b: number) => {
      ctx.dataBytes.set(ctx.dataOffsetRef.current, b & 0xff);
      ctx.dataOffsetRef.current++;
    };
    const emitWord = (w: number) => {
      emitByte(w & 0xff);
      emitByte((w >> 8) & 0xff);
    };
    const nextPow2 = (value: number): number => {
      if (value <= 1) return value;
      let pow = 1;
      while (pow < value) pow <<= 1;
      return pow;
    };

    const recordType = ctx.resolveAggregateType(type);
    if (recordType?.kind === 'record') {
      if (init.kind === 'InitString') {
        ctx.diag(ctx.diagnostics, decl.span.file, `Record initializer for "${decl.name}" must use aggregate form.`);
        continue;
      }

      const valuesByField = new Map<string, ImmExprNode>();
      let recordInitFailed = false;
      if (init.kind === 'InitRecordNamed') {
        for (const fieldInit of init.fields) {
          const field = recordType.fields.find((f) => f.name === fieldInit.name);
          if (!field) {
            ctx.diag(ctx.diagnostics, decl.span.file, `Unknown record field "${fieldInit.name}" in initializer for "${decl.name}".`);
            recordInitFailed = true;
            continue;
          }
          if (valuesByField.has(field.name)) {
            ctx.diag(ctx.diagnostics, decl.span.file, `Duplicate record field "${field.name}" in initializer for "${decl.name}".`);
            recordInitFailed = true;
            continue;
          }
          valuesByField.set(field.name, fieldInit.value);
        }
        for (const field of recordType.fields) {
          if (valuesByField.has(field.name)) continue;
          ctx.diag(ctx.diagnostics, decl.span.file, `Missing record field "${field.name}" in initializer for "${decl.name}".`);
          recordInitFailed = true;
        }
      } else {
        if (init.elements.length !== recordType.fields.length) {
          ctx.diag(ctx.diagnostics, decl.span.file, `Record initializer field count mismatch for "${decl.name}".`);
          continue;
        }
        for (let index = 0; index < recordType.fields.length; index++) {
          const field = recordType.fields[index]!;
          const element = init.elements[index]!;
          valuesByField.set(field.name, element);
        }
      }
      if (recordInitFailed) continue;

      const encodedFields: Array<{ width: 1 | 2; value: number }> = [];
      for (const field of recordType.fields) {
        const fieldValueExpr = valuesByField.get(field.name);
        if (!fieldValueExpr) continue;
        const scalar = ctx.resolveScalarKind(field.typeExpr);
        if (!scalar) {
          ctx.diag(ctx.diagnostics, decl.span.file, `Unsupported record field type "${field.name}" in initializer for "${decl.name}" (expected byte/word/addr/ptr).`);
          recordInitFailed = true;
          continue;
        }
        const value = ctx.evalImmExpr(fieldValueExpr, ctx.env, ctx.diagnostics);
        if (value === undefined) {
          ctx.diag(ctx.diagnostics, decl.span.file, `Failed to evaluate data initializer for "${decl.name}".`);
          recordInitFailed = true;
          continue;
        }
        encodedFields.push({ width: scalar === 'byte' ? 1 : 2, value });
      }
      if (recordInitFailed) continue;

      let emitted = 0;
      for (const encoded of encodedFields) {
        if (encoded.width === 1) {
          emitByte(encoded.value);
          emitted += 1;
        } else {
          emitWord(encoded.value);
          emitted += 2;
        }
      }
      const storageBytes = ctx.sizeOfTypeExpr(type, ctx.env, ctx.diagnostics);
      if (storageBytes === undefined) continue;
      for (let pad = emitted; pad < storageBytes; pad++) emitByte(0);
      continue;
    }

    if (init.kind === 'InitRecordNamed') {
      ctx.diag(ctx.diagnostics, decl.span.file, `Named-field aggregate initializer requires a record type for "${decl.name}".`);
      continue;
    }

    const elementScalar = type.kind === 'ArrayType' ? ctx.resolveScalarKind(type.element) : ctx.resolveScalarKind(type);
    const elementSize = elementScalar === 'word' || elementScalar === 'addr' ? 2 : elementScalar === 'byte' ? 1 : undefined;
    if (!elementSize) {
      ctx.diag(ctx.diagnostics, decl.span.file, `Unsupported data type for "${decl.name}" (expected byte/word/addr/ptr or fixed-length arrays of those).`);
      continue;
    }

    const declaredLength = type.kind === 'ArrayType' ? type.length : 1;
    let actualLength = declaredLength ?? 0;

    if (init.kind === 'InitString') {
      if (elementSize !== 1) {
        ctx.diag(ctx.diagnostics, decl.span.file, `String initializer requires byte element type for "${decl.name}".`);
        continue;
      }
      if (declaredLength !== undefined && init.value.length !== declaredLength) {
        ctx.diag(ctx.diagnostics, decl.span.file, `String length mismatch for "${decl.name}".`);
        continue;
      }
      for (let idx = 0; idx < init.value.length; idx++) emitByte(init.value.charCodeAt(idx));
      actualLength = init.value.length;
      if (type.kind === 'ArrayType') {
        const emittedBytes = actualLength * elementSize;
        const storageBytes = nextPow2(emittedBytes);
        for (let pad = emittedBytes; pad < storageBytes; pad++) emitByte(0);
      }
      continue;
    }

    const values: number[] = [];
    for (const e of init.elements) {
      const v = ctx.evalImmExpr(e, ctx.env, ctx.diagnostics);
      if (v === undefined) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Failed to evaluate data initializer for "${decl.name}".`);
        break;
      }
      values.push(v);
    }

    if (declaredLength !== undefined && values.length !== declaredLength) {
      ctx.diag(ctx.diagnostics, decl.span.file, `Initializer length mismatch for "${decl.name}".`);
      continue;
    }

    for (const v of values) {
      if (elementSize === 1) emitByte(v);
      else emitWord(v);
    }
    actualLength = type.kind === 'ArrayType' ? values.length : 1;
    if (type.kind === 'ArrayType') {
      const emittedBytes = actualLength * elementSize;
      const storageBytes = nextPow2(emittedBytes);
      for (let pad = emittedBytes; pad < storageBytes; pad++) emitByte(0);
    }
  }
}

export function finalizeProgramEmission(ctx: FinalizationContext): {
  codeBase: number;
  dataBase: number;
  varBase: number;
  codeOk: boolean;
  dataOk: boolean;
  varOk: boolean;
  writtenRange: AddressRange;
  sourceSegments: EmittedSourceSegment[];
  asmTrace: EmittedAsmTraceEntry[];
} {
  const evalBase = (kind: SectionKind): number | undefined => {
    const at = ctx.baseExprs[kind];
    if (!at) return undefined;
    const value = ctx.evalImmExpr(at, ctx.env, ctx.diagnostics);
    if (value === undefined) {
      ctx.diag(ctx.diagnostics, at.span.file, `Failed to evaluate section "${kind}" base address.`);
      return undefined;
    }
    if (value < 0 || value > 0xffff) {
      ctx.diag(ctx.diagnostics, at.span.file, `Section "${kind}" base address out of range (0..65535).`);
      return undefined;
    }
    return value;
  };

  const explicitCodeBase = evalBase('code');
  const explicitDataBase = evalBase('data');
  const explicitVarBase = evalBase('var');
  const codeOk = explicitCodeBase !== undefined || !ctx.baseExprs.code;
  const codeBase = explicitCodeBase ?? (ctx.defaultCodeBase ?? 0);
  const dataBase =
    explicitDataBase ??
    (codeOk
      ? ctx.alignTo(codeBase + ctx.codeOffset, 2)
      : (ctx.diag(
          ctx.diagnostics,
          ctx.primaryFile,
          `Cannot compute default data base address because code base address is invalid.`,
        ),
        0));
  const dataOk = explicitDataBase !== undefined || (ctx.baseExprs.data === undefined && codeOk);
  const varBase =
    explicitVarBase ??
    (dataOk
      ? ctx.alignTo(dataBase + ctx.dataOffset, 2)
      : (ctx.diag(
          ctx.diagnostics,
          ctx.primaryFile,
          `Cannot compute default var base address because data base address is invalid.`,
        ),
        0));
  const varOk = explicitVarBase !== undefined || (ctx.baseExprs.var === undefined && dataOk);

  const addrByNameLower = new Map<string, number>();
  for (const ps of ctx.pending) {
    const base = ps.section === 'code' ? codeBase : ps.section === 'data' ? dataBase : varBase;
    const ok = ps.section === 'code' ? codeOk : ps.section === 'data' ? dataOk : varOk;
    if (!ok) continue;
    addrByNameLower.set(ps.name.toLowerCase(), base + ps.offset);
  }
  for (const sym of ctx.symbols) {
    if (sym.kind === 'constant') continue;
    addrByNameLower.set(sym.name.toLowerCase(), sym.address);
  }
  for (const sym of ctx.absoluteSymbols) {
    if (sym.kind === 'constant' || sym.address === undefined) continue;
    addrByNameLower.set(sym.name.toLowerCase(), sym.address);
  }
  for (const ex of ctx.deferredExterns) {
    const base = addrByNameLower.get(ex.baseLower);
    if (base === undefined) {
      ctx.diag(
        ctx.diagnostics,
        ex.file,
        `Failed to resolve extern base symbol "${ex.baseLower}" for "${ex.name}".`,
      );
      continue;
    }
    const addr = base + ex.addend;
    if (addr < 0 || addr > 0xffff) {
      ctx.diag(
        ctx.diagnostics,
        ex.file,
        `extern func "${ex.name}" resolved address out of range (0..65535).`,
      );
      continue;
    }
    addrByNameLower.set(ex.name.toLowerCase(), addr);
    ctx.symbols.push({
      kind: 'label',
      name: ex.name,
      address: addr,
      file: ex.file,
      line: ex.line,
      scope: 'global',
    });
  }

  // Absolute fixups are resolved in a dedicated second pass after all labels,
  // data bases, and deferred extern addresses are known.
  for (const fx of ctx.fixups) {
    const base = addrByNameLower.get(fx.baseLower);
    const addr = base === undefined ? undefined : base + fx.addend;
    if (addr === undefined) {
      ctx.diag(ctx.diagnostics, fx.file, `Unresolved symbol "${fx.baseLower}" in 16-bit fixup.`);
      continue;
    }
    if (addr < 0 || addr > 0xffff) {
      ctx.diag(
        ctx.diagnostics,
        fx.file,
        `16-bit fixup address out of range for "${fx.baseLower}" with addend ${fx.addend}: ${addr}.`,
      );
      continue;
    }
    ctx.codeBytes.set(fx.offset, addr & 0xff);
    ctx.codeBytes.set(fx.offset + 1, (addr >> 8) & 0xff);
  }

  // rel8 fixups must also wait until code base + label addresses are finalized
  // so branch displacements are computed from final absolute origins.
  for (const fx of ctx.rel8Fixups) {
    const base = addrByNameLower.get(fx.baseLower);
    const target = base === undefined ? undefined : base + fx.addend;
    if (target === undefined) {
      ctx.diag(
        ctx.diagnostics,
        fx.file,
        `Unresolved symbol "${fx.baseLower}" in rel8 ${fx.mnemonic} fixup.`,
      );
      continue;
    }
    const origin = codeBase + fx.origin;
    const disp = target - origin;
    if (disp < -128 || disp > 127) {
      ctx.diag(
        ctx.diagnostics,
        fx.file,
        `${fx.mnemonic} target out of range for rel8 branch (${disp}, expected -128..127).`,
      );
      continue;
    }
    ctx.codeBytes.set(fx.offset, disp & 0xff);
  }

  for (const [addr, b] of ctx.hexBytes) {
    if (addr < 0 || addr > 0xffff) {
      ctx.diag(ctx.diagnostics, ctx.primaryFile, `HEX byte address out of range: ${addr}.`);
      continue;
    }
    if (ctx.bytes.has(addr)) {
      ctx.diag(ctx.diagnostics, ctx.primaryFile, `HEX data overlaps emitted bytes at address ${addr}.`);
      continue;
    }
    ctx.bytes.set(addr, b);
  }

  if (codeOk) {
    ctx.writeSection(codeBase, ctx.codeBytes, ctx.bytes, (message) =>
      ctx.diag(ctx.diagnostics, ctx.primaryFile, message),
    );
  }
  if (dataOk) {
    ctx.writeSection(dataBase, ctx.dataBytes, ctx.bytes, (message) =>
      ctx.diag(ctx.diagnostics, ctx.primaryFile, message),
    );
  }

  for (const ps of ctx.pending) {
    const base = ps.section === 'code' ? codeBase : ps.section === 'data' ? dataBase : varBase;
    const ok = ps.section === 'code' ? codeOk : ps.section === 'data' ? dataOk : varOk;
    if (!ok) continue;
    ctx.symbols.push({
      kind: ps.kind,
      name: ps.name,
      address: base + ps.offset,
      ...(ps.file !== undefined ? { file: ps.file } : {}),
      ...(ps.line !== undefined ? { line: ps.line } : {}),
      ...(ps.scope !== undefined ? { scope: ps.scope } : {}),
      ...(ps.size !== undefined ? { size: ps.size } : {}),
    });
  }
  ctx.symbols.push(...ctx.absoluteSymbols);

  return {
    codeBase,
    dataBase,
    varBase,
    codeOk,
    dataOk,
    varOk,
    writtenRange: ctx.computeWrittenRange(ctx.bytes),
    sourceSegments: codeOk ? ctx.rebaseCodeSourceSegments(codeBase, ctx.codeSourceSegments) : [],
    asmTrace: codeOk ? ctx.rebaseAsmTrace(codeBase, ctx.codeAsmTrace) : [],
  };
}
