import type { AsmOperandNode, ImmExprNode, SourceSpan } from '../frontend/ast.js';
import type { LoweringContext } from './programLowering.js';

export type ClassicNode = {
  kind: string;
  span: SourceSpan;
  name?: string;
  value?: ImmExprNode;
  expr?: ImmExprNode;
  directive?: 'db' | 'dw' | 'ds' | 'cstr' | 'pstr' | 'istr';
  values?: unknown[];
  size?: ImmExprNode;
  fill?: ImmExprNode;
  head?: string;
  operands?: AsmOperandNode[];
};

function isKind(item: { kind: string }, ...kinds: string[]): boolean {
  return kinds.includes(item.kind);
}

export function isClassicEqu(item: { kind: string }): boolean {
  return isKind(item, 'ClassicEqu', 'ClassicEquDecl', 'EquDecl');
}

export function isClassicOrg(item: { kind: string }): boolean {
  return isKind(item, 'ClassicOrg', 'ClassicOrgDirective', 'OrgDirective');
}

export function isClassicAlign(item: { kind: string }): boolean {
  return isKind(item, 'ClassicAlign', 'ClassicAlignDirective');
}

export function isClassicRawData(item: { kind: string }): boolean {
  return isKind(item, 'ClassicRawData', 'ClassicRawDataDecl') || 'valuesText' in item;
}

export function isClassicBinFrom(item: { kind: string }): boolean {
  return isKind(item, 'ClassicBinFrom', 'ClassicBinFromDirective', 'BinFromDirective');
}

export function isClassicBinTo(item: { kind: string }): boolean {
  return isKind(item, 'ClassicBinTo', 'ClassicBinToDirective', 'BinToDirective');
}

export function isClassicEnd(item: { kind: string }): boolean {
  return isKind(item, 'ClassicEnd', 'ClassicEndDirective');
}

export function classicExpr(item: ClassicNode): ImmExprNode | undefined {
  return item.value ?? item.expr;
}

export function activeSectionOffset(ctx: LoweringContext): number {
  return ctx.activeSectionRef.current === 'data' ? ctx.dataOffsetRef.current : ctx.codeOffsetRef.current;
}

export function activeSectionAddress(ctx: LoweringContext): number | undefined {
  const offset = activeSectionOffset(ctx);
  const baseExpr =
    ctx.activeSectionRef.current === 'data' ? ctx.baseExprs.data : ctx.baseExprs.code;
  if (!baseExpr) return offset;
  const base = ctx.evalImmExpr(baseExpr, ctx.env, ctx.diagnostics);
  return base === undefined ? undefined : base + offset;
}

export function publishClassicAddressConst(ctx: LoweringContext, name: string, address: number): void {
  ctx.env.consts.set(name, address);
  ctx.env.consts.set(name.toLowerCase(), address);
}
