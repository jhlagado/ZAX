import type {
  BinDeclNode,
  DataBlockNode,
  DataDeclNode,
  EaExprNode,
  ExternDeclNode,
  FuncDeclNode,
  HexDeclNode,
  ModuleItemNode,
  NamedSectionNode,
  OpDeclNode,
  ProgramNode,
  RawDataDeclNode,
  SectionItemNode,
  TypeExprNode,
  VarBlockNode,
  VarDeclNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { Callable } from './loweringTypes.js';

export type ProgramPrescanContext = {
  program: ProgramNode;
  env: CompileEnv;
  localCallablesByFile: Map<string, Map<string, Callable>>;
  visibleCallables: Map<string, Callable>;
  localOpsByFile: Map<string, Map<string, OpDeclNode[]>>;
  visibleOpsByName: Map<string, OpDeclNode[]>;
  declaredOpNames: Set<string>;
  declaredBinNames: Set<string>;
  storageTypes: Map<string, TypeExprNode>;
  moduleAliasTargets: Map<string, EaExprNode>;
  moduleAliasDecls: Map<string, VarDeclNode>;
  rawAddressSymbols: Set<string>;
  resolveScalarKind: (typeExpr: TypeExprNode) => 'byte' | 'word' | 'addr' | undefined;
};

export type PrescanResult = {
  localCallablesByFile: ProgramPrescanContext['localCallablesByFile'];
  visibleCallables: ProgramPrescanContext['visibleCallables'];
  localOpsByFile: ProgramPrescanContext['localOpsByFile'];
  visibleOpsByName: ProgramPrescanContext['visibleOpsByName'];
  declaredOpNames: ProgramPrescanContext['declaredOpNames'];
  declaredBinNames: ProgramPrescanContext['declaredBinNames'];
  storageTypes: ProgramPrescanContext['storageTypes'];
  moduleAliasTargets: ProgramPrescanContext['moduleAliasTargets'];
  moduleAliasDecls: ProgramPrescanContext['moduleAliasDecls'];
  rawAddressSymbols: ProgramPrescanContext['rawAddressSymbols'];
};

function getOrCreateFileCallables(
  ctx: ProgramPrescanContext,
  file: string,
): Map<string, Callable> {
  const existing = ctx.localCallablesByFile.get(file);
  if (existing) return existing;
  const created = new Map<string, Callable>();
  ctx.localCallablesByFile.set(file, created);
  return created;
}

function getOrCreateFileOps(
  ctx: ProgramPrescanContext,
  file: string,
): Map<string, OpDeclNode[]> {
  const existing = ctx.localOpsByFile.get(file);
  if (existing) return existing;
  const created = new Map<string, OpDeclNode[]>();
  ctx.localOpsByFile.set(file, created);
  return created;
}

function preScanItem(
  item: ModuleItemNode | SectionItemNode,
  ctx: ProgramPrescanContext,
  namedSection?: NamedSectionNode,
): void {
  if (item.kind === 'NamedSection') {
    for (const sectionItem of item.items) preScanItem(sectionItem, ctx, item);
    return;
  }

  if (item.kind === 'FuncDecl') {
    const funcDecl = item as FuncDeclNode;
    const fileCallables = getOrCreateFileCallables(ctx, funcDecl.span.file);
    fileCallables.set(funcDecl.name.toLowerCase(), { kind: 'func', node: funcDecl });
    if (funcDecl.exported) {
      const moduleId = (ctx.env.moduleIds?.get(funcDecl.span.file) ?? funcDecl.span.file).toLowerCase();
      ctx.visibleCallables.set(`${moduleId}.${funcDecl.name.toLowerCase()}`, {
        kind: 'func',
        node: funcDecl,
      });
    }
    return;
  }

  if (item.kind === 'OpDecl') {
    const opDecl = item as OpDeclNode;
    const key = opDecl.name.toLowerCase();
    const fileOps = getOrCreateFileOps(ctx, opDecl.span.file);
    const existing = fileOps.get(key);
    if (existing) existing.push(opDecl);
    else fileOps.set(key, [opDecl]);
    if (opDecl.exported) {
      const moduleId = (ctx.env.moduleIds?.get(opDecl.span.file) ?? opDecl.span.file).toLowerCase();
      const qualified = `${moduleId}.${key}`;
      const visible = ctx.visibleOpsByName.get(qualified);
      if (visible) visible.push(opDecl);
      else ctx.visibleOpsByName.set(qualified, [opDecl]);
    }
    return;
  }

  if (item.kind === 'ExternDecl') {
    const externDecl = item as ExternDeclNode;
    const fileCallables = getOrCreateFileCallables(ctx, externDecl.span.file);
    for (const fn of externDecl.funcs) {
      fileCallables.set(fn.name.toLowerCase(), {
        kind: 'extern',
        node: fn,
        targetLower: fn.name.toLowerCase(),
      });
    }
    return;
  }

  if (item.kind === 'VarBlock' && item.scope === 'module') {
    if (namedSection) return;
    const varBlock = item as VarBlockNode;
    for (const decl of varBlock.decls) {
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
    return;
  }

  if (item.kind === 'BinDecl') {
    const binDecl = item as BinDeclNode;
    if (namedSection && binDecl.section !== namedSection.section) return;
    ctx.declaredBinNames.add(binDecl.name.toLowerCase());
    ctx.rawAddressSymbols.add(binDecl.name.toLowerCase());
    ctx.storageTypes.set(binDecl.name.toLowerCase(), {
      kind: 'TypeName',
      span: binDecl.span,
      name: 'addr',
    });
    return;
  }

  if (item.kind === 'HexDecl') {
    const hexDecl = item as HexDeclNode;
    ctx.rawAddressSymbols.add(hexDecl.name.toLowerCase());
    ctx.storageTypes.set(hexDecl.name.toLowerCase(), {
      kind: 'TypeName',
      span: hexDecl.span,
      name: 'addr',
    });
    return;
  }

  if (item.kind === 'DataBlock') {
    const dataBlock = item as DataBlockNode;
    for (const decl of dataBlock.decls) {
      const lower = decl.name.toLowerCase();
      ctx.storageTypes.set(lower, decl.typeExpr);
      const scalar = ctx.resolveScalarKind(decl.typeExpr);
      if (!scalar) ctx.rawAddressSymbols.add(lower);
    }
    return;
  }

  if (item.kind === 'DataDecl') {
    if (namedSection && namedSection.section !== 'data') return;
    const dataDecl = item as DataDeclNode;
    const lower = dataDecl.name.toLowerCase();
    ctx.storageTypes.set(lower, dataDecl.typeExpr);
    const scalar = ctx.resolveScalarKind(dataDecl.typeExpr);
    if (!scalar) ctx.rawAddressSymbols.add(lower);
    return;
  }

  if (item.kind === 'RawDataDecl') {
    if (namedSection && namedSection.section !== 'data') return;
    const rawDataDecl = item as RawDataDeclNode;
    ctx.rawAddressSymbols.add(rawDataDecl.name.toLowerCase());
  }
}

export function preScanProgramDeclarations(ctx: ProgramPrescanContext): PrescanResult {
  for (const module of ctx.program.files) {
    for (const item of module.items) preScanItem(item, ctx);
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
