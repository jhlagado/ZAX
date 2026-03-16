import type { Diagnostic } from '../diagnostics/types.js';
import type { AsmInstructionNode, AsmOperandNode, EaExprNode } from '../frontend/ast.js';

type DiagAt = (diagnostics: Diagnostic[], span: AsmInstructionNode['span'], message: string) => void;

type Context = {
  diagnostics: Diagnostic[];
  diagAt: DiagAt;
  emitInstr: (head: string, operands: AsmOperandNode[], span: AsmInstructionNode['span']) => boolean;
  emitRawCodeBytes: (bytes: Uint8Array, file: string, asmText: string) => void;
  emitAbs16Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: AsmInstructionNode['span'],
    asmText?: string,
  ) => void;
  emitAbs16FixupPrefixed: (
    prefix: number,
    opcode2: number,
    baseLower: string,
    addend: number,
    span: AsmInstructionNode['span'],
    asmText?: string,
  ) => void;
  emitRel8Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: AsmInstructionNode['span'],
    mnemonic: string,
    asmText?: string,
  ) => void;
  conditionOpcodeFromName: (nameRaw: string) => number | undefined;
  conditionNameFromOpcode: (opcode: number) => string | undefined;
  callConditionOpcodeFromName: (nameRaw: string) => number | undefined;
  jrConditionOpcodeFromName: (nameRaw: string) => number | undefined;
  conditionOpcode: (op: AsmOperandNode) => number | undefined;
  symbolicTargetFromExpr: (
    expr: Extract<AsmOperandNode, { kind: 'Imm' }>['expr'],
  ) => { baseLower: string; addend: number } | undefined;
  evalImmExpr: (expr: Extract<AsmOperandNode, { kind: 'Imm' }>['expr']) => number | undefined;
  resolveScalarBinding: (name: string) => 'byte' | 'word' | 'addr' | undefined;
  diagIfRetStackImbalanced: (span: AsmInstructionNode['span'], mnemonic?: string) => void;
  diagIfCallStackUnverifiable: (options: {
    span: AsmInstructionNode['span'];
    mnemonic?: string;
    contractKind?: 'callee' | 'typed-call';
  }) => void;
  warnIfRawCallTargetsTypedCallable: (
    span: AsmInstructionNode['span'],
    symbolicTarget: { baseLower: string; addend: number } | undefined,
  ) => void;
  lowerLdWithEa: (asmItem: AsmInstructionNode) => boolean;
  pushEaAddress: (ea: EaExprNode, span: AsmInstructionNode['span']) => boolean;
  emitVirtualReg16Transfer: (asmItem: AsmInstructionNode) => boolean;
  reg16: Set<string>;
  emitSyntheticEpilogue: boolean;
  epilogueLabel: string;
  emitJumpTo: (label: string, span: AsmInstructionNode['span']) => void;
  emitJumpCondTo: (opcode: number, label: string, span: AsmInstructionNode['span']) => void;
  syncToFlow: () => void;
  flowRef: { current: { reachable: boolean } };
};

