import type { AsmOperandNode, EaExprNode, SourceSpan } from '../frontend/ast.js';
import type { EaResolution } from './eaResolution.js';

/** Inputs for {@link createEaMaterializationHelpers} — emission hooks plus `resolveEa`, not the EA type-resolution bag (`EAResolutionContext`). */
export type EAMaterializationContext = {
  resolveEa: (ea: EaExprNode, span: SourceSpan) => EaResolution | undefined;
  pushEaAddress: (ea: EaExprNode, span: SourceSpan) => boolean;
  emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  emitAbs16Fixup: (opcode: number, target: string, addend: number, span: SourceSpan) => void;
  loadImm16ToDE: (value: number, span: SourceSpan) => boolean;
};

export function createEaMaterializationHelpers(ctx: EAMaterializationContext) {
  const materializeEaAddressToHL = (ea: EaExprNode, span: SourceSpan): boolean => {
    const resolved = ctx.resolveEa(ea, span);
    if (!resolved) {
      if (!ctx.pushEaAddress(ea, span)) return false;
      return ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span);
    }

    if (resolved.kind === 'abs') {
      ctx.emitAbs16Fixup(0x21, resolved.baseLower, resolved.addend, span);
      return true;
    }
    if (!ctx.pushEaAddress(ea, span)) return false;
    return ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span);
  };

  return {
    materializeEaAddressToHL,
  };
}
