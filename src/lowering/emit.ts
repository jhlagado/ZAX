import { resolve } from 'node:path';
import {
  EA_GLOB_CONST,
  EA_GLOB_REG,
  EA_GLOB_RP,
  EA_FVAR_CONST,
  EA_FVAR_REG,
  EA_FVAR_RP,
  EA_GLOB_GLOB,
  EA_FVAR_GLOB,
  EA_GLOB_FVAR,
  EA_FVAR_FVAR,
  EAW_GLOB_CONST,
  EAW_GLOB_REG,
  EAW_GLOB_RP,
  EAW_FVAR_CONST,
  EAW_FVAR_REG,
  EAW_FVAR_RP,
  EAW_GLOB_GLOB,
  EAW_FVAR_GLOB,
  EAW_GLOB_FVAR,
  EAW_FVAR_FVAR,
  LOAD_BASE_GLOB,
  LOAD_BASE_FVAR,
  LOAD_RP_EA,
  LOAD_RP_FVAR,
  LOAD_RP_GLOB,
  STORE_RP_EA,
  STORE_RP_FVAR,
  STORE_RP_GLOB,
  CALC_EA,
  CALC_EA_2,
  TEMPLATE_L_ABC,
  TEMPLATE_LW_HL,
  TEMPLATE_L_HL,
  TEMPLATE_L_DE,
  TEMPLATE_LW_BC,
  TEMPLATE_LW_DE,
  TEMPLATE_SW_DEBC,
  TEMPLATE_SW_HL,
  TEMPLATE_S_ANY,
  TEMPLATE_S_HL,
  type StepPipeline,
} from '../addressing/steps.js';
import type { Diagnostic, DiagnosticId } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import type {
  EmittedAsmTraceEntry,
  EmittedByteMap,
  EmittedSourceSegment,
  SymbolEntry,
} from '../formats/types.js';
import type {
  AlignDirectiveNode,
  AsmItemNode,
  AsmInstructionNode,
  AsmOperandNode,
  BinDeclNode,
  DataBlockNode,
  DataDeclNode,
  EaExprNode,
  EnumDeclNode,
  ExternDeclNode,
  ExternFuncNode,
  FuncDeclNode,
  HexDeclNode,
  ImmExprNode,
  OpDeclNode,
  OpMatcherNode,
  ParamNode,
  ProgramNode,
  SectionDirectiveNode,
  SourceSpan,
  TypeExprNode,
  VarBlockNode,
  VarDeclNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import { evalImmExpr } from '../semantics/env.js';
import { sizeOfTypeExpr } from '../semantics/layout.js';
import { encodeInstruction } from '../z80/encode.js';
import type { OpStackPolicyMode } from '../pipeline.js';
import { loadBinInput, loadHexInput } from './inputAssets.js';
import { createEaResolutionHelpers, type EaResolution } from './eaResolution.js';
import { createEaMaterializationHelpers } from './eaMaterialization.js';
import { createAddressingPipelineBuilders } from './addressingPipelines.js';
import { createRuntimeImmediateHelpers } from './runtimeImmediates.js';
import { createRuntimeAtomBudgetHelpers } from './runtimeAtomBudget.js';
import { createScalarWordAccessorHelpers } from './scalarWordAccessors.js';
import { createLdLoweringHelpers } from './ldLowering.js';
import { createOpExpansionOrchestrationHelpers } from './opExpansionOrchestration.js';
import { createAsmRangeLoweringHelpers } from './asmRangeLowering.js';
import { createAsmBodyOrchestrationHelpers } from './asmBodyOrchestration.js';
import { createOpMatchingHelpers } from './opMatching.js';
import { createEmissionCoreHelpers } from './emissionCore.js';
import {
  alignTo,
  computeWrittenRange,
  rebaseAsmTrace,
  rebaseCodeSourceSegments,
  writeSection,
} from './sectionLayout.js';
import {
  formatAbs16FixupAsm,
  formatAbs16FixupEdAsm,
  formatAbs16FixupPrefixedAsm,
  formatAsmInstrForTrace,
  formatIxDisp,
  toHexByte,
  toHexWord,
} from './traceFormat.js';
import { createTypeResolutionHelpers } from './typeResolution.js';

function diag(diagnostics: Diagnostic[], file: string, message: string): void {
  diagnostics.push({ id: DiagnosticIds.EmitError, severity: 'error', message, file });
}

function diagAt(diagnostics: Diagnostic[], span: SourceSpan, message: string): void {
  diagnostics.push({
    id: DiagnosticIds.EmitError,
    severity: 'error',
    message,
    file: span.file,
    line: span.start.line,
    column: span.start.column,
  });
}

function diagAtWithId(
  diagnostics: Diagnostic[],
  span: SourceSpan,
  id: DiagnosticId,
  message: string,
): void {
  diagnostics.push({
    id,
    severity: 'error',
    message,
    file: span.file,
    line: span.start.line,
    column: span.start.column,
  });
}

function diagAtWithSeverityAndId(
  diagnostics: Diagnostic[],
  span: SourceSpan,
  id: DiagnosticId,
  severity: 'error' | 'warning',
  message: string,
): void {
  diagnostics.push({
    id,
    severity,
    message,
    file: span.file,
    line: span.start.line,
    column: span.start.column,
  });
}

function warnAt(diagnostics: Diagnostic[], span: SourceSpan, message: string): void {
  diagnostics.push({
    id: DiagnosticIds.EmitError,
    severity: 'warning',
    message,
    file: span.file,
    line: span.start.line,
    column: span.start.column,
  });
}

/**
 * Emit machine-code bytes for a parsed program into an address->byte map.
 *
 * Implementation notes:
 * - Uses 3 independent section counters: `code`, `data`, `var`.
 * - `section` / `align` directives affect only the selected section counter.
 * - By default, `data` starts after `code` (aligned to 2), and `var` starts after `data` (aligned to 2),
 *   matching the earlier PR2 behavior.
 * - Detects overlapping byte emissions across all sections.
 */
export function emitProgram(
  program: ProgramNode,
  env: CompileEnv,
  diagnostics: Diagnostic[],
  options?: {
    includeDirs?: string[];
    opStackPolicy?: OpStackPolicyMode;
    rawTypedCallWarnings?: boolean;
    defaultCodeBase?: number;
  },
): { map: EmittedByteMap; symbols: SymbolEntry[] } {
  type SectionKind = 'code' | 'data' | 'var';
  type PendingSymbol = {
    kind: 'label' | 'data' | 'var';
    name: string;
    section: SectionKind;
    offset: number;
    file?: string;
    line?: number;
    scope?: 'global' | 'local';
    size?: number;
  };

  const bytes = new Map<number, number>();
  const codeBytes = new Map<number, number>();
  const dataBytes = new Map<number, number>();
  const hexBytes = new Map<number, number>();
  type SourceSegmentTag = Omit<EmittedSourceSegment, 'start' | 'end'>;
  const codeSourceSegments: EmittedSourceSegment[] = [];
  const codeAsmTrace: EmittedAsmTraceEntry[] = [];
  let currentCodeSegmentTag: SourceSegmentTag | undefined;
  const absoluteSymbols: SymbolEntry[] = [];
  const symbols: SymbolEntry[] = [];
  const pending: PendingSymbol[] = [];
  const taken = new Set<string>();
  const fixups: { offset: number; baseLower: string; addend: number; file: string }[] = [];
  const rel8Fixups: {
    offset: number;
    origin: number;
    baseLower: string;
    addend: number;
    file: string;
    mnemonic: string;
  }[] = [];
  const deferredExterns: {
    name: string;
    baseLower: string;
    addend: number;
    file: string;
    line: number;
  }[] = [];

  type Callable =
    | { kind: 'func'; node: FuncDeclNode }
    | { kind: 'extern'; node: ExternFuncNode; targetLower: string };
  const callables = new Map<string, Callable>();
  const opsByName = new Map<string, OpDeclNode[]>();
  type OpStackSummary =
    | { kind: 'known'; delta: number; hasUntrackedSpMutation: boolean }
    | { kind: 'complex' };
  const opStackSummaryCache = new Map<OpDeclNode, OpStackSummary>();
  const opStackPolicyMode = options?.opStackPolicy ?? 'off';
  const rawTypedCallWarningsEnabled = options?.rawTypedCallWarnings === true;
  const declaredOpNames = new Set<string>();
  const declaredBinNames = new Set<string>();

  const reg8 = new Set(['A', 'B', 'C', 'D', 'E', 'H', 'L']);
  const reg16 = new Set(['BC', 'DE', 'HL']);
  const reg8Code = new Map([
    ['B', 0],
    ['C', 1],
    ['D', 2],
    ['E', 3],
    ['H', 4],
    ['L', 5],
    ['A', 7],
  ]);
  const opStackSummaryKey = (decl: OpDeclNode): string =>
    `${decl.name.toLowerCase()}@${decl.span.file}:${decl.span.start.line}`;
  const summarizeOpStackEffect = (
    decl: OpDeclNode,
    visiting: Set<string> = new Set(),
  ): OpStackSummary => {
    const cached = opStackSummaryCache.get(decl);
    if (cached) return cached;
    const key = opStackSummaryKey(decl);
    if (visiting.has(key)) return { kind: 'complex' };
    visiting.add(key);
    let delta = 0;
    let hasUntrackedSpMutation = false;
    let complex = false;
    for (const item of decl.body.items) {
      if (item.kind === 'AsmLabel') continue;
      if (item.kind !== 'AsmInstruction') {
        complex = true;
        break;
      }
      const head = item.head.toLowerCase();
      const operands = item.operands;
      if (head === 'push' && operands.length === 1) {
        delta -= 2;
        continue;
      }
      if (head === 'pop' && operands.length === 1) {
        delta += 2;
        continue;
      }
      if (
        head === 'inc' &&
        operands.length === 1 &&
        operands[0]?.kind === 'Reg' &&
        operands[0].name.toUpperCase() === 'SP'
      ) {
        delta += 1;
        continue;
      }
      if (
        head === 'dec' &&
        operands.length === 1 &&
        operands[0]?.kind === 'Reg' &&
        operands[0].name.toUpperCase() === 'SP'
      ) {
        delta -= 1;
        continue;
      }
      if (
        head === 'ld' &&
        operands.length === 2 &&
        operands[0]?.kind === 'Reg' &&
        operands[0].name.toUpperCase() === 'SP'
      ) {
        hasUntrackedSpMutation = true;
        continue;
      }
      if (
        head === 'ret' ||
        head === 'retn' ||
        head === 'reti' ||
        head === 'jp' ||
        head === 'jr' ||
        head === 'djnz'
      ) {
        complex = true;
        break;
      }
      const nestedCandidates = opsByName.get(head);
      if (nestedCandidates && nestedCandidates.length > 0) {
        if (nestedCandidates.length !== 1) {
          complex = true;
          break;
        }
        const nested = summarizeOpStackEffect(nestedCandidates[0]!, visiting);
        if (nested.kind !== 'known') {
          complex = true;
          break;
        }
        delta += nested.delta;
        hasUntrackedSpMutation = hasUntrackedSpMutation || nested.hasUntrackedSpMutation;
      }
    }
    visiting.delete(key);
    const out: OpStackSummary = complex
      ? { kind: 'complex' }
      : { kind: 'known', delta, hasUntrackedSpMutation };
    opStackSummaryCache.set(decl, out);
    return out;
  };

  const storageTypes = new Map<string, TypeExprNode>();
  const moduleAliasTargets = new Map<string, EaExprNode>();
  const moduleAliasDecls = new Map<string, VarDeclNode>();
  const rawAddressSymbols = new Set<string>();
  const stackSlotTypes = new Map<string, TypeExprNode>();
  const stackSlotOffsets = new Map<string, number>();
  let localAliasTargets = new Map<string, EaExprNode>();
  let spDeltaTracked = 0;
  let spTrackingValid = true;
  let spTrackingInvalidatedByMutation = false;
  let generatedLabelCounter = 0;

  const sameSourceTag = (x: SourceSegmentTag, y: SourceSegmentTag): boolean =>
    x.file === y.file &&
    x.line === y.line &&
    x.column === y.column &&
    x.kind === y.kind &&
    x.confidence === y.confidence;

  const recordCodeSourceRange = (start: number, end: number): void => {
    if (!currentCodeSegmentTag || end <= start) return;
    const last = codeSourceSegments[codeSourceSegments.length - 1];
    if (last && last.end === start && sameSourceTag(last, currentCodeSegmentTag)) {
      last.end = end;
      return;
    }
    codeSourceSegments.push({ ...currentCodeSegmentTag, start, end });
  };

  const traceInstruction = (offset: number, bytesOut: Uint8Array, text: string): void => {
    if (bytesOut.length === 0) return;
    codeAsmTrace.push({
      kind: 'instruction',
      offset,
      text,
      bytes: [...bytesOut],
    });
  };

  const traceLabel = (offset: number, name: string): void => {
    codeAsmTrace.push({ kind: 'label', offset, name });
  };

  const traceComment = (offset: number, text: string): void => {
    codeAsmTrace.push({ kind: 'comment', offset, text });
  };

  let emitCodeBytes: (bs: Uint8Array, file: string) => void;
  let emitRawCodeBytes: (bs: Uint8Array, file: string, traceText: string) => void;
  let emitStepPipeline: (pipe: StepPipeline, span: SourceSpan) => boolean;

  const applySpTracking = (headRaw: string, operands: AsmOperandNode[]) => {
    const head = headRaw.toLowerCase();
    if (
      head === 'ld' &&
      operands.length === 2 &&
      operands[0]?.kind === 'Reg' &&
      operands[0].name.toUpperCase() === 'SP'
    ) {
      if (operands[1]?.kind === 'Reg' && operands[1].name.toUpperCase() === 'IX') {
        spDeltaTracked = -2;
        spTrackingValid = true;
        spTrackingInvalidatedByMutation = false;
      } else {
        spTrackingValid = false;
        spTrackingInvalidatedByMutation = true;
      }
      return;
    }
    if (!spTrackingValid) return;
    if (head === 'push' && operands.length === 1) {
      spDeltaTracked -= 2;
      return;
    }
    if (head === 'pop' && operands.length === 1) {
      spDeltaTracked += 2;
      return;
    }
    if (
      head === 'inc' &&
      operands.length === 1 &&
      operands[0]?.kind === 'Reg' &&
      operands[0].name.toUpperCase() === 'SP'
    ) {
      spDeltaTracked += 1;
      return;
    }
    if (
      head === 'dec' &&
      operands.length === 1 &&
      operands[0]?.kind === 'Reg' &&
      operands[0].name.toUpperCase() === 'SP'
    ) {
      spDeltaTracked -= 1;
      return;
    }
  };

  const emitInstr = (head: string, operands: AsmOperandNode[], span: SourceSpan) => {
    const start = codeOffset;
    const encoded = encodeInstruction(
      { kind: 'AsmInstruction', span, head, operands } as any,
      env,
      diagnostics,
    );
    if (!encoded) return false;
    emitCodeBytes(encoded, span.file);
    traceInstruction(start, encoded, formatAsmInstrForTrace(head, operands));
    applySpTracking(head, operands);
    return true;
  };

  const { loadImm16ToDE, loadImm16ToHL, negateHL, pushImm16, pushZeroExtendedReg8 } =
    createRuntimeImmediateHelpers({
      emitInstr,
    });

  const emitAbs16Fixup = (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ): void => {
    const start = codeOffset;
    codeBytes.set(codeOffset++, opcode);
    codeBytes.set(codeOffset++, 0x00);
    codeBytes.set(codeOffset++, 0x00);
    recordCodeSourceRange(start, codeOffset);
    fixups.push({ offset: start + 1, baseLower, addend, file: span.file });
    traceInstruction(
      start,
      Uint8Array.of(opcode, 0x00, 0x00),
      asmText ?? formatAbs16FixupAsm(opcode, baseLower, addend),
    );
  };

  const emitAbs16FixupEd = (
    opcode2: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ): void => {
    const start = codeOffset;
    codeBytes.set(codeOffset++, 0xed);
    codeBytes.set(codeOffset++, opcode2);
    codeBytes.set(codeOffset++, 0x00);
    codeBytes.set(codeOffset++, 0x00);
    recordCodeSourceRange(start, codeOffset);
    fixups.push({ offset: start + 2, baseLower, addend, file: span.file });
    traceInstruction(
      start,
      Uint8Array.of(0xed, opcode2, 0x00, 0x00),
      asmText ?? formatAbs16FixupEdAsm(opcode2, baseLower, addend),
    );
  };

  ({
    emitCodeBytes,
    emitRawCodeBytes,
    emitStepPipeline,
  } = createEmissionCoreHelpers({
    getCodeOffset: () => codeOffset,
    setCodeOffset: (value) => {
      codeOffset = value;
    },
    setCodeByte: (offset, value) => {
      codeBytes.set(offset, value);
    },
    recordCodeSourceRange,
    traceInstruction,
    emitInstr: (head, operands, span) => emitInstr(head, operands, span),
    loadImm16ToDE: (value, span) => loadImm16ToDE(value, span),
    loadImm16ToHL: (value, span) => loadImm16ToHL(value, span),
    emitAbs16Fixup,
    emitAbs16FixupEd,
  }));

  const emitAbs16FixupPrefixed = (
    prefix: number,
    opcode2: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ): void => {
    const start = codeOffset;
    codeBytes.set(codeOffset++, prefix);
    codeBytes.set(codeOffset++, opcode2);
    codeBytes.set(codeOffset++, 0x00);
    codeBytes.set(codeOffset++, 0x00);
    recordCodeSourceRange(start, codeOffset);
    fixups.push({ offset: start + 2, baseLower, addend, file: span.file });
    traceInstruction(
      start,
      Uint8Array.of(prefix, opcode2, 0x00, 0x00),
      asmText ?? formatAbs16FixupPrefixedAsm(prefix, opcode2, baseLower, addend),
    );
  };

  const emitRel8Fixup = (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    mnemonic: string,
    asmText?: string,
  ): void => {
    const start = codeOffset;
    codeBytes.set(codeOffset++, opcode);
    codeBytes.set(codeOffset++, 0x00);
    recordCodeSourceRange(start, codeOffset);
    rel8Fixups.push({
      offset: start + 1,
      origin: start + 2,
      baseLower,
      addend,
      file: span.file,
      mnemonic,
    });
    traceInstruction(start, Uint8Array.of(opcode, 0x00), asmText ?? `${mnemonic} ${baseLower}`);
  };

  const conditionOpcodeFromName = (nameRaw: string): number | undefined => {
    const asName = nameRaw.toUpperCase();
    switch (asName) {
      case 'NZ':
        return 0xc2;
      case 'Z':
        return 0xca;
      case 'NC':
        return 0xd2;
      case 'C':
        return 0xda;
      case 'PO':
        return 0xe2;
      case 'PE':
        return 0xea;
      case 'P':
        return 0xf2;
      case 'M':
        return 0xfa;
      default:
        return undefined;
    }
  };
  const conditionNameFromOpcode = (opcode: number): string | undefined => {
    switch (opcode) {
      case 0xc2:
        return 'NZ';
      case 0xca:
        return 'Z';
      case 0xd2:
        return 'NC';
      case 0xda:
        return 'C';
      case 0xe2:
        return 'PO';
      case 0xea:
        return 'PE';
      case 0xf2:
        return 'P';
      case 0xfa:
        return 'M';
      default:
        return undefined;
    }
  };
  const callConditionOpcodeFromName = (nameRaw: string): number | undefined => {
    switch (nameRaw.toUpperCase()) {
      case 'NZ':
        return 0xc4;
      case 'Z':
        return 0xcc;
      case 'NC':
        return 0xd4;
      case 'C':
        return 0xdc;
      case 'PO':
        return 0xe4;
      case 'PE':
        return 0xec;
      case 'P':
        return 0xf4;
      case 'M':
        return 0xfc;
      default:
        return undefined;
    }
  };

  const symbolicTargetFromExpr = (
    expr: ImmExprNode,
  ): { baseLower: string; addend: number } | undefined => {
    if (expr.kind === 'ImmName') return { baseLower: expr.name.toLowerCase(), addend: 0 };

    if (expr.kind !== 'ImmBinary') return undefined;
    if (expr.op !== '+' && expr.op !== '-') return undefined;

    const leftName = expr.left.kind === 'ImmName' ? expr.left.name.toLowerCase() : undefined;
    const rightName = expr.right.kind === 'ImmName' ? expr.right.name.toLowerCase() : undefined;

    if (leftName) {
      const right = evalImmExpr(expr.right, env, diagnostics);
      if (right === undefined) return undefined;
      const addend = expr.op === '+' ? right : -right;
      return { baseLower: leftName, addend };
    }

    if (expr.op === '+' && rightName) {
      const left = evalImmExpr(expr.left, env, diagnostics);
      if (left === undefined) return undefined;
      return { baseLower: rightName, addend: left };
    }

    return undefined;
  };
  const jrConditionOpcodeFromName = (nameRaw: string): number | undefined => {
    switch (nameRaw.toUpperCase()) {
      case 'NZ':
        return 0x20;
      case 'Z':
        return 0x28;
      case 'NC':
        return 0x30;
      case 'C':
        return 0x38;
      default:
        return undefined;
    }
  };

  const conditionOpcode = (op: AsmOperandNode): number | undefined => {
    const asName =
      op.kind === 'Imm' && op.expr.kind === 'ImmName'
        ? op.expr.name
        : op.kind === 'Reg'
          ? op.name
          : undefined;
    return asName ? conditionOpcodeFromName(asName) : undefined;
  };

  const inverseConditionName = (nameRaw: string): string | undefined => {
    const name = nameRaw.toUpperCase();
    switch (name) {
      case 'NZ':
        return 'Z';
      case 'Z':
        return 'NZ';
      case 'NC':
        return 'C';
      case 'C':
        return 'NC';
      case 'PO':
        return 'PE';
      case 'PE':
        return 'PO';
      case 'P':
        return 'M';
      case 'M':
        return 'P';
      default:
        return undefined;
    }
  };

  const flattenEaDottedName = (ea: EaExprNode): string | undefined => {
    if (ea.kind === 'EaName') return ea.name;
    if (ea.kind === 'EaField') {
      const base = flattenEaDottedName(ea.base);
      return base ? `${base}.${ea.field}` : undefined;
    }
    return undefined;
  };

  const enumImmExprFromOperand = (op: AsmOperandNode): ImmExprNode | undefined => {
    if (op.kind === 'Imm') return op.expr;
    if (op.kind !== 'Ea') return undefined;
    const name = flattenEaDottedName(op.expr);
    if (!name || !env.enums.has(name)) return undefined;
    return { kind: 'ImmName', span: op.span, name };
  };

  const normalizeFixedToken = (op: AsmOperandNode): string | undefined => {
    switch (op.kind) {
      case 'Reg':
        return op.name.toUpperCase();
      case 'Imm':
        if (op.expr.kind === 'ImmName') return op.expr.name.toUpperCase();
        return undefined;
      case 'Ea': {
        const enumExpr = enumImmExprFromOperand(op);
        return enumExpr?.kind === 'ImmName' ? enumExpr.name.toUpperCase() : undefined;
      }
      default:
        return undefined;
    }
  };

  const evalImmNoDiag = (expr: ImmExprNode): number | undefined => {
    const scratch: Diagnostic[] = [];
    return evalImmExpr(expr, env, scratch);
  };
  const isIxIyIndexedMem = (op: AsmOperandNode): boolean =>
    op.kind === 'Mem' &&
    ((op.expr.kind === 'EaName' && /^(IX|IY)$/i.test(op.expr.name)) ||
      ((op.expr.kind === 'EaAdd' || op.expr.kind === 'EaSub') &&
        op.expr.base.kind === 'EaName' &&
        /^(IX|IY)$/i.test(op.expr.base.name)));
  const inferMemWidth = (op: AsmOperandNode): number | undefined => {
    if (op.kind !== 'Mem') return undefined;
    const resolved = resolveEa(op.expr, op.span);
    if (!resolved?.typeExpr) return undefined;
    return sizeOfTypeExpr(resolved.typeExpr, env, diagnostics);
  };

  const {
    matcherMatchesOperand,
    selectMostSpecificOpOverload,
    formatAsmOperandForOpDiag,
    formatOpSignature,
    formatOpDefinitionForDiag,
    firstOpOverloadMismatchReason,
  } = createOpMatchingHelpers({
    reg8,
    isIxIyIndexedMem,
    flattenEaDottedName,
    isEnumName: (name) => env.enums.has(name),
    normalizeFixedToken,
    conditionOpcodeFromName,
    evalImmNoDiag,
    inferMemWidth,
  });

  const cloneImmExpr = (expr: ImmExprNode): ImmExprNode => {
    const cloneOffsetofPath = (path: any): any => ({
      ...path,
      steps: path.steps.map((step: any) =>
        step.kind === 'OffsetofIndex' ? { ...step, expr: cloneImmExpr(step.expr) } : { ...step },
      ),
    });
    if (expr.kind === 'ImmLiteral') return { ...expr };
    if (expr.kind === 'ImmName') return { ...expr };
    if (expr.kind === 'ImmSizeof') return { ...expr };
    if (expr.kind === 'ImmOffsetof')
      return { ...expr, path: cloneOffsetofPath(expr.path) as typeof expr.path };
    if (expr.kind === 'ImmUnary') return { ...expr, expr: cloneImmExpr(expr.expr) };
    return { ...expr, left: cloneImmExpr(expr.left), right: cloneImmExpr(expr.right) };
  };

  const cloneEaExpr = (ea: EaExprNode): EaExprNode => {
    switch (ea.kind) {
      case 'EaName':
        return { ...ea };
      case 'EaField':
        return { ...ea, base: cloneEaExpr(ea.base) };
      case 'EaIndex':
        return {
          ...ea,
          base: cloneEaExpr(ea.base),
          index:
            ea.index.kind === 'IndexEa'
              ? { ...ea.index, expr: cloneEaExpr(ea.index.expr) }
              : ea.index.kind === 'IndexImm'
                ? { ...ea.index, value: cloneImmExpr(ea.index.value) }
                : ea.index.kind === 'IndexMemIxIy' && ea.index.disp
                  ? { ...ea.index, disp: cloneImmExpr(ea.index.disp) }
                  : { ...ea.index },
        };
      case 'EaAdd':
      case 'EaSub':
        return { ...ea, base: cloneEaExpr(ea.base), offset: cloneImmExpr(ea.offset) };
    }
  };

  const cloneOperand = (op: AsmOperandNode): AsmOperandNode => {
    switch (op.kind) {
      case 'Reg':
      case 'PortC':
        return { ...op };
      case 'Imm':
      case 'PortImm8':
        return { ...op, expr: cloneImmExpr(op.expr) } as AsmOperandNode;
      case 'Ea':
      case 'Mem':
        return { ...op, expr: cloneEaExpr(op.expr) } as AsmOperandNode;
    }
  };

  const {
    resolveAggregateType,
    resolveArrayType,
    resolveEaTypeExpr,
    resolveScalarBinding,
    resolveScalarKind,
    resolveScalarTypeForEa,
    resolveScalarTypeForLd,
    sameTypeShape,
    typeDisplay,
  } = createTypeResolutionHelpers({
    env,
    storageTypes,
    stackSlotTypes,
    rawAddressSymbols,
    moduleAliasTargets,
    getLocalAliasTargets: () => localAliasTargets,
  });

  const { resolveEa } = createEaResolutionHelpers({
    env,
    diagnostics,
    diagAt,
    stackSlotOffsets,
    stackSlotTypes,
    storageTypes,
    moduleAliasTargets,
    getLocalAliasTargets: () => localAliasTargets,
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
    evalImmNoDiag,
    resolveAggregateType,
    resolveEaTypeExpr,
    sizeOfTypeExpr: (te) => sizeOfTypeExpr(te, env, diagnostics),
  });

  for (const [aliasLower, aliasTarget] of moduleAliasTargets) {
    if (storageTypes.has(aliasLower)) continue;
    const inferred = resolveEaTypeExpr(aliasTarget);
    if (!inferred) {
      const decl = moduleAliasDecls.get(aliasLower);
      const target = decl?.name ?? aliasLower;
      if (decl) {
        diagAt(
          diagnostics,
          decl.span,
          `Incompatible inferred alias binding for "${target}": unable to infer type from alias source.`,
        );
      } else {
        diag(
          diagnostics,
          program.entryFile,
          `Incompatible inferred alias binding for "${target}": unable to infer type from alias source.`,
        );
      }
      continue;
    }
    storageTypes.set(aliasLower, inferred);
  }

  const {
    enforceDirectCallSiteEaBudget,
    enforceEaRuntimeAtomBudget,
  } = createRuntimeAtomBudgetHelpers({
    diagnostics,
    diagAt,
    resolveScalarBinding,
    stackSlotOffsets,
    stackSlotTypes,
    storageTypes,
  });

  const pushEaAddress = (ea: EaExprNode, span: SourceSpan): boolean => {
    const r = resolveEa(ea, span);
    // Runtime indexed array address (reg8/reg16 index): handle explicitly since resolveEa returns undefined.
    if (
      !r &&
      ea.kind === 'EaIndex' &&
      (ea.index.kind === 'IndexReg8' || ea.index.kind === 'IndexReg16')
    ) {
      // Resolve base to get element size and base kind.
      const baseResolved = resolveEa(ea.base, span);
      const baseType = resolveEaTypeExpr(ea.base);
      if (!baseResolved || !baseType || baseType.kind !== 'ArrayType') return false;
      const elemSize = sizeOfTypeExpr(baseType.element, env, diagnostics);
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
      // Support power-of-two element sizes up to 16 bytes for runtime indexing.
      if (shiftCount < 0 || shiftCount > 4) return false;

      // HL = index (zero-extend if reg8), then scale if word elements.
      const loadIndexToHL = (): boolean => {
        if (ea.index.kind === 'IndexReg16') {
          const r16 = (ea.index as any).reg.toUpperCase();
          if (r16 === 'HL') return true;
          if (r16 === 'DE') {
            return (
              emitInstr(
                'ld',
                [
                  { kind: 'Reg', span, name: 'H' },
                  { kind: 'Reg', span, name: 'D' },
                ],
                span,
              ) &&
              emitInstr(
                'ld',
                [
                  { kind: 'Reg', span, name: 'L' },
                  { kind: 'Reg', span, name: 'E' },
                ],
                span,
              )
            );
          }
          if (r16 === 'BC') {
            return (
              emitInstr(
                'ld',
                [
                  { kind: 'Reg', span, name: 'H' },
                  { kind: 'Reg', span, name: 'B' },
                ],
                span,
              ) &&
              emitInstr(
                'ld',
                [
                  { kind: 'Reg', span, name: 'L' },
                  { kind: 'Reg', span, name: 'C' },
                ],
                span,
              )
            );
          }
          diagAt(diagnostics, span, `Invalid reg16 index "${ea.index.reg}".`);
          return false;
        }
        // reg8
        const r8 = (ea.index as any).reg.toUpperCase();
        if (!reg8.has(r8)) {
          diagAt(diagnostics, span, `Invalid reg8 index "${(ea.index as any).reg}".`);
          return false;
        }
        return (
          emitInstr(
            'ld',
            [
              { kind: 'Reg', span, name: 'H' },
              { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } },
            ],
            span,
          ) &&
          emitInstr(
            'ld',
            [
              { kind: 'Reg', span, name: 'L' },
              { kind: 'Reg', span, name: r8 },
            ],
            span,
          )
        );
      };

      if (!loadIndexToHL()) return false;
      for (let i = 0; i < shiftCount; i++) {
        if (
          !emitInstr(
            'add',
            [
              { kind: 'Reg', span, name: 'HL' },
              { kind: 'Reg', span, name: 'HL' },
            ],
            span,
          )
        )
          return false;
      }

      if (baseResolved.kind === 'abs') {
        emitAbs16Fixup(0x11, baseResolved.baseLower, baseResolved.addend, span); // ld de, nn
        if (
          !emitInstr(
            'add',
            [
              { kind: 'Reg', span, name: 'HL' },
              { kind: 'Reg', span, name: 'DE' },
            ],
            span,
          )
        )
          return false;
        return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }

      // stack base: base address = IX + disp
      if (
        !emitInstr(
          'ex',
          [
            { kind: 'Reg', span, name: 'DE' },
            { kind: 'Reg', span, name: 'HL' },
          ],
          span,
        )
      )
        return false; // DE=index
      if (!emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false; // save index
      if (!emitInstr('push', [{ kind: 'Reg', span, name: 'IX' }], span)) return false;
      if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false; // HL=IX
      if (baseResolved.ixDisp !== 0) {
        if (!loadImm16ToDE(baseResolved.ixDisp, span)) return false;
        if (
          !emitInstr(
            'add',
            [
              { kind: 'Reg', span, name: 'HL' },
              { kind: 'Reg', span, name: 'DE' },
            ],
            span,
          )
        )
          return false;
      }
      if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false; // DE=index
      if (
        !emitInstr(
          'add',
          [
            { kind: 'Reg', span, name: 'HL' },
            { kind: 'Reg', span, name: 'DE' },
          ],
          span,
        )
      )
        return false;
      return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
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
      ): RuntimeLinear =>
        atom
          ? { constTerm, coeff, atomName: atom.name, atomKind: atom.kind }
          : { constTerm, coeff };

      const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

      const combineRuntimeLinear = (
        left: RuntimeLinear | undefined,
        right: RuntimeLinear | undefined,
        op: '+' | '-',
      ): RuntimeLinear | undefined => {
        if (!left || !right) return undefined;
        const rightCoeff = op === '+' ? right.coeff : -right.coeff;
        const rightConst = op === '+' ? right.constTerm : -right.constTerm;
        if (!left.atomName && !right.atomName) {
          return mkRuntimeLinear(left.constTerm + rightConst, 0);
        }
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
        if (left.atomName !== right.atomName) return undefined;
        if (!left.atomKind) return undefined;
        return mkRuntimeLinear(left.constTerm + rightConst, left.coeff + rightCoeff, {
          name: left.atomName,
          kind: left.atomKind,
        });
      };

      const runtimeLinearFromImm = (expr: ImmExprNode): RuntimeLinear | undefined => {
        const imm = evalImmNoDiag(expr);
        if (imm !== undefined) return mkRuntimeLinear(imm, 0);

        switch (expr.kind) {
          case 'ImmLiteral':
          case 'ImmSizeof':
          case 'ImmOffsetof':
            return mkRuntimeLinear(evalImmExpr(expr, env, diagnostics) ?? 0, 0);
          case 'ImmName': {
            const scalar = resolveScalarBinding(expr.name);
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
                if (leftConstOnly && rightConstOnly) {
                  return mkRuntimeLinear(left.constTerm * right.constTerm, 0);
                }
                if (leftConstOnly && right.atomName) {
                  if (!right.atomKind) return undefined;
                  return mkRuntimeLinear(
                    right.constTerm * left.constTerm,
                    right.coeff * left.constTerm,
                    {
                      name: right.atomName,
                      kind: right.atomKind,
                    },
                  );
                }
                if (rightConstOnly && left.atomName) {
                  if (!left.atomKind) return undefined;
                  return mkRuntimeLinear(
                    left.constTerm * right.constTerm,
                    left.coeff * right.constTerm,
                    {
                      name: left.atomName,
                      kind: left.atomKind,
                    },
                  );
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
        const imm = evalImmExpr(expr, env, diagnostics);
        if (imm !== undefined) return loadImm16ToHL(imm & 0xffff, span);

        const linear = runtimeLinearFromImm(expr);
        if (!linear) {
          diagAt(
            diagnostics,
            span,
            `${context} is unsupported. Use a single scalar runtime atom with +, -, *, << and constants (no /, %, &, |, ^, >> on runtime atoms).`,
          );
          return false;
        }

        if (!linear.atomName || !linear.atomKind || linear.coeff === 0) {
          return loadImm16ToHL(linear.constTerm & 0xffff, span);
        }

        const coeffSign = linear.coeff < 0 ? -1 : 1;
        const coeffAbs = Math.abs(linear.coeff);
        if (!isPowerOfTwo(coeffAbs)) {
          diagAt(
            diagnostics,
            span,
            `${context} runtime multiplier must be a power-of-2; found ${linear.coeff}.`,
          );
          return false;
        }

        const atomEa: EaExprNode = { kind: 'EaName', span, name: linear.atomName };
        const want = linear.atomKind === 'byte' ? 'byte' : 'word';
        if (!pushMemValue(atomEa, want, span)) return false;
        if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;

        const shiftCount = coeffAbs <= 1 ? 0 : Math.log2(coeffAbs);
        for (let i = 0; i < shiftCount; i++) {
          if (
            !emitInstr(
              'add',
              [
                { kind: 'Reg', span, name: 'HL' },
                { kind: 'Reg', span, name: 'HL' },
              ],
              span,
            )
          ) {
            return false;
          }
        }

        if (coeffSign < 0 && !negateHL(span)) return false;

        const addend = linear.constTerm & 0xffff;
        if (addend !== 0) {
          if (!loadImm16ToDE(addend, span)) return false;
          if (
            !emitInstr(
              'add',
              [
                { kind: 'Reg', span, name: 'HL' },
                { kind: 'Reg', span, name: 'DE' },
              ],
              span,
            )
          ) {
            return false;
          }
        }
        return true;
      };

      // Fallback: support runtime indexing and runtime ea offsets by
      // computing dynamic portions into HL and then combining with base.
      if (ea.kind !== 'EaIndex' && ea.kind !== 'EaAdd' && ea.kind !== 'EaSub') return false;
      if (ea.kind === 'EaAdd' || ea.kind === 'EaSub') {
        if (!pushEaAddress(ea.base, span)) return false;
        if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        if (!emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        if (!materializeRuntimeImmToHL(ea.offset, 'Runtime EA offset expression')) return false;
        if (ea.kind === 'EaSub' && !negateHL(span)) return false;
        if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
        if (
          !emitInstr(
            'add',
            [
              { kind: 'Reg', span, name: 'HL' },
              { kind: 'Reg', span, name: 'DE' },
            ],
            span,
          )
        ) {
          return false;
        }
        return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }

      const baseType = resolveEaTypeExpr(ea.base);
      if (!baseType || baseType.kind !== 'ArrayType') {
        diagAt(diagnostics, span, `Unsupported ea argument: cannot lower indexed address.`);
        return false;
      }
      const elemSize = sizeOfTypeExpr(baseType.element, env, diagnostics);
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
      // Allow power-of-two element sizes up to 16 bytes; larger or non-power-of-two are unsupported for runtime indexing.
      if (shiftCount < 0 || shiftCount > 4) {
        diagAt(
          diagnostics,
          span,
          `Runtime indexing currently supports element sizes that are powers of two up to 16 bytes (got ${elemSize}).`,
        );
        return false;
      }

      // If the index is sourced from (HL), read it before clobbering HL.
      if (ea.index.kind === 'IndexMemHL') {
        emitRawCodeBytes(Uint8Array.of(0x7e), span.file, 'ld a, (hl)');
      }
      if (ea.index.kind === 'IndexMemIxIy') {
        const memExpr: EaExprNode =
          ea.index.disp === undefined
            ? { kind: 'EaName', span, name: ea.index.base }
            : {
                kind: 'EaAdd',
                span,
                base: { kind: 'EaName', span, name: ea.index.base },
                offset: ea.index.disp,
              };
        if (
          !emitInstr(
            'ld',
            [
              { kind: 'Reg', span, name: 'A' },
              { kind: 'Mem', span, expr: memExpr },
            ],
            span,
          )
        ) {
          return false;
        }
      }

      if (ea.index.kind === 'IndexImm') {
        if (!materializeRuntimeImmToHL(ea.index.value, 'Runtime array index expression')) {
          return false;
        }
      } else if (ea.index.kind === 'IndexEa') {
        const typeExpr = resolveEaTypeExpr(ea.index.expr);
        const scalar = typeExpr ? resolveScalarKind(typeExpr) : undefined;
        if (scalar === 'byte' || scalar === 'word' || scalar === 'addr') {
          const want = scalar === 'byte' ? 'byte' : 'word';
          if (!pushMemValue(ea.index.expr, want, span)) return false;
          if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
        } else {
          diagAt(
            diagnostics,
            span,
            `Nested index expression must resolve to scalar byte/word/addr value.`,
          );
          return false;
        }
      } else if (ea.index.kind === 'IndexReg8') {
        const r8 = ea.index.reg.toUpperCase();
        if (!reg8.has(r8)) {
          diagAt(diagnostics, span, `Invalid reg8 index "${ea.index.reg}".`);
          return false;
        }
        if (
          !emitInstr(
            'ld',
            [
              { kind: 'Reg', span, name: 'H' },
              { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } },
            ],
            span,
          )
        ) {
          return false;
        }
        if (
          !emitInstr(
            'ld',
            [
              { kind: 'Reg', span, name: 'L' },
              { kind: 'Reg', span, name: r8 },
            ],
            span,
          )
        ) {
          return false;
        }
      } else if (ea.index.kind === 'IndexMemHL' || ea.index.kind === 'IndexMemIxIy') {
        if (
          !emitInstr(
            'ld',
            [
              { kind: 'Reg', span, name: 'L' },
              { kind: 'Reg', span, name: 'A' },
            ],
            span,
          )
        ) {
          return false;
        }
        if (
          !emitInstr(
            'ld',
            [
              { kind: 'Reg', span, name: 'H' },
              { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } },
            ],
            span,
          )
        ) {
          return false;
        }
      } else if (ea.index.kind === 'IndexReg16') {
        const r16 = ea.index.reg.toUpperCase();
        if (r16 === 'HL') {
          // HL already holds index.
        } else if (r16 === 'DE') {
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span, name: 'H' },
                { kind: 'Reg', span, name: 'D' },
              ],
              span,
            )
          ) {
            return false;
          }
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span, name: 'L' },
                { kind: 'Reg', span, name: 'E' },
              ],
              span,
            )
          ) {
            return false;
          }
        } else if (r16 === 'BC') {
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span, name: 'H' },
                { kind: 'Reg', span, name: 'B' },
              ],
              span,
            )
          ) {
            return false;
          }
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span, name: 'L' },
                { kind: 'Reg', span, name: 'C' },
              ],
              span,
            )
          ) {
            return false;
          }
        } else {
          diagAt(diagnostics, span, `Invalid reg16 index "${ea.index.reg}".`);
          return false;
        }
      } else {
        diagAt(diagnostics, span, `Non-constant array indices are not supported yet.`);
        return false;
      }

      for (let i = 0; i < shiftCount; i++) {
        if (
          !emitInstr(
            'add',
            [
              { kind: 'Reg', span, name: 'HL' },
              { kind: 'Reg', span, name: 'HL' },
            ],
            span,
          )
        ) {
          return false;
        }
      }

      if (!emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;

      const baseResolved = resolveEa(ea.base, span);
      if (baseResolved?.kind === 'abs') {
        emitAbs16Fixup(0x21, baseResolved.baseLower, baseResolved.addend, span); // ld hl, nn
      } else if (baseResolved?.kind === 'stack') {
        if (!emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
        if (
          !emitInstr('push', [{ kind: 'Reg', span, name: 'IX' }], span) ||
          !emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)
        )
          return false;
        if (baseResolved.ixDisp !== 0) {
          if (!loadImm16ToDE(baseResolved.ixDisp & 0xffff, span)) return false;
          if (
            !emitInstr(
              'add',
              [
                { kind: 'Reg', span, name: 'HL' },
                { kind: 'Reg', span, name: 'DE' },
              ],
              span,
            )
          ) {
            return false;
          }
        }
        if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
      } else {
        if (!pushEaAddress(ea.base, span)) return false;
        if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
      }

      if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
      if (
        !emitInstr(
          'add',
          [
            { kind: 'Reg', span, name: 'HL' },
            { kind: 'Reg', span, name: 'DE' },
          ],
          span,
        )
      ) {
        return false;
      }
      return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
    }
    if (r.kind === 'abs') {
      emitAbs16Fixup(0x21, r.baseLower, r.addend, span); // ld hl, nn
      return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
    }
    // stack slot: use DE shuttle, keep IX intact
    if (!emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false; // save DE
    if (!emitInstr('push', [{ kind: 'Reg', span, name: 'IX' }], span)) return false; // IX->stack
    if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false; // HL=IX
    if (r.ixDisp !== 0) {
      if (!loadImm16ToDE(r.ixDisp & 0xffff, span)) return false; // DE=disp
      if (
        !emitInstr(
          'add',
          [
            { kind: 'Reg', span, name: 'HL' },
            { kind: 'Reg', span, name: 'DE' },
          ],
          span,
        )
      )
        return false;
    }
    if (!emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
    // restore DE
    return emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span); // restore DE
  };

  const { buildEaBytePipeline, buildEaWordPipeline } = createAddressingPipelineBuilders({
    diagnostics,
    diagAt,
    reg8,
    resolveEa,
    resolveEaTypeExpr,
    resolveScalarBinding,
    resolveScalarKind,
    sizeOfTypeExpr: (typeExpr) => sizeOfTypeExpr(typeExpr, env, diagnostics),
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
  });

  const {
    emitScalarWordLoad,
    emitScalarWordStore,
    resolvedScalarKind,
    isWordCompatibleScalarKind,
    canUseScalarWordAccessor,
  } = createScalarWordAccessorHelpers({
    emitStepPipeline,
    resolveScalarKind,
  });

  const emitLoadWordFromHlAddress = (target: 'HL' | 'DE' | 'BC', span: SourceSpan): boolean => {
    if (target === 'DE') {
      return emitStepPipeline(LOAD_RP_EA('DE'), span);
    }
    if (!emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
    if (!emitStepPipeline(LOAD_RP_EA(target), span)) return false;
    return emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span);
  };

  const emitStoreWordToHlAddress = (source: 'DE' | 'BC', span: SourceSpan): boolean =>
    emitStepPipeline(STORE_RP_EA(source), span);

  const emitStoreSavedHlToEa = (ea: EaExprNode, span: SourceSpan): boolean => {
    if (!emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span)) return false;
    if (!emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
    if (!pushEaAddress(ea, span)) return false;
    if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false; // HL = EA
    if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span)) return false; // DE = value
    if (!emitStoreWordToHlAddress('DE', span)) return false;
    return emitInstr('pop', [{ kind: 'Reg', span, name: 'DE' }], span); // restore caller DE
  };

  const pushMemValue = (ea: EaExprNode, want: 'byte' | 'word', span: SourceSpan): boolean => {
    // Use step-library EA builders and templates for byte paths; word paths remain as-is for now.
    if (want === 'word') {
      const r = resolveEa(ea, span);
      if (emitScalarWordLoad('HL', r, span)) {
        return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }
      if (r?.kind === 'abs') {
        emitAbs16Fixup(0x2a, r.baseLower, r.addend, span); // ld hl, (nn)
        return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
      }
      const pipe = buildEaWordPipeline(ea, span);
      if (pipe) {
        // Load to DE then push the loaded word (DE).
        if (!emitStepPipeline(TEMPLATE_LW_DE(pipe), span)) return false;
        return emitInstr('push', [{ kind: 'Reg', span, name: 'DE' }], span);
      }
      // fallback: compute address and load word
      if (!pushEaAddress(ea, span)) return false;
      if (!emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span)) return false;
      emitRawCodeBytes(
        Uint8Array.of(0x5e, 0x23, 0x56, 0xeb),
        span.file,
        'ld e, (hl) ; inc hl ; ld d, (hl) ; ex de, hl',
      );
      return emitInstr('push', [{ kind: 'Reg', span, name: 'HL' }], span);
    }

    // Byte path: preserve caller registers per template; dest/value is the pushed word (HL zero-extended).
    // Scalar fast paths (no index, direct base)
    const r = resolveEa(ea, span);
    if (r?.kind === 'abs') {
      emitAbs16Fixup(0x3a, r.baseLower, r.addend, span); // ld a,(nn)
      return pushZeroExtendedReg8('A', span);
    }
    if (r?.kind === 'stack' && r.ixDisp >= -128 && r.ixDisp <= 127) {
      const d = r.ixDisp & 0xff;
      emitRawCodeBytes(
        Uint8Array.of(0xdd, 0x5e, d),
        span.file,
        `ld e, (ix${formatIxDisp(r.ixDisp)})`,
      );
      return pushZeroExtendedReg8('E', span);
    }

    // Indexed / general path: build EA then apply L-ABC with dest=A (pushed as HL zero-extended).
    const eaPipe = buildEaBytePipeline(ea, span);
    if (!eaPipe) return false;
    const templated = TEMPLATE_L_ABC('A', eaPipe);
    return emitStepPipeline(templated, span) && pushZeroExtendedReg8('A', span);
  };

  const { materializeEaAddressToHL } = createEaMaterializationHelpers({
    resolveEa,
    pushEaAddress,
    emitInstr,
    emitAbs16Fixup,
    loadImm16ToDE,
  });

  const { lowerLdWithEa } = createLdLoweringHelpers({
    LOAD_RP_FVAR,
    LOAD_RP_GLOB,
    STORE_RP_FVAR,
    STORE_RP_GLOB,
    TEMPLATE_L_ABC,
    TEMPLATE_L_DE,
    TEMPLATE_L_HL,
    TEMPLATE_LW_BC,
    TEMPLATE_LW_DE,
    TEMPLATE_LW_HL,
    TEMPLATE_S_ANY,
    TEMPLATE_S_HL,
    TEMPLATE_SW_DEBC,
    TEMPLATE_SW_HL,
    buildEaBytePipeline,
    buildEaWordPipeline,
    canUseScalarWordAccessor,
    diagAt,
    diagnostics,
    emitAbs16Fixup,
    emitAbs16FixupEd,
    emitAbs16FixupPrefixed,
    emitInstr,
    emitLoadWordFromHlAddress,
    emitRawCodeBytes,
    emitScalarWordLoad,
    emitScalarWordStore,
    emitStepPipeline,
    emitStoreSavedHlToEa,
    emitStoreWordToHlAddress,
    env,
    evalImmExpr: (expr: any) => evalImmExpr(expr, env, diagnostics),
    formatIxDisp,
    isWordCompatibleScalarKind,
    loadImm16ToHL,
    materializeEaAddressToHL,
    reg8Code,
    resolveEa,
    resolveScalarBinding,
    resolveScalarKind,
    resolveScalarTypeForEa,
    resolveScalarTypeForLd,
    resolvedScalarKind,
    setSpTrackingInvalid: () => {
      spTrackingValid = false;
      spTrackingInvalidatedByMutation = true;
    },
    stackSlotOffsets,
    storageTypes,
  });

  const firstModule = program.files[0];
  if (!firstModule) {
    diag(diagnostics, program.entryFile, 'No module files to compile.');
    return { map: { bytes }, symbols };
  }

  const primaryFile = firstModule.span.file ?? program.entryFile;
  const includeDirs = (options?.includeDirs ?? []).map((p) => resolve(p));

  // Pre-scan callables for resolution (forward references allowed).
  for (const module of program.files) {
    for (const item of module.items) {
      if (item.kind === 'FuncDecl') {
        const f = item as FuncDeclNode;
        callables.set(f.name.toLowerCase(), { kind: 'func', node: f });
      } else if (item.kind === 'OpDecl') {
        const op = item as OpDeclNode;
        const key = op.name.toLowerCase();
        const existing = opsByName.get(key);
        if (existing) existing.push(op);
        else opsByName.set(key, [op]);
      } else if (item.kind === 'ExternDecl') {
        const ex = item as ExternDeclNode;
        for (const fn of ex.funcs) {
          callables.set(fn.name.toLowerCase(), {
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
            storageTypes.set(lower, decl.typeExpr);
            continue;
          }
          if (decl.initializer?.kind === 'VarInitAlias') {
            moduleAliasTargets.set(lower, decl.initializer.expr);
            moduleAliasDecls.set(lower, decl);
          }
        }
      } else if (item.kind === 'BinDecl') {
        const bd = item as BinDeclNode;
        declaredBinNames.add(bd.name.toLowerCase());
        rawAddressSymbols.add(bd.name.toLowerCase());
        storageTypes.set(bd.name.toLowerCase(), { kind: 'TypeName', span: bd.span, name: 'addr' });
      } else if (item.kind === 'HexDecl') {
        const hd = item as HexDeclNode;
        rawAddressSymbols.add(hd.name.toLowerCase());
        storageTypes.set(hd.name.toLowerCase(), { kind: 'TypeName', span: hd.span, name: 'addr' });
      } else if (item.kind === 'DataBlock') {
        const db = item as DataBlockNode;
        for (const decl of db.decls) {
          const lower = decl.name.toLowerCase();
          storageTypes.set(lower, decl.typeExpr);
          // Only add non-scalar data symbols to rawAddressSymbols.
          // Scalar data symbols (byte, word, addr) use value semantics like globals.
          const scalar = resolveScalarKind(decl.typeExpr);
          if (!scalar) {
            rawAddressSymbols.add(lower);
          }
        }
      }
    }
  }

  let activeSection: SectionKind = 'code';
  let codeOffset = 0;
  let dataOffset = 0;
  let varOffset = 0;

  const baseExprs: Partial<Record<SectionKind, SectionDirectiveNode['at']>> = {};

  const setBaseExpr = (kind: SectionKind, at: SectionDirectiveNode['at'], file: string) => {
    if (baseExprs[kind]) {
      diag(diagnostics, file, `Section "${kind}" base address may be set at most once.`);
      return;
    }
    baseExprs[kind] = at;
  };

  const advanceAlign = (a: number) => {
    switch (activeSection) {
      case 'code':
        codeOffset = alignTo(codeOffset, a);
        return;
      case 'data':
        dataOffset = alignTo(dataOffset, a);
        return;
      case 'var':
        varOffset = alignTo(varOffset, a);
        return;
    }
  };

  for (const module of program.files) {
    activeSection = 'code';

    for (const item of module.items) {
      if (item.kind === 'ConstDecl') {
        const v = env.consts.get(item.name);
        if (v !== undefined) {
          if (taken.has(item.name)) {
            diag(diagnostics, item.span.file, `Duplicate symbol name "${item.name}".`);
            continue;
          }
          taken.add(item.name);
          symbols.push({
            kind: 'constant',
            name: item.name,
            value: v,
            address: v & 0xffff,
            file: item.span.file,
            line: item.span.start.line,
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
          if (env.enums.get(name) !== idx) continue;
          if (taken.has(name)) {
            diag(diagnostics, e.span.file, `Duplicate symbol name "${name}".`);
            continue;
          }
          taken.add(name);
          symbols.push({
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
        activeSection = s.section;
        if (s.at) setBaseExpr(s.section, s.at, s.span.file);
        continue;
      }

      if (item.kind === 'Align') {
        const a = item as AlignDirectiveNode;
        const v = evalImmExpr(a.value, env, diagnostics);
        if (v === undefined) {
          diag(diagnostics, a.span.file, `Failed to evaluate align value.`);
          continue;
        }
        if (v <= 0) {
          diag(diagnostics, a.span.file, `align value must be > 0.`);
          continue;
        }
        advanceAlign(v);
        continue;
      }

      if (item.kind === 'ExternDecl') {
        const ex = item as ExternDeclNode;
        const baseLower = ex.base?.toLowerCase();
        if (baseLower !== undefined && !declaredBinNames.has(baseLower)) {
          diag(
            diagnostics,
            ex.span.file,
            `extern base "${ex.base}" does not reference a declared bin symbol.`,
          );
          continue;
        }
        for (const fn of ex.funcs) {
          if (taken.has(fn.name)) {
            diag(diagnostics, fn.span.file, `Duplicate symbol name "${fn.name}".`);
            continue;
          }
          taken.add(fn.name);
          if (baseLower !== undefined) {
            const offset = evalImmExpr(fn.at, env, diagnostics);
            if (offset === undefined) {
              diag(
                diagnostics,
                fn.span.file,
                `Failed to evaluate extern func offset for "${fn.name}".`,
              );
              continue;
            }
            if (offset < 0 || offset > 0xffff) {
              diag(
                diagnostics,
                fn.span.file,
                `extern func "${fn.name}" offset out of range (0..65535).`,
              );
              continue;
            }
            deferredExterns.push({
              name: fn.name,
              baseLower,
              addend: offset,
              file: fn.span.file,
              line: fn.span.start.line,
            });
            continue;
          }

          const addr = evalImmExpr(fn.at, env, diagnostics);
          if (addr === undefined) {
            diag(
              diagnostics,
              fn.span.file,
              `Failed to evaluate extern func address for "${fn.name}".`,
            );
            continue;
          }
          if (addr < 0 || addr > 0xffff) {
            diag(
              diagnostics,
              fn.span.file,
              `extern func "${fn.name}" address out of range (0..65535).`,
            );
            continue;
          }
          symbols.push({
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
        if (taken.has(binDecl.name)) {
          diag(diagnostics, binDecl.span.file, `Duplicate symbol name "${binDecl.name}".`);
          continue;
        }
        taken.add(binDecl.name);

        const blob = loadBinInput(
          binDecl.span.file,
          binDecl.fromPath,
          includeDirs,
          (file, message) => diag(diagnostics, file, message),
        );
        if (!blob) continue;

        if (binDecl.section === 'var') {
          diag(
            diagnostics,
            binDecl.span.file,
            `bin declarations cannot target section "var" in v0.2.`,
          );
          continue;
        }

        if (binDecl.section === 'code') {
          pending.push({
            kind: 'data',
            name: binDecl.name,
            section: 'code',
            offset: codeOffset,
            file: binDecl.span.file,
            line: binDecl.span.start.line,
            scope: 'global',
          });
          for (const b of blob) codeBytes.set(codeOffset++, b & 0xff);
        } else {
          pending.push({
            kind: 'data',
            name: binDecl.name,
            section: 'data',
            offset: dataOffset,
            file: binDecl.span.file,
            line: binDecl.span.start.line,
            scope: 'global',
          });
          for (const b of blob) dataBytes.set(dataOffset++, b & 0xff);
        }
        continue;
      }

      if (item.kind === 'HexDecl') {
        const hexDecl = item as HexDeclNode;
        if (taken.has(hexDecl.name)) {
          diag(diagnostics, hexDecl.span.file, `Duplicate symbol name "${hexDecl.name}".`);
          continue;
        }
        taken.add(hexDecl.name);

        const parsed = loadHexInput(
          hexDecl.span.file,
          hexDecl.fromPath,
          includeDirs,
          (file, message) => diag(diagnostics, file, message),
        );
        if (!parsed) continue;

        for (const [addr, b] of parsed.bytes) {
          if (hexBytes.has(addr)) {
            diag(diagnostics, hexDecl.span.file, `HEX overlap at address ${addr}.`);
            continue;
          }
          hexBytes.set(addr, b);
        }
        absoluteSymbols.push({
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
        if (taken.has(op.name) && !declaredOpNames.has(key)) {
          diag(diagnostics, op.span.file, `Duplicate symbol name "${op.name}".`);
        } else {
          taken.add(op.name);
          declaredOpNames.add(key);
        }
        continue;
      }

      if (item.kind === 'FuncDecl') {
        stackSlotOffsets.clear();
        stackSlotTypes.clear();
        localAliasTargets = new Map<string, EaExprNode>();
        spDeltaTracked = 0;
        spTrackingValid = true;
        spTrackingInvalidatedByMutation = false;

        const localDecls = item.locals?.decls ?? [];
        const returnRegs = (item.returnRegs ?? []).map((r) => r.toUpperCase());
        const basePreserveOrder: string[] = ['AF', 'BC', 'DE', 'HL'];
        let preserveSet = basePreserveOrder.filter((r) => !returnRegs.includes(r));
        const preserveBytes = preserveSet.length * 2;
        const shouldPreserveTypedBoundary = preserveSet.length > 0;
        const hlPreserved = preserveSet.includes('HL');
        let localSlotCount = 0;
        const localScalarInitializers: Array<{
          name: string;
          expr?: ImmExprNode;
          span: SourceSpan;
          scalarKind: 'byte' | 'word' | 'addr';
        }> = [];
        for (let li = 0; li < localDecls.length; li++) {
          const decl = localDecls[li]!;
          const declLower = decl.name.toLowerCase();
          if (decl.typeExpr) {
            const scalarKind = resolveScalarKind(decl.typeExpr);
            if (!scalarKind) {
              diagAt(
                diagnostics,
                decl.span,
                `Non-scalar local storage declaration "${decl.name}" requires alias form ("${decl.name} = rhs").`,
              );
              continue;
            }
            // Locals are packed tightly starting at IX-2, independent of preserve bytes.
            const localIxDisp = -(2 * (localSlotCount + 1));
            stackSlotOffsets.set(declLower, localIxDisp);
            stackSlotTypes.set(declLower, decl.typeExpr);
            localSlotCount++;
            const init = decl.initializer;
            if (init && init.kind !== 'VarInitValue') {
              diagAt(
                diagnostics,
                decl.span,
                `Unsupported typed alias form for "${decl.name}": use "${decl.name} = rhs" for alias initialization.`,
              );
              continue;
            }
            localScalarInitializers.push({
              name: decl.name,
              ...(init ? { expr: init.expr } : {}),
              span: decl.span,
              scalarKind,
            });
            continue;
          }
          const init = decl.initializer;
          if (init?.kind !== 'VarInitAlias') {
            diagAt(
              diagnostics,
              decl.span,
              `Invalid local declaration "${decl.name}": expected typed storage or alias initializer.`,
            );
            continue;
          }
          localAliasTargets.set(declLower, init.expr);
          const inferred = resolveEaTypeExpr(init.expr);
          if (!inferred) {
            diagAt(
              diagnostics,
              decl.span,
              `Incompatible inferred alias binding for "${decl.name}": unable to infer type from alias source.`,
            );
            continue;
          }
          stackSlotTypes.set(declLower, inferred);
        }
        const localBytes = localSlotCount * 2;
        const frameSize = localBytes + preserveBytes;
        const argc = item.params.length;
        const hasStackSlots = frameSize > 0 || argc > 0 || preserveBytes > 0;
        for (let paramIndex = 0; paramIndex < argc; paramIndex++) {
          const p = item.params[paramIndex]!;
          const base = 4 + 2 * paramIndex;
          stackSlotOffsets.set(p.name.toLowerCase(), base);
          stackSlotTypes.set(p.name.toLowerCase(), p.typeExpr);
        }

        let epilogueLabel = `__zax_epilogue_${generatedLabelCounter++}`;
        while (taken.has(epilogueLabel)) {
          epilogueLabel = `__zax_epilogue_${generatedLabelCounter++}`;
        }
        const emitSyntheticEpilogue =
          preserveSet.length > 0 || hasStackSlots || localScalarInitializers.length > 0;

        // Function entry label.
        traceComment(codeOffset, `func ${item.name} begin`);
        if (taken.has(item.name)) {
          diag(diagnostics, item.span.file, `Duplicate symbol name "${item.name}".`);
        } else {
          taken.add(item.name);
          traceLabel(codeOffset, item.name);
          pending.push({
            kind: 'label',
            name: item.name,
            section: 'code',
            offset: codeOffset,
            file: item.span.file,
            line: item.span.start.line,
            scope: 'global',
          });
        }

        if (hasStackSlots) {
          const prevTag = currentCodeSegmentTag;
          currentCodeSegmentTag = {
            file: item.span.file,
            line: item.span.start.line,
            column: item.span.start.column,
            kind: 'code',
            confidence: 'high',
          };
          try {
            emitInstr('push', [{ kind: 'Reg', span: item.span, name: 'IX' }], item.span);
            emitInstr(
              'ld',
              [
                { kind: 'Reg', span: item.span, name: 'IX' },
                {
                  kind: 'Imm',
                  span: item.span,
                  expr: { kind: 'ImmLiteral', span: item.span, value: 0 },
                },
              ],
              item.span,
            );
            emitInstr(
              'add',
              [
                { kind: 'Reg', span: item.span, name: 'IX' },
                { kind: 'Reg', span: item.span, name: 'SP' },
              ],
              item.span,
            );
          } finally {
            currentCodeSegmentTag = prevTag;
          }
        }

        for (const init of localScalarInitializers) {
          const prevTag = currentCodeSegmentTag;
          currentCodeSegmentTag = {
            file: init.span.file,
            line: init.span.start.line,
            column: init.span.start.column,
            kind: 'code',
            confidence: 'high',
          };
          try {
            const initValue =
              init.expr !== undefined ? evalImmExpr(init.expr, env, diagnostics) : 0;
            if (init.expr !== undefined && initValue === undefined) {
              diagAt(
                diagnostics,
                init.span,
                `Failed to evaluate local initializer for "${init.name}".`,
              );
              continue;
            }
            const narrowed = init.scalarKind === 'byte' ? initValue! & 0xff : initValue! & 0xffff;
            if (hlPreserved) {
              // Swap pattern: save incoming HL, load initializer, swap to stack, restore HL.
              emitInstr('push', [{ kind: 'Reg', span: init.span, name: 'HL' }], init.span);
              if (!loadImm16ToHL(narrowed, init.span)) continue;
              emitInstr(
                'ex',
                [
                  {
                    kind: 'Mem',
                    span: init.span,
                    expr: { kind: 'EaName', span: init.span, name: 'SP' },
                  },
                  { kind: 'Reg', span: init.span, name: 'HL' },
                ],
                init.span,
              );
            } else {
              if (!loadImm16ToHL(narrowed, init.span)) continue;
              emitInstr('push', [{ kind: 'Reg', span: init.span, name: 'HL' }], init.span);
            }
          } finally {
            currentCodeSegmentTag = prevTag;
          }
        }

        if (shouldPreserveTypedBoundary) {
          const prevTag = currentCodeSegmentTag;
          currentCodeSegmentTag = {
            file: item.span.file,
            line: item.span.start.line,
            column: item.span.start.column,
            kind: 'code',
            confidence: 'high',
          };
          try {
            for (const reg of preserveSet) {
              emitInstr('push', [{ kind: 'Reg', span: item.span, name: reg }], item.span);
            }
          } finally {
            currentCodeSegmentTag = prevTag;
          }
        }

        // Track SP deltas relative to the start of user asm, after prologue reservation.
        spDeltaTracked = 0;
        spTrackingValid = true;
        spTrackingInvalidatedByMutation = false;

        type FlowState = {
          reachable: boolean;
          spDelta: number;
          spValid: boolean;
          spInvalidDueToMutation: boolean;
        };
        let flow: FlowState = {
          reachable: true,
          spDelta: 0,
          spValid: true,
          spInvalidDueToMutation: false,
        };
        const flowRef: { readonly current: FlowState } = {
          get current() {
            return flow;
          },
        };
        type OpExpansionFrame = {
          key: string;
          name: string;
          declSpan: SourceSpan;
          callSiteSpan: SourceSpan;
        };
        const opExpansionStack: OpExpansionFrame[] = [];
        const currentOpExpansionFrame = (): OpExpansionFrame | undefined =>
          opExpansionStack.length > 0 ? opExpansionStack[opExpansionStack.length - 1] : undefined;
        const rootOpExpansionFrame = (): OpExpansionFrame | undefined =>
          opExpansionStack.length > 0 ? opExpansionStack[0] : undefined;
        const currentMacroCallSiteSpan = (): SourceSpan | undefined =>
          rootOpExpansionFrame()?.callSiteSpan;
        const formatInstructionForOpExpansionDiag = (inst: AsmInstructionNode): string => {
          const ops = inst.operands.map(formatAsmOperandForOpDiag).join(', ');
          return ops.length > 0 ? `${inst.head} ${ops}` : inst.head;
        };
        const appendInvalidOpExpansionDiagnostic = (
          inst: AsmInstructionNode,
          diagnosticsStart: number,
        ): void => {
          const frame = currentOpExpansionFrame();
          if (!frame) return;
          const rootFrame = rootOpExpansionFrame();
          const newDiagnostics = diagnostics.slice(diagnosticsStart);
          const hasConcreteInstructionFailure = newDiagnostics.some(
            (d) =>
              d.severity === 'error' &&
              (d.id === DiagnosticIds.EncodeError || d.id === DiagnosticIds.EmitError),
          );
          if (!hasConcreteInstructionFailure) return;
          if (
            newDiagnostics.some(
              (d) =>
                d.id === DiagnosticIds.OpInvalidExpansion ||
                d.id === DiagnosticIds.OpArityMismatch ||
                d.id === DiagnosticIds.OpNoMatchingOverload ||
                d.id === DiagnosticIds.OpAmbiguousOverload ||
                d.id === DiagnosticIds.OpExpansionCycle,
            )
          ) {
            return;
          }
          const expansionChain = opExpansionStack
            .map((entry) => `${entry.name} (${entry.declSpan.file}:${entry.declSpan.start.line})`)
            .join(' -> ');
          diagAtWithId(
            diagnostics,
            rootFrame?.callSiteSpan ?? frame.callSiteSpan,
            DiagnosticIds.OpInvalidExpansion,
            `Invalid op expansion in "${frame.name}" at call site.\n` +
              `expanded instruction: ${formatInstructionForOpExpansionDiag(inst)}\n` +
              `op definition: ${frame.declSpan.file}:${frame.declSpan.start.line}\n` +
              `expansion chain: ${expansionChain}`,
          );
        };
        const sourceTagForSpan = (span: SourceSpan): SourceSegmentTag => {
          const macroCallSite = currentMacroCallSiteSpan();
          const taggedSpan = macroCallSite ?? span;
          return {
            file: taggedSpan.file,
            line: taggedSpan.start.line,
            column: taggedSpan.start.column,
            kind: macroCallSite ? 'macro' : 'code',
            confidence: 'high',
          };
        };
        const withCodeSourceTag = <T>(tag: SourceSegmentTag, fn: () => T): T => {
          const prev = currentCodeSegmentTag;
          currentCodeSegmentTag = tag;
          try {
            return fn();
          } finally {
            currentCodeSegmentTag = prev;
          }
        };

        const syncFromFlow = (): void => {
          spDeltaTracked = flow.spDelta;
          spTrackingValid = flow.spValid;
          spTrackingInvalidatedByMutation = flow.spInvalidDueToMutation;
        };
        const syncToFlow = (): void => {
          flow.spDelta = spDeltaTracked;
          flow.spValid = spTrackingValid;
          flow.spInvalidDueToMutation = spTrackingInvalidatedByMutation;
        };
        const snapshotFlow = (): FlowState => ({ ...flow });
        const restoreFlow = (state: FlowState): void => {
          flow = { ...state };
          syncFromFlow();
        };

        const newHiddenLabel = (prefix: string): string => {
          let n = `${prefix}_${generatedLabelCounter++}`;
          while (taken.has(n)) {
            n = `${prefix}_${generatedLabelCounter++}`;
          }
          return n;
        };
        const defineCodeLabel = (
          name: string,
          span: SourceSpan,
          scope: 'global' | 'local',
        ): void => {
          if (taken.has(name)) {
            diag(diagnostics, span.file, `Duplicate symbol name "${name}".`);
            return;
          }
          taken.add(name);
          traceLabel(codeOffset, name);
          pending.push({
            kind: 'label',
            name,
            section: 'code',
            offset: codeOffset,
            file: span.file,
            line: span.start.line,
            scope,
          });
        };
        const emitJumpTo = (label: string, span: SourceSpan): void => {
          emitAbs16Fixup(0xc3, label.toLowerCase(), 0, span, `jp ${label}`);
        };
        const emitJumpCondTo = (op: number, label: string, span: SourceSpan): void => {
          const ccName = conditionNameFromOpcode(op) ?? 'cc';
          emitAbs16Fixup(op, label.toLowerCase(), 0, span, `jp ${ccName.toLowerCase()}, ${label}`);
        };
        const emitJumpIfFalse = (cc: string, label: string, span: SourceSpan): boolean => {
          if (cc === '__missing__') return false;
          const inv = inverseConditionName(cc);
          if (!inv) {
            diagAt(diagnostics, span, `Unsupported condition code "${cc}".`);
            return false;
          }
          const op = conditionOpcodeFromName(inv);
          if (op === undefined) {
            diagAt(diagnostics, span, `Unsupported condition code "${cc}".`);
            return false;
          }
          emitJumpCondTo(op, label, span);
          return true;
        };
        const emitVirtualReg16Transfer = (asmItem: AsmInstructionNode): boolean => {
          if (asmItem.head.toLowerCase() !== 'ld' || asmItem.operands.length !== 2) return false;
          const dstOp = asmItem.operands[0]!;
          const srcOp = asmItem.operands[1]!;
          if (dstOp.kind !== 'Reg' || srcOp.kind !== 'Reg') return false;

          const dst = dstOp.name.toUpperCase();
          const src = srcOp.name.toUpperCase();
          const supported = new Set(['BC', 'DE', 'HL']);
          if (!supported.has(dst) || !supported.has(src) || dst === src) return false;

          const hi = (reg16: string): 'B' | 'D' | 'H' =>
            reg16 === 'BC' ? 'B' : reg16 === 'DE' ? 'D' : 'H';
          const lo = (reg16: string): 'C' | 'E' | 'L' =>
            reg16 === 'BC' ? 'C' : reg16 === 'DE' ? 'E' : 'L';

          emitInstr(
            'ld',
            [
              { kind: 'Reg', span: asmItem.span, name: hi(dst) },
              { kind: 'Reg', span: asmItem.span, name: hi(src) },
            ],
            asmItem.span,
          );
          emitInstr(
            'ld',
            [
              { kind: 'Reg', span: asmItem.span, name: lo(dst) },
              { kind: 'Reg', span: asmItem.span, name: lo(src) },
            ],
            asmItem.span,
          );
          return true;
        };
        const joinFlows = (
          left: FlowState,
          right: FlowState,
          span: SourceSpan,
          contextName: string,
        ): FlowState => {
          if (!left.reachable && !right.reachable)
            return {
              reachable: false,
              spDelta: 0,
              spValid: true,
              spInvalidDueToMutation: false,
            };
          if (!left.reachable) return { ...right };
          if (!right.reachable) return { ...left };
          let mismatch = false;
          if (
            (!left.spValid || !right.spValid) &&
            (left.spInvalidDueToMutation || right.spInvalidDueToMutation)
          ) {
            diagAt(
              diagnostics,
              span,
              `Cannot verify stack depth at ${contextName} join due to untracked SP mutation.`,
            );
          } else if ((!left.spValid || !right.spValid) && hasStackSlots) {
            diagAt(
              diagnostics,
              span,
              `Cannot verify stack depth at ${contextName} join due to unknown stack state.`,
            );
          }
          if (left.spValid && right.spValid && left.spDelta !== right.spDelta) {
            mismatch = true;
            diagAt(
              diagnostics,
              span,
              `Stack depth mismatch at ${contextName} join (${left.spDelta} vs ${right.spDelta}).`,
            );
          }
          return {
            reachable: true,
            spDelta: left.spDelta,
            spValid: left.spValid && right.spValid && !mismatch,
            spInvalidDueToMutation: left.spInvalidDueToMutation || right.spInvalidDueToMutation,
          };
        };
        const emitSelectCompareToImm16 = (
          value: number,
          mismatchLabel: string,
          span: SourceSpan,
        ): void => {
          emitRawCodeBytes(Uint8Array.of(0x7d), span.file, 'ld a, l');
          emitRawCodeBytes(Uint8Array.of(0xfe, value & 0xff), span.file, 'cp imm8');
          emitJumpCondTo(0xc2, mismatchLabel, span); // jp nz, mismatch
          emitRawCodeBytes(Uint8Array.of(0x7c), span.file, 'ld a, h');
          emitRawCodeBytes(Uint8Array.of(0xfe, (value >> 8) & 0xff), span.file, 'cp imm8');
          emitJumpCondTo(0xc2, mismatchLabel, span); // jp nz, mismatch
        };
        const emitSelectCompareReg8ToImm8 = (
          value: number,
          mismatchLabel: string,
          span: SourceSpan,
        ): void => {
          emitRawCodeBytes(Uint8Array.of(0xfe, value & 0xff), span.file, 'cp imm8');
          emitJumpCondTo(0xc2, mismatchLabel, span); // jp nz, mismatch
        };
        const loadSelectorIntoHL = (selector: AsmOperandNode, span: SourceSpan): boolean => {
          // Select dispatch computes selector value once and keeps it in HL for comparisons.
          if (selector.kind === 'Reg') {
            const r = selector.name.toUpperCase();
            if (r === 'BC' || r === 'DE' || r === 'HL') {
              if (!emitInstr('push', [{ kind: 'Reg', span, name: r }], span)) return false;
              return emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span);
            }
            if (r === 'SP') {
              if (!loadImm16ToHL(0, span)) return false;
              return emitInstr(
                'add',
                [
                  { kind: 'Reg', span, name: 'HL' },
                  { kind: 'Reg', span, name: 'SP' },
                ],
                span,
              );
            }
            if (reg8.has(r)) {
              if (
                !emitInstr(
                  'ld',
                  [
                    { kind: 'Reg', span, name: 'H' },
                    { kind: 'Imm', span, expr: { kind: 'ImmLiteral', span, value: 0 } },
                  ],
                  span,
                )
              ) {
                return false;
              }
              return emitInstr(
                'ld',
                [
                  { kind: 'Reg', span, name: 'L' },
                  { kind: 'Reg', span, name: r },
                ],
                span,
              );
            }
          }
          if (selector.kind === 'Imm') {
            const v = evalImmExpr(selector.expr, env, diagnostics);
            if (v === undefined) {
              diagAt(diagnostics, span, `Failed to evaluate select selector.`);
              return false;
            }
            return loadImm16ToHL(v & 0xffff, span);
          }
          if (selector.kind === 'Ea') {
            if (!pushEaAddress(selector.expr, span)) return false;
            return emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span);
          }
          if (selector.kind === 'Mem') {
            if (!pushMemValue(selector.expr, 'word', span)) return false;
            return emitInstr('pop', [{ kind: 'Reg', span, name: 'HL' }], span);
          }
          diagAt(diagnostics, span, `Unsupported selector form in select.`);
          return false;
        };

        const emitAsmInstruction = (asmItem: AsmInstructionNode): void => {
          const prevTag = currentCodeSegmentTag;
          const diagnosticsStart = diagnostics.length;
          currentCodeSegmentTag = sourceTagForSpan(asmItem.span);
          try {
            for (const operand of asmItem.operands) {
              if (!enforceEaRuntimeAtomBudget(operand, 'Source ea expression')) return;
            }

            const diagIfRetStackImbalanced = (mnemonic = 'ret'): void => {
              if (emitSyntheticEpilogue) return;
              if (spTrackingValid && spDeltaTracked !== 0) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${mnemonic} with non-zero tracked stack delta (${spDeltaTracked}); function stack is imbalanced.`,
                );
                return;
              }
              if (!spTrackingValid && spTrackingInvalidatedByMutation && hasStackSlots) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${mnemonic} reached after untracked SP mutation; cannot verify function stack balance.`,
                );
                return;
              }
              if (!spTrackingValid && hasStackSlots) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${mnemonic} reached with unknown stack depth; cannot verify function stack balance.`,
                );
              }
            };
            const diagIfCallStackUnverifiable = (options?: {
              mnemonic?: string;
              contractKind?: 'callee' | 'typed-call';
            }): void => {
              const mnemonic = options?.mnemonic ?? 'call';
              const contractKind = options?.contractKind ?? 'callee';
              const contractNoun =
                contractKind === 'typed-call'
                  ? 'typed-call boundary contract'
                  : 'callee stack contract';
              if (hasStackSlots && spTrackingValid && spDeltaTracked > 0) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${mnemonic} reached with positive tracked stack delta (${spDeltaTracked}); cannot verify ${contractNoun}.`,
                );
                return;
              }
              if (hasStackSlots && !spTrackingValid && spTrackingInvalidatedByMutation) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${mnemonic} reached after untracked SP mutation; cannot verify ${contractNoun}.`,
                );
                return;
              }
              if (hasStackSlots && !spTrackingValid) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${mnemonic} reached with unknown stack depth; cannot verify ${contractNoun}.`,
                );
              }
            };
            const warnIfRawCallTargetsTypedCallable = (
              symbolicTarget: { baseLower: string; addend: number } | undefined,
            ): void => {
              if (!rawTypedCallWarningsEnabled || !symbolicTarget || symbolicTarget.addend !== 0) {
                return;
              }
              const callable = callables.get(symbolicTarget.baseLower);
              if (!callable) return;
              const typedName = callable.node.name;
              diagAtWithSeverityAndId(
                diagnostics,
                asmItem.span,
                DiagnosticIds.RawCallTypedTargetWarning,
                'warning',
                `Raw call targets typed callable "${typedName}" and bypasses typed-call argument/preservation semantics; use typed call syntax unless raw ABI is intentional.`,
              );
            };
            const callable = callables.get(asmItem.head.toLowerCase());
            if (callable) {
              const args = asmItem.operands;
              const params = callable.kind === 'func' ? callable.node.params : callable.node.params;
              const calleeName = callable.node.name;
              // Caller-side preservation is never injected for typed calls (extern or internal);
              // preservation is handled at the callee boundary.
              const restorePreservedRegs = (): boolean => true;
              if (args.length !== params.length) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `Call to "${asmItem.head}" has ${args.length} argument(s) but expects ${params.length}.`,
                );
                return;
              }
              const requiresDirectCallSiteEaBudget = (arg: AsmOperandNode): boolean => {
                if (arg.kind === 'Mem') return true;
                if (arg.kind !== 'Ea') return false;
                // Scalar-typed ea values in typed call-arg position are value-semantic and
                // are lowered like loads, so they follow the general source ea atom budget.
                // Address-style call-site ea arguments stay runtime-atom-free in v0.2.
                return resolveScalarTypeForEa(arg.expr) === undefined;
              };
              for (const arg of args) {
                if (!requiresDirectCallSiteEaBudget(arg)) continue;
                if (!enforceDirectCallSiteEaBudget(arg, calleeName)) return;
              }

              const typeForName = (name: string): TypeExprNode | undefined => {
                const lower = name.toLowerCase();
                return stackSlotTypes.get(lower) ?? storageTypes.get(lower);
              };
              const typeForArg = (arg: AsmOperandNode): TypeExprNode | undefined => {
                if (arg.kind === 'Ea') return resolveEaTypeExpr(arg.expr);
                if (arg.kind === 'Imm' && arg.expr.kind === 'ImmName')
                  return typeForName(arg.expr.name);
                return undefined;
              };
              const pushArgAddressFromName = (name: string): boolean =>
                pushEaAddress({ kind: 'EaName', span: asmItem.span, name } as any, asmItem.span);
              const pushArgAddressFromOperand = (arg: AsmOperandNode): boolean => {
                if (arg.kind === 'Ea') return pushEaAddress(arg.expr, asmItem.span);
                if (arg.kind === 'Imm' && arg.expr.kind === 'ImmName') {
                  return pushArgAddressFromName(arg.expr.name);
                }
                return false;
              };
              const checkNonScalarParamCompatibility = (
                param: ParamNode,
                argType: TypeExprNode,
              ): string | undefined => {
                const paramArray = resolveArrayType(param.typeExpr);
                const argArray = resolveArrayType(argType);
                if (paramArray) {
                  if (!argArray) {
                    return `Incompatible non-scalar argument for parameter "${param.name}": expected ${typeDisplay(
                      param.typeExpr,
                    )}, got ${typeDisplay(argType)}.`;
                  }
                  if (!sameTypeShape(paramArray.element, argArray.element)) {
                    return `Incompatible non-scalar argument for parameter "${param.name}": expected element type ${typeDisplay(
                      paramArray.element,
                    )}, got ${typeDisplay(argArray.element)}.`;
                  }
                  if (paramArray.length !== undefined) {
                    if (argArray.length === undefined) {
                      return `Incompatible non-scalar argument for parameter "${param.name}": expected ${typeDisplay(
                        param.typeExpr,
                      )}, got ${typeDisplay(argType)} (exact length proof required).`;
                    }
                    if (argArray.length !== paramArray.length) {
                      return `Incompatible non-scalar argument for parameter "${param.name}": expected ${typeDisplay(
                        param.typeExpr,
                      )}, got ${typeDisplay(argType)}.`;
                    }
                  }
                  return undefined;
                }

                if (!sameTypeShape(param.typeExpr, argType)) {
                  return `Incompatible non-scalar argument for parameter "${param.name}": expected ${typeDisplay(
                    param.typeExpr,
                  )}, got ${typeDisplay(argType)}.`;
                }
                return undefined;
              };

              const pushArgValueFromName = (name: string, want: 'byte' | 'word'): boolean => {
                const scalar = resolveScalarBinding(name);
                if (scalar) {
                  return pushMemValue(
                    { kind: 'EaName', span: asmItem.span, name } as any,
                    want,
                    asmItem.span,
                  );
                }
                return pushEaAddress(
                  { kind: 'EaName', span: asmItem.span, name } as any,
                  asmItem.span,
                );
              };
              const pushArgValueFromEa = (ea: EaExprNode, want: 'byte' | 'word'): boolean => {
                const scalar = resolveScalarTypeForEa(ea);
                if (scalar) return pushMemValue(ea, want, asmItem.span);
                return pushEaAddress(ea, asmItem.span);
              };
              const enumValueFromEa = (ea: EaExprNode): number | undefined => {
                const name = flattenEaDottedName(ea);
                if (!name) return undefined;
                return env.enums.get(name);
              };
              let ok = true;
              let pushedArgWords = 0;
              for (let ai = args.length - 1; ai >= 0; ai--) {
                const arg = args[ai]!;
                const param = params[ai]!;
                const scalarKind = resolveScalarKind(param.typeExpr);
                if (!scalarKind) {
                  const argType = typeForArg(arg);
                  if (!argType) {
                    diagAt(
                      diagnostics,
                      asmItem.span,
                      `Incompatible non-scalar argument for parameter "${param.name}": expected address-style operand bound to non-scalar storage.`,
                    );
                    ok = false;
                    break;
                  }
                  const compat = checkNonScalarParamCompatibility(param, argType);
                  if (compat) {
                    diagAt(diagnostics, asmItem.span, compat);
                    ok = false;
                    break;
                  }
                  if (!pushArgAddressFromOperand(arg)) {
                    diagAt(
                      diagnostics,
                      asmItem.span,
                      `Unsupported non-scalar argument form for "${param.name}" in call to "${asmItem.head}".`,
                    );
                    ok = false;
                    break;
                  }
                  pushedArgWords++;
                  continue;
                }
                const isByte = scalarKind === 'byte';

                if (isByte) {
                  if (arg.kind === 'Reg' && reg8.has(arg.name.toUpperCase())) {
                    ok = pushZeroExtendedReg8(arg.name.toUpperCase(), asmItem.span);
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  if (arg.kind === 'Imm') {
                    const v = evalImmExpr(arg.expr, env, diagnostics);
                    if (v === undefined) {
                      if (arg.expr.kind === 'ImmName') {
                        ok = pushArgValueFromName(arg.expr.name, 'byte');
                        if (!ok) break;
                        pushedArgWords++;
                        continue;
                      }
                      diagAt(
                        diagnostics,
                        asmItem.span,
                        `Failed to evaluate argument "${param.name}".`,
                      );
                      ok = false;
                      break;
                    }
                    ok = pushImm16(v & 0xff, asmItem.span);
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  if (arg.kind === 'Ea') {
                    const enumVal = enumValueFromEa(arg.expr);
                    if (enumVal !== undefined) {
                      ok = pushImm16(enumVal & 0xff, asmItem.span);
                      if (!ok) break;
                      pushedArgWords++;
                      continue;
                    }
                    ok = arg.explicitAddressOf
                      ? pushEaAddress(arg.expr, asmItem.span)
                      : pushArgValueFromEa(arg.expr, 'byte');
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  if (arg.kind === 'Mem') {
                    ok = pushMemValue(arg.expr, 'byte', asmItem.span);
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  diagAt(
                    diagnostics,
                    asmItem.span,
                    `Unsupported byte argument form for "${param.name}" in call to "${asmItem.head}".`,
                  );
                  ok = false;
                  break;
                } else {
                  if (arg.kind === 'Reg' && reg16.has(arg.name.toUpperCase())) {
                    const regUp = arg.name.toUpperCase();
                    // Prefer templated store when EA is resolvable.
                    const pipe = buildEaWordPipeline(
                      { kind: 'EaName', span: asmItem.span, name: param.name },
                      asmItem.span,
                    );
                    if (pipe) {
                      const templated = TEMPLATE_SW_DEBC(regUp as 'DE' | 'BC', pipe);
                      if (emitStepPipeline(templated, asmItem.span)) {
                        pushedArgWords++;
                        continue;
                      }
                    }
                    ok = emitInstr(
                      'push',
                      [{ kind: 'Reg', span: asmItem.span, name: regUp }],
                      asmItem.span,
                    );
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  if (arg.kind === 'Reg' && reg8.has(arg.name.toUpperCase())) {
                    ok = pushZeroExtendedReg8(arg.name.toUpperCase(), asmItem.span);
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  if (arg.kind === 'Imm') {
                    const v = evalImmExpr(arg.expr, env, diagnostics);
                    if (v === undefined) {
                      if (arg.expr.kind === 'ImmName') {
                        ok = pushArgValueFromName(arg.expr.name, 'word');
                        if (!ok) break;
                        pushedArgWords++;
                        continue;
                      }
                      diagAt(
                        diagnostics,
                        asmItem.span,
                        `Failed to evaluate argument "${param.name}".`,
                      );
                      ok = false;
                      break;
                    }
                    ok = pushImm16(v & 0xffff, asmItem.span);
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  if (arg.kind === 'Ea') {
                    const enumVal = enumValueFromEa(arg.expr);
                    if (enumVal !== undefined) {
                      ok = pushImm16(enumVal & 0xffff, asmItem.span);
                      if (!ok) break;
                      pushedArgWords++;
                      continue;
                    }
                    ok = arg.explicitAddressOf
                      ? pushEaAddress(arg.expr, asmItem.span)
                      : pushArgValueFromEa(arg.expr, 'word');
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  if (arg.kind === 'Mem') {
                    ok = pushMemValue(arg.expr, 'word', asmItem.span);
                    if (!ok) break;
                    pushedArgWords++;
                    continue;
                  }
                  diagAt(
                    diagnostics,
                    asmItem.span,
                    `Unsupported word argument form for "${param.name}" in call to "${asmItem.head}".`,
                  );
                  ok = false;
                  break;
                }
              }

              if (!ok) {
                for (let k = 0; k < pushedArgWords; k++) {
                  emitInstr('inc', [{ kind: 'Reg', span: asmItem.span, name: 'SP' }], asmItem.span);
                  emitInstr('inc', [{ kind: 'Reg', span: asmItem.span, name: 'SP' }], asmItem.span);
                }
                restorePreservedRegs();
                return;
              }

              diagIfCallStackUnverifiable({
                mnemonic: `typed call "${calleeName}"`,
                contractKind: 'typed-call',
              });
              if (callable.kind === 'extern') {
                emitAbs16Fixup(0xcd, callable.targetLower, 0, asmItem.span);
              } else {
                emitAbs16Fixup(0xcd, callable.node.name.toLowerCase(), 0, asmItem.span);
              }
              for (let k = 0; k < args.length; k++) {
                emitInstr('inc', [{ kind: 'Reg', span: asmItem.span, name: 'SP' }], asmItem.span);
                emitInstr('inc', [{ kind: 'Reg', span: asmItem.span, name: 'SP' }], asmItem.span);
              }
              if (!restorePreservedRegs()) return;
              syncToFlow();
              return;
            }

            const { tryHandleOpExpansion } = createOpExpansionOrchestrationHelpers({
              opsByName,
              diagnostics,
              env,
              hasStackSlots,
              opStackPolicyMode,
              opExpansionStack,
              diagAt,
              diagAtWithId,
              diagAtWithSeverityAndId,
              matcherMatchesOperand,
              formatOpSignature,
              formatAsmOperandForOpDiag,
              firstOpOverloadMismatchReason,
              formatOpDefinitionForDiag,
              selectMostSpecificOpOverload,
              summarizeOpStackEffect,
              cloneImmExpr,
              cloneEaExpr,
              cloneOperand,
              flattenEaDottedName,
              normalizeFixedToken,
              inverseConditionName,
              newHiddenLabel,
              lowerAsmRange,
              syncToFlow,
            });
            if (tryHandleOpExpansion(asmItem)) {
              return;
            }

            const head = asmItem.head.toLowerCase();

            const emitRel8FromOperand = (
              operand: AsmOperandNode,
              opcode: number,
              mnemonic: string,
            ): boolean => {
              if (operand.kind !== 'Imm') {
                if (mnemonic === 'djnz' || mnemonic.startsWith('jr')) {
                  diagAt(diagnostics, asmItem.span, `${mnemonic} expects disp8`);
                } else {
                  diagAt(diagnostics, asmItem.span, `${mnemonic} expects an immediate target.`);
                }
                return false;
              }
              const symbolicTarget = symbolicTargetFromExpr(operand.expr);
              if (symbolicTarget) {
                emitRel8Fixup(
                  opcode,
                  symbolicTarget.baseLower,
                  symbolicTarget.addend,
                  asmItem.span,
                  mnemonic,
                );
                return true;
              }
              const value = evalImmExpr(operand.expr, env, diagnostics);
              if (value === undefined) {
                diagAt(diagnostics, asmItem.span, `Failed to evaluate ${mnemonic} target.`);
                return false;
              }
              if (value < -128 || value > 127) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${mnemonic} relative branch displacement out of range (-128..127): ${value}.`,
                );
                return false;
              }
              emitRawCodeBytes(
                Uint8Array.of(opcode, value & 0xff),
                asmItem.span.file,
                `${mnemonic} ${value}`,
              );
              return true;
            };
            if (head === 'jr') {
              if (asmItem.operands.length === 1) {
                if (asmItem.operands[0]!.kind === 'Mem') {
                  diagAt(
                    diagnostics,
                    asmItem.span,
                    `jr does not support indirect targets; expects disp8`,
                  );
                  return;
                }
                const single = asmItem.operands[0]!;
                const ccSingle =
                  single.kind === 'Imm' && single.expr.kind === 'ImmName'
                    ? single.expr.name
                    : single.kind === 'Reg'
                      ? single.name
                      : undefined;
                if (ccSingle && jrConditionOpcodeFromName(ccSingle) !== undefined) {
                  diagAt(diagnostics, asmItem.span, `jr cc, disp expects two operands (cc, disp8)`);
                  return;
                }
                if (single.kind === 'Imm') {
                  const symbolicTarget = symbolicTargetFromExpr(single.expr);
                  if (
                    symbolicTarget &&
                    jrConditionOpcodeFromName(symbolicTarget.baseLower) !== undefined
                  ) {
                    diagAt(
                      diagnostics,
                      asmItem.span,
                      `jr cc, disp expects two operands (cc, disp8)`,
                    );
                    return;
                  }
                }
                if (single.kind === 'Reg') {
                  diagAt(
                    diagnostics,
                    asmItem.span,
                    `jr does not support register targets; expects disp8`,
                  );
                  return;
                }
                if (!emitRel8FromOperand(asmItem.operands[0]!, 0x18, 'jr')) return;
                flow.reachable = false;
                syncToFlow();
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
                const opcode = ccName ? jrConditionOpcodeFromName(ccName) : undefined;
                if (opcode === undefined) {
                  diagAt(diagnostics, asmItem.span, `jr cc expects valid condition code NZ/Z/NC/C`);
                  return;
                }
                const target = asmItem.operands[1]!;
                if (target.kind === 'Mem') {
                  diagAt(
                    diagnostics,
                    asmItem.span,
                    `jr cc, disp does not support indirect targets`,
                  );
                  return;
                }
                if (target.kind === 'Reg') {
                  diagAt(
                    diagnostics,
                    asmItem.span,
                    `jr cc, disp does not support register targets; expects disp8`,
                  );
                  return;
                }
                if (target.kind !== 'Imm') {
                  diagAt(diagnostics, asmItem.span, `jr cc, disp expects disp8`);
                  return;
                }
                if (!emitRel8FromOperand(target, opcode, `jr ${ccName!.toLowerCase()}`)) return;
                syncToFlow();
                return;
              }
            }
            if (head === 'djnz') {
              if (asmItem.operands.length !== 1) {
                diagAt(diagnostics, asmItem.span, `djnz expects one operand (disp8)`);
                return;
              }
              const target = asmItem.operands[0]!;
              if (target.kind === 'Mem') {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `djnz does not support indirect targets; expects disp8`,
                );
                return;
              }
              if (target.kind === 'Reg') {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `djnz does not support register targets; expects disp8`,
                );
                return;
              }
              if (target.kind !== 'Imm') {
                diagAt(diagnostics, asmItem.span, `djnz expects disp8`);
                return;
              }
              if (!emitRel8FromOperand(target, 0x10, 'djnz')) return;
              syncToFlow();
              return;
            }
            if (head === 'call') {
              diagIfCallStackUnverifiable();
            }
            if (head === 'rst' && asmItem.operands.length === 1) {
              diagIfCallStackUnverifiable({ mnemonic: 'rst' });
            }
            if (head === 'ret') {
              if (asmItem.operands.length === 0) {
                diagIfRetStackImbalanced();
                if (emitSyntheticEpilogue) {
                  emitJumpTo(epilogueLabel, asmItem.span);
                } else {
                  emitInstr('ret', [], asmItem.span);
                }
                flow.reachable = false;
                syncToFlow();
                return;
              }
              if (asmItem.operands.length === 1) {
                const op = conditionOpcode(asmItem.operands[0]!);
                if (op === undefined) {
                  diagAt(diagnostics, asmItem.span, `ret cc expects a valid condition code`);
                  return;
                }
                diagIfRetStackImbalanced();
                if (emitSyntheticEpilogue) {
                  emitJumpCondTo(op, epilogueLabel, asmItem.span);
                } else {
                  emitInstr('ret', [asmItem.operands[0]!], asmItem.span);
                }
                syncToFlow();
                return;
              }
            }
            if ((head === 'retn' || head === 'reti') && asmItem.operands.length === 0) {
              diagIfRetStackImbalanced(head);
              if (emitSyntheticEpilogue) {
                diagAt(
                  diagnostics,
                  asmItem.span,
                  `${head} is not supported in functions that require cleanup; use ret/ret cc so cleanup epilogue can run.`,
                );
              }
              emitInstr(head, [], asmItem.span);
              flow.reachable = false;
              syncToFlow();
              return;
            }

            if (head === 'jp' && asmItem.operands.length === 1) {
              const target = asmItem.operands[0]!;
              if (target.kind === 'Imm') {
                const symbolicTarget = symbolicTargetFromExpr(target.expr);
                if (
                  symbolicTarget &&
                  conditionOpcodeFromName(symbolicTarget.baseLower) !== undefined
                ) {
                  diagAt(diagnostics, asmItem.span, `jp cc, nn expects two operands (cc, nn)`);
                  return;
                }
                if (symbolicTarget) {
                  emitAbs16Fixup(
                    0xc3,
                    symbolicTarget.baseLower,
                    symbolicTarget.addend,
                    asmItem.span,
                  );
                  flow.reachable = false;
                  syncToFlow();
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
              const opcode = ccName ? conditionOpcodeFromName(ccName) : undefined;
              const target = asmItem.operands[1]!;
              if (opcode !== undefined && target.kind === 'Imm') {
                const symbolicTarget = symbolicTargetFromExpr(target.expr);
                if (symbolicTarget) {
                  emitAbs16Fixup(
                    opcode,
                    symbolicTarget.baseLower,
                    symbolicTarget.addend,
                    asmItem.span,
                  );
                  syncToFlow();
                  return;
                }
              }
            }
            if (head === 'call' && asmItem.operands.length === 1) {
              const target = asmItem.operands[0]!;
              if (target.kind === 'Imm') {
                const symbolicTarget = symbolicTargetFromExpr(target.expr);
                if (
                  symbolicTarget &&
                  callConditionOpcodeFromName(symbolicTarget.baseLower) !== undefined
                ) {
                  diagAt(diagnostics, asmItem.span, `call cc, nn expects two operands (cc, nn)`);
                  return;
                }
                if (symbolicTarget) {
                  warnIfRawCallTargetsTypedCallable(symbolicTarget);
                  emitAbs16Fixup(
                    0xcd,
                    symbolicTarget.baseLower,
                    symbolicTarget.addend,
                    asmItem.span,
                  );
                  syncToFlow();
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
              const opcode = ccName ? callConditionOpcodeFromName(ccName) : undefined;
              const target = asmItem.operands[1]!;
              if (opcode !== undefined && target.kind === 'Imm') {
                const symbolicTarget = symbolicTargetFromExpr(target.expr);
                if (symbolicTarget) {
                  warnIfRawCallTargetsTypedCallable(symbolicTarget);
                  emitAbs16Fixup(
                    opcode,
                    symbolicTarget.baseLower,
                    symbolicTarget.addend,
                    asmItem.span,
                  );
                  syncToFlow();
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
                !resolveScalarBinding(srcOp.expr.name)
              ) {
                const v = evalImmExpr(srcOp.expr, env, diagnostics);
                if (v === undefined) {
                  emitAbs16Fixup(opcode, srcOp.expr.name.toLowerCase(), 0, asmItem.span);
                  syncToFlow();
                  return;
                }
              }
              if (
                (dst === 'IX' || dst === 'IY') &&
                srcOp.kind === 'Imm' &&
                srcOp.expr.kind === 'ImmName' &&
                !resolveScalarBinding(srcOp.expr.name)
              ) {
                const v = evalImmExpr(srcOp.expr, env, diagnostics);
                if (v === undefined) {
                  emitAbs16FixupPrefixed(
                    dst === 'IX' ? 0xdd : 0xfd,
                    0x21,
                    srcOp.expr.name.toLowerCase(),
                    0,
                    asmItem.span,
                  );
                  syncToFlow();
                  return;
                }
              }
            }

            if (lowerLdWithEa(asmItem)) {
              syncToFlow();
              return;
            }

            if (emitVirtualReg16Transfer(asmItem)) {
              syncToFlow();
              return;
            }

            if (!emitInstr(asmItem.head, asmItem.operands, asmItem.span)) return;

            if ((head === 'jp' || head === 'jr') && asmItem.operands.length === 1) {
              flow.reachable = false;
            } else if (
              (head === 'ret' || head === 'retn' || head === 'reti') &&
              asmItem.operands.length === 0
            ) {
              flow.reachable = false;
            }
            syncToFlow();
          } finally {
            appendInvalidOpExpansionDiagnostic(asmItem, diagnosticsStart);
            currentCodeSegmentTag = prevTag;
          }
        };

        const { lowerAsmRange } = createAsmRangeLoweringHelpers({
          sourceTagForSpan,
          getCurrentCodeSegmentTag: () => currentCodeSegmentTag,
          setCurrentCodeSegmentTag: (tag) => {
            currentCodeSegmentTag = tag;
          },
          defineCodeLabel,
          emitAsmInstruction,
          flowRef,
          syncFromFlow,
          snapshotFlow,
          restoreFlow,
          newHiddenLabel,
          emitJumpIfFalse,
          emitJumpTo,
          diagAt: (span, message) => diagAt(diagnostics, span, message),
          warnAt: (span, message) => warnAt(diagnostics, span, message),
          joinFlows,
          hasStackSlots,
          reg8,
          evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
          loadSelectorIntoHL,
          emitRawCodeBytes,
          emitSelectCompareReg8ToImm8,
          emitSelectCompareToImm16,
          emitInstr,
        });

        const { lowerAndFinalizeFunctionBody } = createAsmBodyOrchestrationHelpers({
          asmItems: item.asm.items,
          itemName: item.name,
          itemSpan: item.span,
          emitSyntheticEpilogue,
          hasStackSlots,
          lowerAsmRange,
          syncToFlow,
          getFlow: () => flow,
          setFlow: (state) => {
            flow = state;
          },
          diagAt: (span, message) => diagAt(diagnostics, span, message),
          emitImplicitRet: () => {
            withCodeSourceTag(sourceTagForSpan(item.span), () => {
              emitInstr('ret', [], item.span);
            });
          },
          emitSyntheticEpilogueBody: () => {
            withCodeSourceTag(sourceTagForSpan(item.span), () => {
              pending.push({
                kind: 'label',
                name: epilogueLabel,
                section: 'code',
                offset: codeOffset,
                file: item.span.file,
                line: item.span.start.line,
                scope: 'local',
              });
              traceLabel(codeOffset, epilogueLabel);
              const popOrder = preserveSet.slice().reverse();
              for (const reg of popOrder) {
                emitInstr('pop', [{ kind: 'Reg', span: item.span, name: reg }], item.span);
              }
              if (hasStackSlots) {
                emitInstr(
                  'ld',
                  [
                    { kind: 'Reg', span: item.span, name: 'SP' },
                    { kind: 'Reg', span: item.span, name: 'IX' },
                  ],
                  item.span,
                );
                emitInstr('pop', [{ kind: 'Reg', span: item.span, name: 'IX' }], item.span);
              }
              emitInstr('ret', [], item.span);
            });
          },
          traceFunctionEnd: () => {
            traceComment(codeOffset, `func ${item.name} end`);
          },
        });
        lowerAndFinalizeFunctionBody();
        continue;
      }

      if (item.kind === 'DataBlock') {
        const dataBlock = item as DataBlockNode;
        for (const decl of dataBlock.decls) {
          const okToDeclareSymbol = !taken.has(decl.name);
          if (!okToDeclareSymbol) {
            diag(diagnostics, decl.span.file, `Duplicate symbol name "${decl.name}".`);
          } else {
            taken.add(decl.name);
            pending.push({
              kind: 'data',
              name: decl.name,
              section: 'data',
              offset: dataOffset,
              file: decl.span.file,
              line: decl.span.start.line,
              scope: 'global',
            });
          }

          const type = decl.typeExpr;
          const init = decl.initializer;

          const emitByte = (b: number) => {
            dataBytes.set(dataOffset, b & 0xff);
            dataOffset++;
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

          const recordType = resolveAggregateType(type);
          if (recordType?.kind === 'record') {
            if (init.kind === 'InitString') {
              diag(
                diagnostics,
                decl.span.file,
                `Record initializer for "${decl.name}" must use aggregate form.`,
              );
              continue;
            }

            const valuesByField = new Map<string, ImmExprNode>();
            let recordInitFailed = false;
            if (init.kind === 'InitRecordNamed') {
              for (const fieldInit of init.fields) {
                const field = recordType.fields.find((f) => f.name === fieldInit.name);
                if (!field) {
                  diag(
                    diagnostics,
                    decl.span.file,
                    `Unknown record field "${fieldInit.name}" in initializer for "${decl.name}".`,
                  );
                  recordInitFailed = true;
                  continue;
                }
                if (valuesByField.has(field.name)) {
                  diag(
                    diagnostics,
                    decl.span.file,
                    `Duplicate record field "${field.name}" in initializer for "${decl.name}".`,
                  );
                  recordInitFailed = true;
                  continue;
                }
                valuesByField.set(field.name, fieldInit.value);
              }
              for (const field of recordType.fields) {
                if (valuesByField.has(field.name)) continue;
                diag(
                  diagnostics,
                  decl.span.file,
                  `Missing record field "${field.name}" in initializer for "${decl.name}".`,
                );
                recordInitFailed = true;
              }
            } else {
              if (init.elements.length !== recordType.fields.length) {
                diag(
                  diagnostics,
                  decl.span.file,
                  `Record initializer field count mismatch for "${decl.name}".`,
                );
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
              const scalar = resolveScalarKind(field.typeExpr);
              if (!scalar) {
                diag(
                  diagnostics,
                  decl.span.file,
                  `Unsupported record field type "${field.name}" in initializer for "${decl.name}" (expected byte/word/addr/ptr).`,
                );
                recordInitFailed = true;
                continue;
              }
              const value = evalImmExpr(fieldValueExpr, env, diagnostics);
              if (value === undefined) {
                diag(
                  diagnostics,
                  decl.span.file,
                  `Failed to evaluate data initializer for "${decl.name}".`,
                );
                recordInitFailed = true;
                continue;
              }
              encodedFields.push({
                width: scalar === 'byte' ? 1 : 2,
                value,
              });
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
            const storageBytes = sizeOfTypeExpr(type, env, diagnostics);
            if (storageBytes === undefined) continue;
            for (let pad = emitted; pad < storageBytes; pad++) emitByte(0);
            continue;
          }

          if (init.kind === 'InitRecordNamed') {
            diag(
              diagnostics,
              decl.span.file,
              `Named-field aggregate initializer requires a record type for "${decl.name}".`,
            );
            continue;
          }

          const elementScalar =
            type.kind === 'ArrayType' ? resolveScalarKind(type.element) : resolveScalarKind(type);
          const elementSize =
            elementScalar === 'word' || elementScalar === 'addr'
              ? 2
              : elementScalar === 'byte'
                ? 1
                : undefined;
          if (!elementSize) {
            diag(
              diagnostics,
              decl.span.file,
              `Unsupported data type for "${decl.name}" (expected byte/word/addr/ptr or fixed-length arrays of those).`,
            );
            continue;
          }

          const declaredLength = type.kind === 'ArrayType' ? type.length : 1;
          let actualLength = declaredLength ?? 0;

          if (init.kind === 'InitString') {
            if (elementSize !== 1) {
              diag(
                diagnostics,
                decl.span.file,
                `String initializer requires byte element type for "${decl.name}".`,
              );
              continue;
            }
            if (declaredLength !== undefined && init.value.length !== declaredLength) {
              diag(diagnostics, decl.span.file, `String length mismatch for "${decl.name}".`);
              continue;
            }
            for (let idx = 0; idx < init.value.length; idx++) {
              emitByte(init.value.charCodeAt(idx));
            }
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
            const v = evalImmExpr(e, env, diagnostics);
            if (v === undefined) {
              diag(
                diagnostics,
                decl.span.file,
                `Failed to evaluate data initializer for "${decl.name}".`,
              );
              break;
            }
            values.push(v);
          }

          if (declaredLength !== undefined && values.length !== declaredLength) {
            diag(diagnostics, decl.span.file, `Initializer length mismatch for "${decl.name}".`);
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
        continue;
      }

      if (item.kind === 'VarBlock' && item.scope === 'module') {
        const varBlock = item as VarBlockNode;
        for (const decl of varBlock.decls) {
          if (!decl.typeExpr) continue;
          const size = sizeOfTypeExpr(decl.typeExpr, env, diagnostics);
          if (size === undefined) continue;
          if (env.consts.has(decl.name)) {
            diag(diagnostics, decl.span.file, `Var name "${decl.name}" collides with a const.`);
            varOffset += size;
            continue;
          }
          if (env.enums.has(decl.name)) {
            diag(
              diagnostics,
              decl.span.file,
              `Var name "${decl.name}" collides with an enum member.`,
            );
            varOffset += size;
            continue;
          }
          if (env.types.has(decl.name)) {
            diag(diagnostics, decl.span.file, `Var name "${decl.name}" collides with a type name.`);
            varOffset += size;
            continue;
          }
          if (taken.has(decl.name)) {
            diag(
              diagnostics,
              decl.span.file,
              `Duplicate symbol name "${decl.name}" for var declaration.`,
            );
            varOffset += size;
            continue;
          }
          taken.add(decl.name);
          pending.push({
            kind: 'var',
            name: decl.name,
            section: 'var',
            offset: varOffset,
            file: decl.span.file,
            line: decl.span.start.line,
            scope: 'global',
            size,
          });
          varOffset += size;
        }
      }
    }
  }

  const evalBase = (kind: SectionKind): number | undefined => {
    const at = baseExprs[kind];
    if (!at) return undefined;
    const v = evalImmExpr(at, env, diagnostics);
    if (v === undefined) {
      diag(diagnostics, at.span.file, `Failed to evaluate section "${kind}" base address.`);
      return undefined;
    }
    if (v < 0 || v > 0xffff) {
      diag(diagnostics, at.span.file, `Section "${kind}" base address out of range (0..65535).`);
      return undefined;
    }
    return v;
  };

  const explicitCodeBase = evalBase('code');
  const explicitDataBase = evalBase('data');
  const explicitVarBase = evalBase('var');

  const codeOk = explicitCodeBase !== undefined || !baseExprs.code;
  const fallbackCodeBase = options?.defaultCodeBase ?? 0;
  const codeBase = explicitCodeBase ?? fallbackCodeBase;

  const dataBase =
    explicitDataBase ??
    (codeOk
      ? alignTo(codeBase + codeOffset, 2)
      : (diag(
          diagnostics,
          primaryFile,
          `Cannot compute default data base address because code base address is invalid.`,
        ),
        0));
  const dataOk = explicitDataBase !== undefined || (baseExprs.data === undefined && codeOk);

  const varBase =
    explicitVarBase ??
    (dataOk
      ? alignTo(dataBase + dataOffset, 2)
      : (diag(
          diagnostics,
          primaryFile,
          `Cannot compute default var base address because data base address is invalid.`,
        ),
        0));
  const varOk = explicitVarBase !== undefined || (baseExprs.var === undefined && dataOk);

  // Resolve symbol addresses for fixups (functions/labels/etc).
  const addrByNameLower = new Map<string, number>();
  for (const ps of pending) {
    const base = ps.section === 'code' ? codeBase : ps.section === 'data' ? dataBase : varBase;
    const ok = ps.section === 'code' ? codeOk : ps.section === 'data' ? dataOk : varOk;
    if (!ok) continue;
    addrByNameLower.set(ps.name.toLowerCase(), base + ps.offset);
  }
  for (const sym of symbols) {
    if (sym.kind === 'constant') continue;
    addrByNameLower.set(sym.name.toLowerCase(), sym.address);
  }
  for (const sym of absoluteSymbols) {
    if (sym.kind === 'constant') continue;
    addrByNameLower.set(sym.name.toLowerCase(), sym.address);
  }
  for (const ex of deferredExterns) {
    const base = addrByNameLower.get(ex.baseLower);
    if (base === undefined) {
      diag(
        diagnostics,
        ex.file,
        `Failed to resolve extern base symbol "${ex.baseLower}" for "${ex.name}".`,
      );
      continue;
    }
    const addr = base + ex.addend;
    if (addr < 0 || addr > 0xffff) {
      diag(
        diagnostics,
        ex.file,
        `extern func "${ex.name}" resolved address out of range (0..65535).`,
      );
      continue;
    }
    addrByNameLower.set(ex.name.toLowerCase(), addr);
    symbols.push({
      kind: 'label',
      name: ex.name,
      address: addr,
      file: ex.file,
      line: ex.line,
      scope: 'global',
    });
  }

  for (const fx of fixups) {
    const base = addrByNameLower.get(fx.baseLower);
    const addr = base === undefined ? undefined : base + fx.addend;
    if (addr === undefined) {
      diag(diagnostics, fx.file, `Unresolved symbol "${fx.baseLower}" in 16-bit fixup.`);
      continue;
    }
    if (addr < 0 || addr > 0xffff) {
      diag(
        diagnostics,
        fx.file,
        `16-bit fixup address out of range for "${fx.baseLower}" with addend ${fx.addend}: ${addr}.`,
      );
      continue;
    }
    codeBytes.set(fx.offset, addr & 0xff);
    codeBytes.set(fx.offset + 1, (addr >> 8) & 0xff);
  }
  for (const fx of rel8Fixups) {
    const base = addrByNameLower.get(fx.baseLower);
    const target = base === undefined ? undefined : base + fx.addend;
    if (target === undefined) {
      diag(
        diagnostics,
        fx.file,
        `Unresolved symbol "${fx.baseLower}" in rel8 ${fx.mnemonic} fixup.`,
      );
      continue;
    }
    const origin = codeBase + fx.origin;
    const disp = target - origin;
    if (disp < -128 || disp > 127) {
      diag(
        diagnostics,
        fx.file,
        `${fx.mnemonic} target out of range for rel8 branch (${disp}, expected -128..127).`,
      );
      continue;
    }
    codeBytes.set(fx.offset, disp & 0xff);
  }

  for (const [addr, b] of hexBytes) {
    if (addr < 0 || addr > 0xffff) {
      diag(diagnostics, primaryFile, `HEX byte address out of range: ${addr}.`);
      continue;
    }
    if (bytes.has(addr)) {
      diag(diagnostics, primaryFile, `HEX data overlaps emitted bytes at address ${addr}.`);
      continue;
    }
    bytes.set(addr, b);
  }

  if (codeOk)
    writeSection(codeBase, codeBytes, bytes, (message) => diag(diagnostics, primaryFile, message));
  if (dataOk)
    writeSection(dataBase, dataBytes, bytes, (message) => diag(diagnostics, primaryFile, message));

  for (const ps of pending) {
    const base = ps.section === 'code' ? codeBase : ps.section === 'data' ? dataBase : varBase;
    const ok = ps.section === 'code' ? codeOk : ps.section === 'data' ? dataOk : varOk;
    if (!ok) continue;
    const sym: SymbolEntry = {
      kind: ps.kind,
      name: ps.name,
      address: base + ps.offset,
      ...(ps.file !== undefined ? { file: ps.file } : {}),
      ...(ps.line !== undefined ? { line: ps.line } : {}),
      ...(ps.scope !== undefined ? { scope: ps.scope } : {}),
      ...(ps.size !== undefined ? { size: ps.size } : {}),
    };
    symbols.push(sym);
  }
  symbols.push(...absoluteSymbols);

  const writtenRange = computeWrittenRange(bytes);
  const sourceSegments = codeOk ? rebaseCodeSourceSegments(codeBase, codeSourceSegments) : [];
  const asmTrace = codeOk ? rebaseAsmTrace(codeBase, codeAsmTrace) : [];

  return {
    map: {
      bytes,
      writtenRange,
      ...(sourceSegments.length > 0 ? { sourceSegments } : {}),
      ...(asmTrace.length > 0 ? { asmTrace } : {}),
    },
    symbols,
  };
}
