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
import { createValueMaterializationHelpers } from './valueMaterialization.js';
import { createAsmInstructionLoweringHelpers } from './asmInstructionLowering.js';
import { createFixupEmissionHelpers } from './fixupEmission.js';
import {
  createFunctionBodySetupHelpers,
  type FlowState,
  type OpExpansionFrame,
} from './functionBodySetup.js';
import { lowerFunctionDecl } from './functionLowering.js';
import {
  cloneEaExpr,
  cloneImmExpr,
  cloneOperand,
  createAsmUtilityHelpers,
  flattenEaDottedName,
} from './asmUtils.js';
import {
  alignTo,
  computeWrittenRange,
  rebaseAsmTrace,
  rebaseCodeSourceSegments,
  writeSection,
} from './sectionLayout.js';
import {
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
  const localAliasTargets = new Map<string, EaExprNode>();
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

  const {
    callConditionOpcodeFromName,
    conditionNameFromOpcode,
    conditionOpcode,
    conditionOpcodeFromName,
    emitAbs16Fixup,
    emitAbs16FixupEd,
    emitAbs16FixupPrefixed,
    emitRel8Fixup,
    inverseConditionName,
    jrConditionOpcodeFromName,
    symbolicTargetFromExpr,
  } = createFixupEmissionHelpers({
    getCodeOffset: () => codeOffset,
    setCodeOffset: (value) => {
      codeOffset = value;
    },
    setCodeByte: (offset, value) => {
      codeBytes.set(offset, value);
    },
    recordCodeSourceRange,
    pushFixup: (fixup) => {
      fixups.push(fixup);
    },
    pushRel8Fixup: (fixup) => {
      rel8Fixups.push(fixup);
    },
    traceInstruction,
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
  });

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

  const { normalizeFixedToken } = createAsmUtilityHelpers({
    isEnumName: (name) => env.enums.has(name),
  });

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

  const {
    emitLoadWordFromHlAddress,
    emitStoreSavedHlToEa,
    emitStoreWordToHlAddress,
    pushEaAddress,
    pushMemValue,
  } = createValueMaterializationHelpers({
    diagnostics,
    diagAt,
    reg8,
    resolveEa,
    resolveEaTypeExpr,
    resolveScalarBinding,
    resolveScalarKind,
    sizeOfTypeExpr: (typeExpr) => sizeOfTypeExpr(typeExpr, env, diagnostics),
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
    evalImmNoDiag,
    emitInstr,
    emitRawCodeBytes,
    emitAbs16Fixup,
    loadImm16ToDE,
    loadImm16ToHL,
    negateHL,
    pushZeroExtendedReg8,
    emitStepPipeline,
    buildEaBytePipeline,
    buildEaWordPipeline,
    emitScalarWordLoad,
    formatIxDisp,
    TEMPLATE_L_ABC,
    TEMPLATE_LW_DE,
    LOAD_RP_EA,
    STORE_RP_EA,
  });

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
        lowerFunctionDecl({
          item,
          diagnostics,
          diag,
          diagAt,
          diagAtWithId,
          diagAtWithSeverityAndId,
          warnAt,
          taken,
          pending,
          traceComment,
          traceLabel,
          currentCodeSegmentTagRef: {
            get current() {
              return currentCodeSegmentTag;
            },
            set current(value: SourceSegmentTag | undefined) {
              currentCodeSegmentTag = value;
            },
          },
          getCodeOffset: () => codeOffset,
          emitInstr,
          emitRawCodeBytes,
          emitAbs16Fixup,
          emitAbs16FixupPrefixed,
          emitRel8Fixup,
          conditionOpcodeFromName,
          conditionNameFromOpcode,
          callConditionOpcodeFromName,
          jrConditionOpcodeFromName,
          conditionOpcode,
          inverseConditionName,
          symbolicTargetFromExpr,
          evalImmExpr,
          env,
          resolveScalarBinding,
          resolveScalarKind,
          resolveEaTypeExpr,
          resolveScalarTypeForEa,
          resolveArrayType,
          buildEaWordPipeline,
          enforceEaRuntimeAtomBudget,
          enforceDirectCallSiteEaBudget,
          pushEaAddress,
          pushMemValue,
          pushImm16,
          pushZeroExtendedReg8,
          loadImm16ToHL,
          stackSlotOffsets,
          stackSlotTypes,
          localAliasTargets,
          storageTypes,
          rawTypedCallWarningsEnabled,
          callables,
          opsByName,
          opStackPolicyMode,
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
          typeDisplay,
          sameTypeShape,
          emitStepPipeline,
          lowerLdWithEa,
          reg8,
          reg16,
          generatedLabelCounterRef: {
            get current() {
              return generatedLabelCounter;
            },
            set current(value: number) {
              generatedLabelCounter = value;
            },
          },
        });
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
