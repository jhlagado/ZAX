import type { Diagnostic } from '../diagnostics/types.js';
import type { EaExprNode, SourceSpan, TypeExprNode } from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import { preRoundSizeOfTypeExpr } from '../semantics/layout.js';

export type EaResolution =
  | { kind: 'abs'; baseLower: string; addend: number; typeExpr?: TypeExprNode }
  | { kind: 'stack'; ixDisp: number; typeExpr?: TypeExprNode }
  | { kind: 'indirect'; ixDisp: number; addend: number; typeExpr?: TypeExprNode };

type EaResolutionContext = {
  env: CompileEnv;
  diagnostics: Diagnostic[];
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  stackSlotOffsets: Map<string, number>;
  stackSlotTypes: Map<string, TypeExprNode>;
  storageTypes: Map<string, TypeExprNode>;
  moduleAliasTargets: Map<string, EaExprNode>;
  getLocalAliasTargets: () => Map<string, EaExprNode>;
  evalImmExpr: (expr: import('../frontend/ast.js').ImmExprNode) => number | undefined;
  evalImmNoDiag: (expr: import('../frontend/ast.js').ImmExprNode) => number | undefined;
  resolveScalarKind: (typeExpr: TypeExprNode) => 'byte' | 'word' | 'addr' | undefined;
  resolveAggregateType: (
    te: TypeExprNode,
  ) => { kind: 'record' | 'union'; fields: import('../frontend/ast.js').RecordFieldNode[] } | undefined;
  resolveEaTypeExpr: (ea: EaExprNode) => TypeExprNode | undefined;
  sizeOfTypeExpr: (te: TypeExprNode) => number | undefined;
};

export function createEaResolutionHelpers(ctx: EaResolutionContext) {
  const resolveAliasTarget = (nameLower: string): EaExprNode | undefined =>
    ctx.getLocalAliasTargets().get(nameLower) ?? ctx.moduleAliasTargets.get(nameLower);

  const resolveEa = (ea: EaExprNode, span: SourceSpan): EaResolution | undefined => {
    const go = (expr: EaExprNode, visitingAliases: Set<string>): EaResolution | undefined => {
      switch (expr.kind) {
        case 'EaName': {
          const baseLower = expr.name.toLowerCase();
          const slotOff = ctx.stackSlotOffsets.get(baseLower);
          if (slotOff !== undefined) {
            const slotType = ctx.stackSlotTypes.get(baseLower);
            const scalarKind = slotType ? ctx.resolveScalarKind(slotType) : undefined;
            if (slotType && scalarKind === undefined) {
              return {
                kind: 'indirect',
                ixDisp: slotOff,
                addend: 0,
                typeExpr: slotType,
              };
            }
            return {
              kind: 'stack',
              ixDisp: slotOff,
              ...(slotType ? { typeExpr: slotType } : {}),
            };
          }
          const aliasTarget = resolveAliasTarget(baseLower);
          if (aliasTarget) {
            if (visitingAliases.has(baseLower)) return undefined;
            visitingAliases.add(baseLower);
            try {
              return go(aliasTarget, visitingAliases);
            } finally {
              visitingAliases.delete(baseLower);
            }
          }
          const typeExpr = ctx.storageTypes.get(baseLower);
          return { kind: 'abs', baseLower, addend: 0, ...(typeExpr ? { typeExpr } : {}) };
        }
        case 'EaAdd':
        case 'EaSub': {
          const base = go(expr.base, visitingAliases);
          if (!base) return undefined;
          const v = ctx.evalImmNoDiag(expr.offset);
          if (v === undefined) return undefined;
          const delta = expr.kind === 'EaAdd' ? v : -v;
          if (base.kind === 'abs') return { ...base, addend: base.addend + delta };
          if (base.kind === 'indirect') return { ...base, addend: base.addend + delta };
          return { ...base, ixDisp: base.ixDisp + delta };
        }
        case 'EaField': {
          const base = go(expr.base, visitingAliases);
          if (!base) return undefined;
          if (!base.typeExpr) {
            ctx.diagAt(ctx.diagnostics, span, `Cannot resolve field "${expr.field}" without a typed base.`);
            return undefined;
          }
          const agg = ctx.resolveAggregateType(base.typeExpr);
          if (!agg) {
            ctx.diagAt(
              ctx.diagnostics,
              span,
              `Field access ".${expr.field}" requires a record or union type.`,
            );
            return undefined;
          }

          let off = 0;
          for (const f of agg.fields) {
            if (f.name === expr.field) {
              if (base.kind === 'abs') {
                return {
                  kind: 'abs',
                  baseLower: base.baseLower,
                  addend: base.addend + off,
                  typeExpr: f.typeExpr,
                };
              }
              if (base.kind === 'indirect') {
                return {
                  kind: 'indirect',
                  ixDisp: base.ixDisp,
                  addend: base.addend + off,
                  typeExpr: f.typeExpr,
                };
              }
              return {
                kind: 'stack',
                ixDisp: base.ixDisp + off,
                typeExpr: f.typeExpr,
              };
            }
            if (agg.kind === 'record') {
              const sz = preRoundSizeOfTypeExpr(f.typeExpr, ctx.env, ctx.diagnostics);
              if (sz === undefined) return undefined;
              off += sz;
            }
          }
          const kind = agg.kind === 'union' ? 'union' : 'record';
          ctx.diagAt(ctx.diagnostics, span, `Unknown ${kind} field "${expr.field}".`);
          return undefined;
        }
        case 'EaIndex': {
          const base = go(expr.base, visitingAliases);
          if (!base) return undefined;
          if (!base.typeExpr) {
            ctx.diagAt(ctx.diagnostics, span, `Cannot resolve indexing without a typed base.`);
            return undefined;
          }
          if (base.typeExpr.kind !== 'ArrayType') {
            ctx.diagAt(ctx.diagnostics, span, `Indexing requires an array type.`);
            return undefined;
          }
          const elemSize = ctx.sizeOfTypeExpr(base.typeExpr.element);
          if (elemSize === undefined) return undefined;

          if (expr.index.kind === 'IndexImm') {
            const idx = ctx.evalImmExpr(expr.index.value);
            if (idx === undefined) return undefined;
            const delta = idx * elemSize;
            if (base.kind === 'abs') {
              return {
                kind: 'abs',
                baseLower: base.baseLower,
                addend: base.addend + delta,
                typeExpr: base.typeExpr.element,
              };
            }
            if (base.kind === 'indirect') {
              return {
                kind: 'indirect',
                ixDisp: base.ixDisp,
                addend: base.addend + delta,
                typeExpr: base.typeExpr.element,
              };
            }
            return {
              kind: 'stack',
              ixDisp: base.ixDisp + delta,
              typeExpr: base.typeExpr.element,
            };
          }

          return undefined;
        }
      }
    };

    return go(ea, new Set<string>());
  };

  return {
    resolveAliasTarget,
    resolveEa,
  };
}
