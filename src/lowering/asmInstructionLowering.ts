import type { Diagnostic } from '../diagnosticTypes.js';
import type { AsmInstructionNode, AsmOperandNode, EaExprNode, SourceSpan } from '../frontend/ast.js';
import type { ScalarKind } from './typeResolution.js';
import type { EaResolution } from './eaResolution.js';
import { createAsmInstructionLdHelpers } from './asmInstructionLdHelpers.js';
import { tryLowerBranchCallInstruction } from './asmLoweringBranchCall.js';
import { tryLowerStepInstruction } from './asmLoweringStep.js';
import { tryLowerAssignmentInstruction } from './asmLoweringAssign.js';
import { tryLowerLdInstruction } from './asmLoweringLd.js';

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
  conditionNameFromOpcode?: (opcode: number) => string | undefined;
  callConditionOpcodeFromName: (nameRaw: string) => number | undefined;
  jrConditionOpcodeFromName: (nameRaw: string) => number | undefined;
  conditionOpcode: (op: AsmOperandNode) => number | undefined;
  symbolicTargetFromExpr: (
    expr: Extract<AsmOperandNode, { kind: 'Imm' }>['expr'],
  ) => { baseLower: string; addend: number } | undefined;
  evalImmExpr: (expr: Extract<AsmOperandNode, { kind: 'Imm' }>['expr']) => number | undefined;
  resolveScalarBinding: (name: string) => 'byte' | 'word' | 'addr' | undefined;
  resolveRawAliasTargetName: (name: string) => string | undefined;
  isModuleStorageName: (name: string) => boolean;
  isFrameSlotName: (name: string) => boolean;
  resolveScalarTypeForEa: (ea: EaExprNode) => ScalarKind | undefined;
  resolveScalarTypeForLd: (ea: EaExprNode) => ScalarKind | undefined;
  resolveEa: (ea: EaExprNode, span: SourceSpan) => EaResolution | undefined;
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
  materializeEaAddressToHL: (ea: EaExprNode, span: AsmInstructionNode['span']) => boolean;
  emitScalarWordLoad: (
    target: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: AsmInstructionNode['span'],
  ) => boolean;
  emitScalarWordStore: (
    source: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: AsmInstructionNode['span'],
  ) => boolean;
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
  const {
    emitAssignmentImmediateToRegister,
    emitAssignmentRegisterTransfer,
    isTypedStorageLdOperand,
    resolveRawLabelName,
    isRawLdLabelName,
    emitAbs16LdFixup,
    isRegisterLikeMemEa,
  } = createAsmInstructionLdHelpers(ctx);
  const lowerAsmInstructionDispatcher = (asmItem: AsmInstructionNode): void => {
    const branchResult = tryLowerBranchCallInstruction(asmItem, {
      diagnostics: ctx.diagnostics,
      diagAt: ctx.diagAt,
      emitInstr: ctx.emitInstr,
      emitRawCodeBytes: ctx.emitRawCodeBytes,
      emitAbs16Fixup: ctx.emitAbs16Fixup,
      emitRel8Fixup: ctx.emitRel8Fixup,
      conditionOpcodeFromName: ctx.conditionOpcodeFromName,
      callConditionOpcodeFromName: ctx.callConditionOpcodeFromName,
      jrConditionOpcodeFromName: ctx.jrConditionOpcodeFromName,
      conditionOpcode: ctx.conditionOpcode,
      symbolicTargetFromExpr: ctx.symbolicTargetFromExpr,
      evalImmExpr: ctx.evalImmExpr,
      diagIfRetStackImbalanced: ctx.diagIfRetStackImbalanced,
      diagIfCallStackUnverifiable: ctx.diagIfCallStackUnverifiable,
      warnIfRawCallTargetsTypedCallable: ctx.warnIfRawCallTargetsTypedCallable,
      emitSyntheticEpilogue: ctx.emitSyntheticEpilogue,
      epilogueLabel: ctx.epilogueLabel,
      emitJumpTo: ctx.emitJumpTo,
      emitJumpCondTo: ctx.emitJumpCondTo,
      syncToFlow: ctx.syncToFlow,
      flowRef: ctx.flowRef,
    });
    if (branchResult !== undefined) {
      if (!branchResult) return;
      return;
    }

    const stepResult = tryLowerStepInstruction(asmItem, {
      diagnostics: ctx.diagnostics,
      diagAt: ctx.diagAt,
      emitInstr: ctx.emitInstr,
      evalImmExpr: ctx.evalImmExpr,
      resolveScalarTypeForLd: ctx.resolveScalarTypeForLd,
      resolveEa: ctx.resolveEa,
      materializeEaAddressToHL: ctx.materializeEaAddressToHL,
      emitScalarWordLoad: ctx.emitScalarWordLoad,
      emitScalarWordStore: ctx.emitScalarWordStore,
      syncToFlow: ctx.syncToFlow,
    });
    if (stepResult !== undefined) {
      if (!stepResult) return;
      return;
    }

    const ldResult = tryLowerLdInstruction(asmItem, {
      diagnostics: ctx.diagnostics,
      diagAt: ctx.diagAt,
      emitAbs16Fixup: ctx.emitAbs16Fixup,
      emitAbs16FixupPrefixed: ctx.emitAbs16FixupPrefixed,
      evalImmExpr: ctx.evalImmExpr,
      resolveScalarBinding: ctx.resolveScalarBinding,
      lowerLdWithEa: ctx.lowerLdWithEa,
      emitAbs16LdFixup,
      isTypedStorageLdOperand,
      isRawLdLabelName,
      resolveRawLabelName,
      isRegisterLikeMemEa,
      syncToFlow: ctx.syncToFlow,
    });
    if (ldResult !== undefined) {
      if (!ldResult) return;
      return;
    }

    const assignResult = tryLowerAssignmentInstruction(asmItem, {
      diagnostics: ctx.diagnostics,
      diagAt: ctx.diagAt,
      emitInstr: ctx.emitInstr,
      lowerLdWithEa: ctx.lowerLdWithEa,
      pushEaAddress: ctx.pushEaAddress,
      reg16: ctx.reg16,
      emitAssignmentImmediateToRegister,
      emitAssignmentRegisterTransfer,
      syncToFlow: ctx.syncToFlow,
    });
    if (assignResult !== undefined) {
      if (!assignResult) return;
      return;
    }

    const head = asmItem.head.toLowerCase();

    if (head !== 'ld' && ctx.lowerLdWithEa(asmItem)) {
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
