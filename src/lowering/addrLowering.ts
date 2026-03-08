import type { AsmAddrNode, AsmOperandNode, EaExprNode, SourceSpan } from '../frontend/ast.js';

type Context = {
  emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  materializeEaAddressToHL: (ea: EaExprNode, span: SourceSpan) => boolean;
};

export function createAddrLoweringHelpers(ctx: Context) {
  const preservedRegs: Array<'AF' | 'BC' | 'DE'> = ['AF', 'BC', 'DE'];

  const lowerAsmAddr = (item: AsmAddrNode): boolean => {
    for (const reg of preservedRegs) {
      if (!ctx.emitInstr('push', [{ kind: 'Reg', span: item.span, name: reg }], item.span)) return false;
    }

    if (!ctx.materializeEaAddressToHL(item.expr, item.span)) return false;

    for (let i = preservedRegs.length - 1; i >= 0; i--) {
      const reg = preservedRegs[i]!;
      if (!ctx.emitInstr('pop', [{ kind: 'Reg', span: item.span, name: reg }], item.span)) return false;
    }

    return true;
  };

  return {
    lowerAsmAddr,
  };
}
