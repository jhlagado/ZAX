import type { Diagnostic } from '../diagnostics/types.js';
import type { AsmOperandNode, EaExprNode, ImmExprNode, SourceSpan, TypeExprNode } from '../frontend/ast.js';
import type { EaResolution } from './eaResolution.js';
import type { StepPipeline } from '../addressing/steps.js';

type DiagAt = (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;

type Context = {
  diagnostics: Diagnostic[];
  diagAt: DiagAt;
  reg8: Set<string>;
  resolveEa: (ea: EaExprNode, span: SourceSpan) => EaResolution | undefined;
  resolveEaTypeExpr: (ea: EaExprNode) => TypeExprNode | undefined;
  resolveScalarBinding: (name: string) => 'byte' | 'word' | 'addr' | undefined;
  resolveScalarKind: (typeExpr: TypeExprNode) => 'byte' | 'word' | 'addr' | undefined;
  sizeOfTypeExpr: (typeExpr: TypeExprNode) => number | undefined;
  evalImmExpr: (expr: ImmExprNode) => number | undefined;
  evalImmNoDiag: (expr: ImmExprNode) => number | undefined;
  emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  emitRawCodeBytes: (bytes: Uint8Array, file: string, asmText: string) => void;
  emitAbs16Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  loadImm16ToDE: (value: number, span: SourceSpan) => boolean;
  loadImm16ToHL: (value: number, span: SourceSpan) => boolean;
  negateHL: (span: SourceSpan) => boolean;
  pushZeroExtendedReg8: (reg: string, span: SourceSpan) => boolean;
  emitStepPipeline: (pipeline: StepPipeline, span: SourceSpan) => boolean;
  buildEaBytePipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  buildEaWordPipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  emitScalarWordLoad: (target: 'HL' | 'DE' | 'BC', resolved: EaResolution | undefined, span: SourceSpan) => boolean;
  formatIxDisp: (disp: number) => string;
  TEMPLATE_L_ABC: (dest: string, ea: StepPipeline) => StepPipeline;
  TEMPLATE_LW_DE: (ea: StepPipeline) => StepPipeline;
  LOAD_RP_EA: (rp: 'HL' | 'DE' | 'BC') => StepPipeline;
  STORE_RP_EA: (rp: 'DE' | 'BC') => StepPipeline;
};

export function createValueMaterializationHelpers(ctx: Context) {
  const emitLoadWordFromHlAddress = (target: 'HL' | 'DE' | 'BC', span: SourceSpan): boolean => {
    if (target === 'DE') {
      return ctx.emitStepPipeline(ctx.LOAD_RP_EA('DE'), span);
    }
    if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
    if (!ctx.emitStepPipeline(ctx.LOAD_RP_EA(target), span)) return false;
    return ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span);
  };

  const emitStoreWordToHlAddress = (source: 'DE' | 'BC', span: SourceSpan): boolean =>
    ctx.emitStepPipeline(ctx.STORE_RP_EA(source), span);

  let pushEaAddress: (ea: EaExprNode, span: SourceSpan) => boolean;

  const emitStoreSavedHlToEa = (ea: EaExprNode, span: SourceSpan): boolean => {
    if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
    if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
    if (!pushEaAddress(ea, span)) return false;
    if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
    if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
    if (!emitStoreWordToHlAddress('DE', span)) return false;
    return ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span);
  };

  const pushMemValue = (ea: EaExprNode, want: 'byte' | 'word', span: SourceSpan): boolean => {
    if (want === 'word') {
      const r = ctx.resolveEa(ea, span);
      if (ctx.emitScalarWordLoad('HL', r, span)) {
        return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }
      if (r?.kind === 'abs') {
        ctx.emitAbs16Fixup(0x2a, r.baseLower, r.addend, span);
        return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }
      const pipe = ctx.buildEaWordPipeline(ea, span);
      if (pipe) {
        if (!ctx.emitStepPipeline(ctx.TEMPLATE_LW_DE(pipe), span)) return false;
        return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span);
      }
      if (!pushEaAddress(ea, span)) return false;
      if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
      ctx.emitRawCodeBytes(
        Uint8Array.of(0x5e, 0x23, 0x56, 0xeb),
        span.file,
        'ld e, (hl) ; inc hl ; ld d, (hl) ; ex de, hl',
      );
      return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
    }

    const r = ctx.resolveEa(ea, span);
    if (r?.kind === 'abs') {
      ctx.emitAbs16Fixup(0x3a, r.baseLower, r.addend, span);
      return ctx.pushZeroExtendedReg8('A', span);
    }
    if (r?.kind === 'stack' && r.ixDisp >= -128 && r.ixDisp <= 127) {
      const d = r.ixDisp & 0xff;
      ctx.emitRawCodeBytes(
        Uint8Array.of(0xdd, 0x5e, d),
        span.file,
        `ld e, (ix${ctx.formatIxDisp(r.ixDisp)})`,
      );
      return ctx.pushZeroExtendedReg8('E', span);
    }

    const eaPipe = ctx.buildEaBytePipeline(ea, span);
    if (!eaPipe) return false;
    const templated = ctx.TEMPLATE_L_ABC('A', eaPipe);
    return ctx.emitStepPipeline(templated, span) && ctx.pushZeroExtendedReg8('A', span);
  };

  pushEaAddress = (ea: EaExprNode, span: SourceSpan): boolean => {
    const r = ctx.resolveEa(ea, span);
    if (!r && ea.kind === 'EaIndex' && (ea.index.kind === 'IndexReg8' || ea.index.kind === 'IndexReg16')) {
      const baseResolved = ctx.resolveEa(ea.base, span);
      const baseType = ctx.resolveEaTypeExpr(ea.base);
      if (!baseResolved || !baseType || baseType.kind !== 'ArrayType') return false;
      const elemSize = ctx.sizeOfTypeExpr(baseType.element);
      const shiftCount = (() => {
        if (elemSize === undefined) return -1;
        let n = elemSize;
        let s = 0;
        while (n > 1 && (n & 1) === 0) {
          n >>= 1;
          s++;
        }
        return n === 1 ? s : -1;
      })();
      if (shiftCount < 0 || shiftCount > 4) return false;

      const loadIndexToHL = (): boolean => {
        const index = ea.index;
        if (index.kind === 'IndexReg16') {
          const r16 = index.reg.toUpperCase();
          if (r16 === 'HL') return true;
          if (r16 === 'DE' || r16 === 'BC') {
            const hi = r16 === 'DE' ? 'D' : 'B';
            const lo = r16 === 'DE' ? 'E' : 'C';
            return (
              ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'H' }, { kind: 'Reg', span, name: hi }], span) &&
              ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'L' }, { kind: 'Reg', span, name: lo }], span)
            );
          }
          ctx.diagAt(ctx.diagnostics, span, `Invalid reg16 index "${index.reg}".`);
          return false;
        }
        if (index.kind !== 'IndexReg8') return false;
        const r8 = index.reg.toUpperCase();
        if (!ctx.reg8.has(r8)) {
          ctx.diagAt(ctx.diagnostics, span, `Invalid reg8 index "${index.reg}".`);
          return false;
        }
        return (
          ctx.emitInstr(
            'ld',
            [{ kind: 'Reg', span, name: 'H' }, { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } }],
            span,
          ) &&
          ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'L' }, { kind: 'Reg', span, name: r8 }], span)
        );
      };

      if (!loadIndexToHL()) return false;
      for (let i = 0; i < shiftCount; i++) {
        if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'HL' }], span))
          return false;
      }

      if (baseResolved.kind === 'abs') {
        ctx.emitAbs16Fixup(0x11, baseResolved.baseLower, baseResolved.addend, span);
        if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
          return false;
        return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }

      if (!ctx.emitInstr('ex', [{ kind: 'Reg', span, name: 'DE' }, { kind: 'Reg', span, name: 'HL' }], span))
        return false;
      if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
      if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'IX' }], span)) return false;
      if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
      if (baseResolved.ixDisp !== 0) {
        if (!ctx.loadImm16ToDE(baseResolved.ixDisp, span)) return false;
        if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
          return false;
      }
      if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
      if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
        return false;
      return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
    }

    if (!r) {
      type RuntimeLinear = {
        constTerm: number;
        atomName?: string;
        atomKind?: 'byte' | 'word' | 'addr';
        coeff: number;
      };
      const mkRuntimeLinear = (
        constTerm: number,
        coeff: number,
        atom?: { name: string; kind: 'byte' | 'word' | 'addr' },
      ): RuntimeLinear => (atom ? { constTerm, coeff, atomName: atom.name, atomKind: atom.kind } : { constTerm, coeff });
      const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;
      const combineRuntimeLinear = (
        left: RuntimeLinear | undefined,
        right: RuntimeLinear | undefined,
        op: '+' | '-',
      ): RuntimeLinear | undefined => {
        if (!left || !right) return undefined;
        const rightCoeff = op === '+' ? right.coeff : -right.coeff;
        const rightConst = op === '+' ? right.constTerm : -right.constTerm;
        if (!left.atomName && !right.atomName) return mkRuntimeLinear(left.constTerm + rightConst, 0);
        if (!left.atomName) {
          if (!right.atomName || !right.atomKind) return undefined;
          return mkRuntimeLinear(left.constTerm + rightConst, rightCoeff, {
            name: right.atomName,
            kind: right.atomKind,
          });
        }
        if (!right.atomName) {
          if (!left.atomKind) return undefined;
          return mkRuntimeLinear(left.constTerm + rightConst, left.coeff, {
            name: left.atomName,
            kind: left.atomKind,
          });
        }
        if (left.atomName !== right.atomName || !left.atomKind) return undefined;
        return mkRuntimeLinear(left.constTerm + rightConst, left.coeff + rightCoeff, {
          name: left.atomName,
          kind: left.atomKind,
        });
      };
      const runtimeLinearFromImm = (expr: ImmExprNode): RuntimeLinear | undefined => {
        const imm = ctx.evalImmNoDiag(expr);
        if (imm !== undefined) return mkRuntimeLinear(imm, 0);
        switch (expr.kind) {
          case 'ImmLiteral':
          case 'ImmSizeof':
          case 'ImmOffsetof':
            return mkRuntimeLinear(ctx.evalImmExpr(expr) ?? 0, 0);
          case 'ImmName': {
            const scalar = ctx.resolveScalarBinding(expr.name);
            if (!scalar) return undefined;
            return mkRuntimeLinear(0, 1, { name: expr.name, kind: scalar });
          }
          case 'ImmUnary': {
            const inner = runtimeLinearFromImm(expr.expr);
            if (!inner) return undefined;
            if (expr.op === '+') return inner;
            if (expr.op === '-') {
              return inner.atomName && inner.atomKind
                ? mkRuntimeLinear(-inner.constTerm, -inner.coeff, {
                    name: inner.atomName,
                    kind: inner.atomKind,
                  })
                : mkRuntimeLinear(-inner.constTerm, -inner.coeff);
            }
            return undefined;
          }
          case 'ImmBinary': {
            const left = runtimeLinearFromImm(expr.left);
            const right = runtimeLinearFromImm(expr.right);
            if (!left || !right) return undefined;
            switch (expr.op) {
              case '+':
              case '-':
                return combineRuntimeLinear(left, right, expr.op);
              case '*': {
                const leftConstOnly = !left.atomName;
                const rightConstOnly = !right.atomName;
                if (leftConstOnly && rightConstOnly) return mkRuntimeLinear(left.constTerm * right.constTerm, 0);
                if (leftConstOnly && right.atomName) {
                  if (!right.atomKind) return undefined;
                  return mkRuntimeLinear(right.constTerm * left.constTerm, right.coeff * left.constTerm, {
                    name: right.atomName,
                    kind: right.atomKind,
                  });
                }
                if (rightConstOnly && left.atomName) {
                  if (!left.atomKind) return undefined;
                  return mkRuntimeLinear(left.constTerm * right.constTerm, left.coeff * right.constTerm, {
                    name: left.atomName,
                    kind: left.atomKind,
                  });
                }
                return undefined;
              }
              case '<<': {
                if (right.atomName) return undefined;
                const shift = right.constTerm;
                if (!Number.isInteger(shift) || shift < 0 || shift > 15) return undefined;
                const factor = 1 << shift;
                return left.atomName && left.atomKind
                  ? mkRuntimeLinear(left.constTerm * factor, left.coeff * factor, {
                      name: left.atomName,
                      kind: left.atomKind,
                    })
                  : mkRuntimeLinear(left.constTerm * factor, left.coeff * factor);
              }
              default:
                return undefined;
            }
          }
        }
      };
      const materializeRuntimeImmToHL = (expr: ImmExprNode, context: string): boolean => {
        const imm = ctx.evalImmExpr(expr);
        if (imm !== undefined) return ctx.loadImm16ToHL(imm & 0xffff, span);
        const linear = runtimeLinearFromImm(expr);
        if (!linear) {
          ctx.diagAt(
            ctx.diagnostics,
            span,
            `${context} is unsupported. Use a single scalar runtime atom with +, -, *, << and constants (no /, %, &, |, ^, >> on runtime atoms).`,
          );
          return false;
        }
        if (!linear.atomName || !linear.atomKind || linear.coeff === 0) {
          return ctx.loadImm16ToHL(linear.constTerm & 0xffff, span);
        }
        const coeffSign = linear.coeff < 0 ? -1 : 1;
        const coeffAbs = Math.abs(linear.coeff);
        if (!isPowerOfTwo(coeffAbs)) {
          ctx.diagAt(
            ctx.diagnostics,
            span,
            `${context} runtime multiplier must be a power-of-2; found ${linear.coeff}.`,
          );
          return false;
        }
        const atomEa: EaExprNode = { kind: 'EaName', span, name: linear.atomName };
        const want = linear.atomKind === 'byte' ? 'byte' : 'word';
        if (!pushMemValue(atomEa, want, span)) return false;
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        const shiftCount = coeffAbs <= 1 ? 0 : Math.log2(coeffAbs);
        for (let i = 0; i < shiftCount; i++) {
          if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'HL' }], span))
            return false;
        }
        if (coeffSign < 0 && !ctx.negateHL(span)) return false;
        const addend = linear.constTerm & 0xffff;
        if (addend !== 0) {
          if (!ctx.loadImm16ToDE(addend, span)) return false;
          if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
            return false;
        }
        return true;
      };

      if (ea.kind !== 'EaIndex' && ea.kind !== 'EaAdd' && ea.kind !== 'EaSub') return false;
      if (ea.kind === 'EaAdd' || ea.kind === 'EaSub') {
        if (!pushEaAddress(ea.base, span)) return false;
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        if (!materializeRuntimeImmToHL(ea.offset, 'Runtime EA offset expression')) return false;
        if (ea.kind === 'EaSub' && !ctx.negateHL(span)) return false;
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
        if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
          return false;
        return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }

      const baseType = ctx.resolveEaTypeExpr(ea.base);
      if (!baseType || baseType.kind !== 'ArrayType') {
        ctx.diagAt(ctx.diagnostics, span, `Unsupported ea argument: cannot lower indexed address.`);
        return false;
      }
      const elemSize = ctx.sizeOfTypeExpr(baseType.element);
      const shiftCount = (() => {
        if (elemSize === undefined) return -1;
        let n = elemSize;
        let s = 0;
        while (n > 1 && (n & 1) === 0) {
          n >>= 1;
          s++;
        }
        return n === 1 ? s : -1;
      })();
      if (shiftCount < 0 || shiftCount > 4) {
        ctx.diagAt(
          ctx.diagnostics,
          span,
          `Runtime indexing currently supports element sizes that are powers of two up to 16 bytes (got ${elemSize}).`,
        );
        return false;
      }

      if (ea.index.kind === 'IndexMemHL') {
        ctx.emitRawCodeBytes(Uint8Array.of(0x7e), span.file, 'ld a, (hl)');
      }
      if (ea.index.kind === 'IndexMemIxIy') {
        const memExpr: EaExprNode =
          ea.index.disp === undefined
            ? { kind: 'EaName', span, name: ea.index.base }
            : { kind: 'EaAdd', span, base: { kind: 'EaName', span, name: ea.index.base }, offset: ea.index.disp };
        if (!ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'A' }, { kind: 'Mem', span, expr: memExpr }], span))
          return false;
      }

      if (ea.index.kind === 'IndexImm') {
        if (!materializeRuntimeImmToHL(ea.index.value, 'Runtime array index expression')) return false;
      } else if (ea.index.kind === 'IndexEa') {
        const typeExpr = ctx.resolveEaTypeExpr(ea.index.expr);
        const scalar = typeExpr ? ctx.resolveScalarKind(typeExpr) : undefined;
        if (scalar === 'byte' || scalar === 'word' || scalar === 'addr') {
          const want = scalar === 'byte' ? 'byte' : 'word';
          if (!pushMemValue(ea.index.expr, want, span)) return false;
          if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        } else {
          ctx.diagAt(ctx.diagnostics, span, `Nested index expression must resolve to scalar byte/word/addr value.`);
          return false;
        }
      } else if (ea.index.kind === 'IndexReg8') {
        const r8 = ea.index.reg.toUpperCase();
        if (!ctx.reg8.has(r8)) {
          ctx.diagAt(ctx.diagnostics, span, `Invalid reg8 index "${ea.index.reg}".`);
          return false;
        }
        if (
          !ctx.emitInstr(
            'ld',
            [{ kind: 'Reg', span, name: 'H' }, { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } }],
            span,
          )
        )
          return false;
        if (!ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'L' }, { kind: 'Reg', span, name: r8 }], span))
          return false;
      } else if (ea.index.kind === 'IndexMemHL' || ea.index.kind === 'IndexMemIxIy') {
        if (!ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'L' }, { kind: 'Reg', span, name: 'A' }], span))
          return false;
        if (
          !ctx.emitInstr(
            'ld',
            [{ kind: 'Reg', span, name: 'H' }, { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } }],
            span,
          )
        )
          return false;
      } else if (ea.index.kind === 'IndexReg16') {
        const r16 = ea.index.reg.toUpperCase();
        if (r16 !== 'HL') {
          if (r16 !== 'DE' && r16 !== 'BC') {
            ctx.diagAt(ctx.diagnostics, span, `Invalid reg16 index "${ea.index.reg}".`);
            return false;
          }
          const hi = r16 === 'DE' ? 'D' : 'B';
          const lo = r16 === 'DE' ? 'E' : 'C';
          if (!ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'H' }, { kind: 'Reg', span, name: hi }], span))
            return false;
          if (!ctx.emitInstr('ld', [{ kind: 'Reg', span, name: 'L' }, { kind: 'Reg', span, name: lo }], span))
            return false;
        }
      } else {
        ctx.diagAt(ctx.diagnostics, span, `Non-constant array indices are not supported yet.`);
        return false;
      }

      for (let i = 0; i < shiftCount; i++) {
        if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'HL' }], span))
          return false;
      }
      if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;

      const baseResolved = ctx.resolveEa(ea.base, span);
      if (baseResolved?.kind === 'abs') {
        ctx.emitAbs16Fixup(0x21, baseResolved.baseLower, baseResolved.addend, span);
      } else if (baseResolved?.kind === 'stack') {
        if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
        if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'IX' }], span)) return false;
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        if (baseResolved.ixDisp !== 0) {
          if (!ctx.loadImm16ToDE(baseResolved.ixDisp & 0xffff, span)) return false;
          if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
            return false;
        }
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
      } else {
        if (!pushEaAddress(ea.base, span)) return false;
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
      }

      if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
      if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
        return false;
      return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
    }

    if (r.kind === 'abs') {
      ctx.emitAbs16Fixup(0x21, r.baseLower, r.addend, span);
      return ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
    }
    if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
    if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'IX' }], span)) return false;
    if (!ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
    if (r.ixDisp !== 0) {
      if (!ctx.loadImm16ToDE(r.ixDisp & 0xffff, span)) return false;
      if (!ctx.emitInstr('add', [{ kind: 'Reg', span, name: 'HL' }, { kind: 'Reg', span, name: 'DE' }], span))
        return false;
    }
    if (!ctx.emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
    return ctx.emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span);
  };

  return {
    emitLoadWordFromHlAddress,
    emitStoreSavedHlToEa,
    emitStoreWordToHlAddress,
    pushEaAddress,
    pushMemValue,
  };
}
