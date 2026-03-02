import {
  LOAD_RP_FVAR,
  LOAD_RP_GLOB,
  STORE_RP_FVAR,
  STORE_RP_GLOB,
  type StepPipeline,
} from '../addressing/steps.js';
import type { SourceSpan, TypeExprNode } from '../frontend/ast.js';
import type { EaResolution } from './eaResolution.js';
import type { ScalarKind } from './typeResolution.js';

type ScalarWordAccessorContext = {
  emitStepPipeline: (pipeline: StepPipeline, span: SourceSpan) => boolean;
  resolveScalarKind: (typeExpr: TypeExprNode) => ScalarKind | undefined;
};

export function createScalarWordAccessorHelpers(ctx: ScalarWordAccessorContext) {
  const resolvedScalarKind = (resolved: EaResolution | undefined): ScalarKind | undefined =>
    resolved?.typeExpr ? ctx.resolveScalarKind(resolved.typeExpr) : undefined;

  const isWordCompatibleScalarKind = (
    scalar: ScalarKind | undefined,
  ): scalar is 'word' | 'addr' => scalar === 'word' || scalar === 'addr';

  const canUseScalarWordAccessor = (resolved: EaResolution | undefined): boolean =>
    !!resolved &&
    isWordCompatibleScalarKind(resolvedScalarKind(resolved)) &&
    ((resolved.kind === 'abs' && resolved.addend === 0) || resolved.kind === 'stack');

  const emitScalarWordLoad = (
    target: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ): boolean => {
    if (!resolved) return false;
    if (resolved.kind === 'abs' && resolved.addend === 0) {
      return ctx.emitStepPipeline(LOAD_RP_GLOB(target, resolved.baseLower), span);
    }
    if (resolved.kind === 'stack') {
      return ctx.emitStepPipeline(LOAD_RP_FVAR(target, resolved.ixDisp), span);
    }
    return false;
  };

  const emitScalarWordStore = (
    source: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ): boolean => {
    if (!resolved) return false;
    if (resolved.kind === 'abs' && resolved.addend === 0) {
      return ctx.emitStepPipeline(STORE_RP_GLOB(source, resolved.baseLower), span);
    }
    if (resolved.kind === 'stack') {
      return ctx.emitStepPipeline(STORE_RP_FVAR(source, resolved.ixDisp), span);
    }
    return false;
  };

  return {
    resolvedScalarKind,
    isWordCompatibleScalarKind,
    canUseScalarWordAccessor,
    emitScalarWordLoad,
    emitScalarWordStore,
  };
}