export function createAsmInstructionLoweringHelpers(ctx: Context) {
  const emitAssignmentImmediateToRegister = (
    dst: Extract<AsmOperandNode, { kind: 'Reg' }>,
    src: Extract<AsmOperandNode, { kind: 'Imm' }>,
    span: AsmInstructionNode['span'],
  ): boolean => {
    const dstName = dst.name.toUpperCase();
    if (
      dstName === 'A' ||
      dstName === 'B' ||
      dstName === 'C' ||
      dstName === 'D' ||
      dstName === 'E' ||
      dstName === 'H' ||
      dstName === 'L' ||
      dstName === 'BC' ||
      dstName === 'DE' ||
      dstName === 'HL' ||
      dstName === 'IX' ||
      dstName === 'IY'
    ) {
      return ctx.emitInstr('ld', [{ ...dst, name: dstName }, src], span);
    }
    return false;
  };

  const emitZeroExtendReg8ToReg16 = (
    dstName: 'BC' | 'DE' | 'HL',
    srcName: string,
    span: AsmInstructionNode['span'],
  ): boolean => {
    const hi = dstName === 'BC' ? 'B' : dstName === 'DE' ? 'D' : 'H';
    const lo = dstName === 'BC' ? 'C' : dstName === 'DE' ? 'E' : 'L';
    return (
      ctx.emitInstr(
        'ld',
        [{ kind: 'Reg', span, name: hi }, { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } }],
        span,
      ) &&
      ctx.emitInstr('ld', [{ kind: 'Reg', span, name: lo }, { kind: 'Reg', span, name: srcName }], span)
    );
  };

  const emitAssignmentRegisterTransfer = (
    dst: Extract<AsmOperandNode, { kind: 'Reg' }>,
    src: Extract<AsmOperandNode, { kind: 'Reg' }>,
    span: AsmInstructionNode['span'],
  ): boolean => {
    const dstName = dst.name.toUpperCase();
    const srcName = src.name.toUpperCase();
    if (dstName === srcName) return true;
    if (dstName === 'A' && srcName === 'A') return true;
    if (dstName === 'A') return false;
    const wideRegs = new Set(['BC', 'DE', 'HL', 'IX', 'IY']);
    if (dstName === 'BC' || dstName === 'DE' || dstName === 'HL') {
      if (srcName === 'A') return emitZeroExtendReg8ToReg16(dstName, srcName, span);
      const asLd: AsmInstructionNode = {
        kind: 'AsmInstruction',
        span,
        head: 'ld',
        operands: [
          { kind: 'Reg', span, name: dstName },
          { kind: 'Reg', span, name: srcName },
        ],
      };
      return ctx.emitVirtualReg16Transfer(asLd);
    }
    if (dstName === 'IX' || dstName === 'IY') {
      if (!wideRegs.has(srcName)) return false;
      return (
        ctx.emitInstr('push', [{ kind: 'Reg', span, name: srcName }], span) &&
        ctx.emitInstr('pop', [{ kind: 'Reg', span, name: dstName }], span)
      );
    }
    return false;
  };

  const isTypedStorageLdOperand = (op: AsmOperandNode): boolean => {
    if (op.kind === 'Ea') return true;
    if (op.kind === 'Imm' && op.expr.kind === 'ImmName') {
      return ctx.resolveScalarBinding(op.expr.name) !== undefined;
    }
    if (op.kind === 'Reg') {
      return ctx.resolveScalarBinding(op.name) !== undefined;
    }
    return false;
  };

  const emitRel8FromOperand = (
    asmItem: AsmInstructionNode,
    operand: AsmOperandNode,
    opcode: number,
    mnemonic: string,
  ): boolean => {
    if (operand.kind !== 'Imm') {
      if (mnemonic === 'djnz' || mnemonic.startsWith('jr')) {
        ctx.diagAt(ctx.diagnostics, asmItem.span, `${mnemonic} expects disp8`);
      } else {
        ctx.diagAt(ctx.diagnostics, asmItem.span, `${mnemonic} expects an immediate target.`);
      }
      return false;
    }
    const symbolicTarget = ctx.symbolicTargetFromExpr(operand.expr);
    if (symbolicTarget) {
      ctx.emitRel8Fixup(opcode, symbolicTarget.baseLower, symbolicTarget.addend, asmItem.span, mnemonic);
      return true;
    }
    const value = ctx.evalImmExpr(operand.expr);
    if (value === undefined) {
      ctx.diagAt(ctx.diagnostics, asmItem.span, `Failed to evaluate ${mnemonic} target.`);
      return false;
    }
    if (value < -128 || value > 127) {
      ctx.diagAt(
        ctx.diagnostics,
        asmItem.span,
        `${mnemonic} relative branch displacement out of range (-128..127): ${value}.`,
      );
      return false;
    }
    ctx.emitRawCodeBytes(Uint8Array.of(opcode, value & 0xff), asmItem.span.file, `${mnemonic} ${value}`);
    return true;
  };

  const lowerAsmInstructionDispatcher = (asmItem: AsmInstructionNode): void => {
    const head = asmItem.head.toLowerCase();

    if (head === 'jr') {
      if (asmItem.operands.length === 1) {
        if (asmItem.operands[0]!.kind === 'Mem') {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jr does not support indirect targets; expects disp8`);
          return;
        }
        const single = asmItem.operands[0]!;
        const ccSingle =
          single.kind === 'Imm' && single.expr.kind === 'ImmName'
            ? single.expr.name
            : single.kind === 'Reg'
              ? single.name
              : undefined;
        if (ccSingle && ctx.jrConditionOpcodeFromName(ccSingle) !== undefined) {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jr cc, disp expects two operands (cc, disp8)`);
          return;
        }
        if (single.kind === 'Imm') {
          const symbolicTarget = ctx.symbolicTargetFromExpr(single.expr);
          if (symbolicTarget && ctx.jrConditionOpcodeFromName(symbolicTarget.baseLower) !== undefined) {
            ctx.diagAt(ctx.diagnostics, asmItem.span, `jr cc, disp expects two operands (cc, disp8)`);
            return;
          }
        }
        if (single.kind === 'Reg') {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jr does not support register targets; expects disp8`);
          return;
        }
        if (!emitRel8FromOperand(asmItem, single, 0x18, 'jr')) return;
        ctx.flowRef.current.reachable = false;
        ctx.syncToFlow();
        return;
      }
      if (asmItem.operands.length === 2) {
        const ccOp = asmItem.operands[0]!;
        const ccName =
          ccOp.kind === 'Imm' && ccOp.expr.kind === 'ImmName'
            ? ccOp.expr.name
            : ccOp.kind === 'Reg'
              ? ccOp.name
              : undefined;
        const opcode = ccName ? ctx.jrConditionOpcodeFromName(ccName) : undefined;
        if (opcode === undefined) {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jr cc expects valid condition code NZ/Z/NC/C`);
          return;
        }
        const target = asmItem.operands[1]!;
        if (target.kind === 'Mem') {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jr cc, disp does not support indirect targets`);
          return;
        }
        if (target.kind === 'Reg') {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jr cc, disp does not support register targets; expects disp8`);
          return;
        }
        if (target.kind !== 'Imm') {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jr cc, disp expects disp8`);
          return;
        }
        if (!emitRel8FromOperand(asmItem, target, opcode, `jr ${ccName!.toLowerCase()}`)) return;
        ctx.syncToFlow();
        return;
      }
    }

    if (head === 'djnz') {
      if (asmItem.operands.length !== 1) {
        ctx.diagAt(ctx.diagnostics, asmItem.span, `djnz expects one operand (disp8)`);
        return;
      }
      const target = asmItem.operands[0]!;
      if (target.kind === 'Mem') {
        ctx.diagAt(ctx.diagnostics, asmItem.span, `djnz does not support indirect targets; expects disp8`);
        return;
      }
      if (target.kind === 'Reg') {
        ctx.diagAt(ctx.diagnostics, asmItem.span, `djnz does not support register targets; expects disp8`);
        return;
      }
      if (target.kind !== 'Imm') {
        ctx.diagAt(ctx.diagnostics, asmItem.span, `djnz expects disp8`);
        return;
      }
      if (!emitRel8FromOperand(asmItem, target, 0x10, 'djnz')) return;
      ctx.syncToFlow();
      return;
    }

    if (head === 'call') {
      ctx.diagIfCallStackUnverifiable({ span: asmItem.span });
    }
    if (head === 'rst' && asmItem.operands.length === 1) {
      ctx.diagIfCallStackUnverifiable({ span: asmItem.span, mnemonic: 'rst' });
    }
    if (head === 'ret') {
      if (asmItem.operands.length === 0) {
        ctx.diagIfRetStackImbalanced(asmItem.span);
        if (ctx.emitSyntheticEpilogue) {
          ctx.emitJumpTo(ctx.epilogueLabel, asmItem.span);
        } else {
          ctx.emitInstr('ret', [], asmItem.span);
        }
        ctx.flowRef.current.reachable = false;
        ctx.syncToFlow();
        return;
      }
      if (asmItem.operands.length === 1) {
        const op = ctx.conditionOpcode(asmItem.operands[0]!);
        if (op === undefined) {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `ret cc expects a valid condition code`);
          return;
        }
        ctx.diagIfRetStackImbalanced(asmItem.span);
        if (ctx.emitSyntheticEpilogue) {
          ctx.emitJumpCondTo(op, ctx.epilogueLabel, asmItem.span);
        } else {
          ctx.emitInstr('ret', [asmItem.operands[0]!], asmItem.span);
        }
        ctx.syncToFlow();
        return;
      }
    }

    if ((head === 'retn' || head === 'reti') && asmItem.operands.length === 0) {
      ctx.diagIfRetStackImbalanced(asmItem.span, head);
      if (ctx.emitSyntheticEpilogue) {
        ctx.diagAt(
          ctx.diagnostics,
          asmItem.span,
          `${head} is not supported in functions that require cleanup; use ret/ret cc so cleanup epilogue can run.`,
        );
      }
      ctx.emitInstr(head, [], asmItem.span);
      ctx.flowRef.current.reachable = false;
      ctx.syncToFlow();
      return;
    }

    if (head === 'jp' && asmItem.operands.length === 1) {
      const target = asmItem.operands[0]!;
      if (target.kind === 'Imm') {
        const symbolicTarget = ctx.symbolicTargetFromExpr(target.expr);
        if (symbolicTarget && ctx.conditionOpcodeFromName(symbolicTarget.baseLower) !== undefined) {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `jp cc, nn expects two operands (cc, nn)`);
          return;
        }
        if (symbolicTarget) {
          ctx.emitAbs16Fixup(0xc3, symbolicTarget.baseLower, symbolicTarget.addend, asmItem.span);
          ctx.flowRef.current.reachable = false;
          ctx.syncToFlow();
          return;
        }
      }
    }

    if (head === 'jp' && asmItem.operands.length === 2) {
      const ccOp = asmItem.operands[0]!;
      const ccName =
        ccOp.kind === 'Imm' && ccOp.expr.kind === 'ImmName'
          ? ccOp.expr.name
          : ccOp.kind === 'Reg'
            ? ccOp.name
            : undefined;
      const opcode = ccName ? ctx.conditionOpcodeFromName(ccName) : undefined;
      const target = asmItem.operands[1]!;
      if (opcode !== undefined && target.kind === 'Imm') {
        const symbolicTarget = ctx.symbolicTargetFromExpr(target.expr);
        if (symbolicTarget) {
          ctx.emitAbs16Fixup(opcode, symbolicTarget.baseLower, symbolicTarget.addend, asmItem.span);
          ctx.syncToFlow();
          return;
        }
      }
    }

    if (head === 'call' && asmItem.operands.length === 1) {
      const target = asmItem.operands[0]!;
      if (target.kind === 'Imm') {
        const symbolicTarget = ctx.symbolicTargetFromExpr(target.expr);
        if (symbolicTarget && ctx.callConditionOpcodeFromName(symbolicTarget.baseLower) !== undefined) {
          ctx.diagAt(ctx.diagnostics, asmItem.span, `call cc, nn expects two operands (cc, nn)`);
          return;
        }
        if (symbolicTarget) {
          ctx.warnIfRawCallTargetsTypedCallable(asmItem.span, symbolicTarget);
          ctx.emitAbs16Fixup(0xcd, symbolicTarget.baseLower, symbolicTarget.addend, asmItem.span);
          ctx.syncToFlow();
          return;
        }
      }
    }

    if (head === 'call' && asmItem.operands.length === 2) {
      const ccOp = asmItem.operands[0]!;
      const ccName =
        ccOp.kind === 'Imm' && ccOp.expr.kind === 'ImmName'
          ? ccOp.expr.name
          : ccOp.kind === 'Reg'
            ? ccOp.name
            : undefined;
      const opcode = ccName ? ctx.callConditionOpcodeFromName(ccName) : undefined;
      const target = asmItem.operands[1]!;
      if (opcode !== undefined && target.kind === 'Imm') {
        const symbolicTarget = ctx.symbolicTargetFromExpr(target.expr);
        if (symbolicTarget) {
          ctx.warnIfRawCallTargetsTypedCallable(asmItem.span, symbolicTarget);
          ctx.emitAbs16Fixup(opcode, symbolicTarget.baseLower, symbolicTarget.addend, asmItem.span);
          ctx.syncToFlow();
          return;
        }
      }
    }

    if (head === 'ld' && asmItem.operands.length === 2) {
      const dstOp = asmItem.operands[0]!;
      const srcOp = asmItem.operands[1]!;
      const dst = dstOp.kind === 'Reg' ? dstOp.name.toUpperCase() : undefined;
      const opcode =
        dst === 'BC'
          ? 0x01
          : dst === 'DE'
            ? 0x11
            : dst === 'HL'
              ? 0x21
              : dst === 'SP'
                ? 0x31
                : undefined;
      if (
        opcode !== undefined &&
        srcOp.kind === 'Imm' &&
        srcOp.expr.kind === 'ImmName' &&
        !ctx.resolveScalarBinding(srcOp.expr.name)
      ) {
        const v = ctx.evalImmExpr(srcOp.expr);
        if (v === undefined) {
          ctx.emitAbs16Fixup(opcode, srcOp.expr.name.toLowerCase(), 0, asmItem.span);
          ctx.syncToFlow();
          return;
        }
      }
      if (
        (dst === 'IX' || dst === 'IY') &&
        srcOp.kind === 'Imm' &&
        srcOp.expr.kind === 'ImmName' &&
        !ctx.resolveScalarBinding(srcOp.expr.name)
      ) {
        const v = ctx.evalImmExpr(srcOp.expr);
        if (v === undefined) {
          ctx.emitAbs16FixupPrefixed(dst === 'IX' ? 0xdd : 0xfd, 0x21, srcOp.expr.name.toLowerCase(), 0, asmItem.span);
          ctx.syncToFlow();
          return;
        }
      }
    }

    if (head === 'move') {
      const dst = asmItem.operands[0];
      const src = asmItem.operands[1];
      if (src?.kind === 'Ea' && src.explicitAddressOf) {
        if (!dst || dst.kind !== 'Reg' || !ctx.reg16.has(dst.name.toUpperCase())) {
          ctx.diagAt(
            ctx.diagnostics,
            asmItem.span,
            `"move" address-of source requires a 16-bit register destination.`,
          );
          return;
        }
        if (!ctx.pushEaAddress(src.expr, asmItem.span)) return;
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span: asmItem.span, name: dst.name.toUpperCase() }], asmItem.span))
          return;
        ctx.syncToFlow();
        return;
      }
      const moveAsLd: AsmInstructionNode = { ...asmItem, head: 'ld' };
      if (ctx.lowerLdWithEa(moveAsLd)) {
        ctx.syncToFlow();
        return;
      }
      ctx.diagAt(ctx.diagnostics, asmItem.span, `"move" form is not supported.`);
      return;
    }

    if (head === ':=') {
      const dst = asmItem.operands[0];
      const src = asmItem.operands[1];
      if (!dst || !src || asmItem.operands.length !== 2) {
        ctx.diagAt(ctx.diagnostics, asmItem.span, `":=" expects exactly two operands.`);
        return;
      }
      if (src.kind === 'Ea' && src.explicitAddressOf) {
        if (dst.kind !== 'Reg' || !ctx.reg16.has(dst.name.toUpperCase())) {
          ctx.diagAt(
            ctx.diagnostics,
            asmItem.span,
            `":=" address-of source requires a 16-bit register destination.`,
          );
          return;
        }
        if (!ctx.pushEaAddress(src.expr, asmItem.span)) return;
        if (!ctx.emitInstr('pop', [{ kind: 'Reg', span: asmItem.span, name: dst.name.toUpperCase() }], asmItem.span))
          return;
        ctx.syncToFlow();
        return;
      }
      if (dst.kind === 'Ea' || src.kind === 'Ea') {
        if (ctx.lowerLdWithEa(asmItem)) {
          ctx.syncToFlow();
          return;
        }
        ctx.diagAt(ctx.diagnostics, asmItem.span, `":=" form is not supported.`);
        return;
      }
      if (dst.kind === 'Reg' && src.kind === 'Imm') {
        if (emitAssignmentImmediateToRegister(dst, src, asmItem.span)) {
          ctx.syncToFlow();
          return;
        }
        ctx.diagAt(ctx.diagnostics, asmItem.span, `":=" form is not supported.`);
        return;
      }
      if (dst.kind === 'Reg' && src.kind === 'Reg') {
        if (emitAssignmentRegisterTransfer(dst, src, asmItem.span)) {
          ctx.syncToFlow();
          return;
        }
        ctx.diagAt(ctx.diagnostics, asmItem.span, `":=" form is not supported.`);
        return;
      }
      ctx.diagAt(ctx.diagnostics, asmItem.span, `":=" form is not supported.`);
      return;
    }

    if (head === 'ld' && asmItem.operands.some(isTypedStorageLdOperand)) {
      ctx.diagAt(
        ctx.diagnostics,
        asmItem.span,
        `"ld" no longer accepts typed storage operands; use "move".`,
      );
      return;
    }

    if (ctx.lowerLdWithEa(asmItem)) {
      ctx.syncToFlow();
      return;
    }

    if (ctx.emitVirtualReg16Transfer(asmItem)) {
      ctx.syncToFlow();
      return;
    }

    if (!ctx.emitInstr(asmItem.head, asmItem.operands, asmItem.span)) return;

    if ((head === 'jp' || head === 'jr') && asmItem.operands.length === 1) {
      ctx.flowRef.current.reachable = false;
    } else if ((head === 'ret' || head === 'retn' || head === 'reti') && asmItem.operands.length === 0) {
      ctx.flowRef.current.reachable = false;
    }
    ctx.syncToFlow();
  };

  return { lowerAsmInstructionDispatcher };
}
