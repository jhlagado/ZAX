import { resolve } from 'node:path';
import {
  LOAD_RP_EA,
  LOAD_RP_FVAR,
  LOAD_RP_GLOB,
  STORE_RP_EA,
  STORE_RP_FVAR,
  STORE_RP_GLOB,
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
} from './emitStepImports.js';
import type { Diagnostic } from '../diagnosticTypes.js';
import type { EmittedSourceSegment, SymbolEntry } from '../formats/types.js';
import type {
  AsmInstructionNode,
  AsmOperandNode,
  EaExprNode,
  ImmExprNode,
  OpDeclNode,
  ProgramNode,
  SourceSpan,
  TypeExprNode,
  VarDeclNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import { evalImmExpr } from '../semantics/env.js';
import { sizeOfTypeExpr } from '../semantics/layout.js';
import { encodeInstruction } from '../z80/encode.js';
import type { Callable, PendingSymbol, SectionKind } from './loweringTypes.js';
import { createOpStackAnalysisHelpers } from './opStackAnalysis.js';
import { loadBinInput, loadHexInput } from './inputAssets.js';
import { createEaResolutionHelpers } from './eaResolution.js';
import { createEaMaterializationHelpers } from './eaMaterialization.js';
import { createAddressingPipelineBuilders } from './addressingPipelines.js';
import { createRuntimeImmediateHelpers } from './runtimeImmediates.js';
import { createRuntimeAtomBudgetHelpers } from './runtimeAtomBudget.js';
import { createScalarWordAccessorHelpers } from './scalarWordAccessors.js';
import { createLdLoweringHelpers } from './ldLowering.js';
import { createOpMatchingHelpers } from './opMatching.js';
import { createEmissionCoreHelpers } from './emissionCore.js';
import { createValueMaterializationHelpers } from './valueMaterialization.js';
import { createFixupEmissionHelpers } from './fixupEmission.js';
import { lowerFunctionDecl } from './functionLowering.js';
import { createEmitVisibilityHelpers } from './emitVisibility.js';
import {
  emitProgramEmptyResult,
  mergeEmitFinalizationContext,
  runEmitLoweringPhase,
  runEmitPlacementAndArtifactPhase,
  runEmitPrescanPhase,
  type EmitProgramOptions,
  type EmitProgramResult,
} from './emitPipeline.js';
import {
  diag,
  diagAt,
  diagAtWithId,
  diagAtWithSeverityAndId,
  warnAt,
} from './loweringDiagnostics.js';
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
  rebaseCodeSourceSegments,
  writeSection,
} from './sectionLayout.js';
import { formatImmExprForAsm, formatIxDisp } from './traceFormat.js';
import { createTypeResolutionHelpers } from './typeResolution.js';
import { createEmitProgramContext } from './emitProgramContext.js';
import { createEmitStateHelpers } from './emitState.js';
import type { LoweredAsmStream, LoweredAsmStreamBlock } from './loweredAsmTypes.js';

const REG8_NAMES = new Set(['A', 'B', 'C', 'D', 'E', 'H', 'L']);
const REG16_NAMES = new Set(['BC', 'DE', 'HL', 'IX', 'IY']);
const REG8_CODES = new Map([
  ['B', 0],
  ['C', 1],
  ['D', 2],
  ['E', 3],
  ['H', 4],
  ['L', 5],
  ['A', 7],
]);

/**
 * Emit machine-code bytes for a parsed program into an address->byte map.
 *
 * Orchestration follows the phased pipeline in `emitPipeline.ts`. Phase 1 (workspace wiring)
 * is implemented in this file; phases 2–4 use `runEmitPrescanPhase`, `runEmitLoweringPhase`,
 * and `runEmitPlacementAndArtifactPhase`.
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
  options?: EmitProgramOptions,
): EmitProgramResult {
  const bytes = new Map<number, number>();
  const codeBytes = new Map<number, number>();
  const dataBytes = new Map<number, number>();
  const hexBytes = new Map<number, number>();
  const codeSourceSegments: EmittedSourceSegment[] = [];
  const loweredAsmStream: LoweredAsmStream = { blocks: [] };
  const loweredAsmBlocksByKey = new Map<string, LoweredAsmStreamBlock>();
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

  const localCallablesByFile = new Map<string, Map<string, Callable>>();
  const visibleCallables = new Map<string, Callable>();
  const localOpsByFile = new Map<string, Map<string, OpDeclNode[]>>();
  const visibleOpsByName = new Map<string, OpDeclNode[]>();
  const opStackPolicyMode = options?.opStackPolicy ?? 'off';
  const rawTypedCallWarningsEnabled = options?.rawTypedCallWarnings === true;
  const declaredOpNames = new Set<string>();
  const declaredBinNames = new Set<string>();
  const { resolveVisibleCallable, resolveVisibleOpCandidates } = createEmitVisibilityHelpers({
    env,
    localCallablesByFile,
    visibleCallables,
    localOpsByFile,
    visibleOpsByName,
  });

  const { summarizeOpStackEffect } = createOpStackAnalysisHelpers({
    resolveOpCandidates: resolveVisibleOpCandidates,
  });

  const storageTypes = new Map<string, TypeExprNode>();
  const moduleAliasTargets = new Map<string, EaExprNode>();
  const moduleAliasDecls = new Map<string, VarDeclNode>();
  const rawAddressSymbols = new Set<string>();
  const stackSlotTypes = new Map<string, TypeExprNode>();
  const stackSlotOffsets = new Map<string, number>();
  const localAliasTargets = new Map<string, EaExprNode>();
  let applySpTracking: ((headRaw: string, operands: AsmOperandNode[]) => void) | undefined;
  let invalidateSpTracking: (() => void) | undefined;
  const traceInstruction = (_offset: number, _bytesOut: Uint8Array, _text: string): void => {};
  let emitCodeBytes: (bs: Uint8Array, file: string) => void;
  let emitRawCodeBytes: (bs: Uint8Array, file: string, traceText: string) => void;
  let emitStepPipeline: (pipe: StepPipeline, span: SourceSpan) => boolean;

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

  const evalImmNoDiag = (expr: ImmExprNode): number | undefined => {
    const scratch: Diagnostic[] = [];
    return evalImmExpr(expr, env, scratch);
  };

  const firstModule = program.files[0];
  if (!firstModule) {
    diag(diagnostics, program.entryFile, 'No module files to compile.');
    return emitProgramEmptyResult();
  }

  const primaryFile = firstModule.span.file ?? program.entryFile;
  const includeDirs = (options?.includeDirs ?? []).map((p) => resolve(p));

  const baseExprs: Partial<Record<SectionKind, ImmExprNode>> = {};

  const {
    namedSectionSinks,
    namedSectionSinksByNode,
    activeSectionRef,
    codeOffsetRef,
    dataOffsetRef,
    varOffsetRef,
    currentCodeSegmentTagRef,
    generatedLabelCounterRef,
    currentNamedSectionSinkRef,
    getCurrentCodeOffset,
    setCurrentCodeOffset,
    setCurrentCodeByte,
    pushCurrentFixup,
    pushCurrentRel8Fixup,
    recordCodeSourceRange,
    traceLabel,
    traceComment,
    advanceAlign,
    flushTrailingUserComments,
    lowerImmExprForLoweredAsm,
    lowerOperandForLoweredAsm,
    recordLoweredAsmItem,
  } = createEmitStateHelpers({
    ...(options?.namedSectionKeys ? { namedSectionKeys: options.namedSectionKeys } : {}),
    ...(options?.sourceTexts ? { sourceTexts: options.sourceTexts } : {}),
    ...(options?.sourceLineComments ? { sourceLineComments: options.sourceLineComments } : {}),
    codeBytes,
    codeSourceSegments,
    fixups,
    rel8Fixups,
    loweredAsmStream,
    loweredAsmBlocksByKey,
    alignTo,
    evalImmNoDiag,
    symbolicTargetFromExpr: (expr) => symbolicTargetFromExpr(expr),
    formatImmExprForAsm,
    typeDisplay: (typeExpr) => typeDisplay(typeExpr),
  });

  const emitInstr = (head: string, operands: AsmOperandNode[], span: SourceSpan) => {
    const syntheticInstruction: AsmInstructionNode = {
      kind: 'AsmInstruction',
      span,
      head,
      operands,
    };
    const encoded = encodeInstruction(syntheticInstruction, env, diagnostics);
    if (!encoded) return false;
    recordLoweredAsmItem(
      {
        kind: 'instr',
        head,
        operands: operands.map((op) => lowerOperandForLoweredAsm(op)),
        bytes: [...encoded],
      },
      span,
    );
    emitCodeBytes(encoded, span.file);
    applySpTracking?.(head, operands);
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
    getCodeOffset: getCurrentCodeOffset,
    setCodeOffset: setCurrentCodeOffset,
    setCodeByte: setCurrentCodeByte,
    recordCodeSourceRange,
    pushFixup: pushCurrentFixup,
    pushRel8Fixup: pushCurrentRel8Fixup,
    traceInstruction,
    recordLoweredInstr: (bytes, _asmText, span) => {
      recordLoweredAsmItem(
        {
          kind: 'instr',
          head: '@raw',
          operands: [],
          bytes: [...bytes],
        },
        span,
      );
    },
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
  });

  ({ emitCodeBytes, emitRawCodeBytes, emitStepPipeline } = createEmissionCoreHelpers({
    getCodeOffset: getCurrentCodeOffset,
    setCodeOffset: setCurrentCodeOffset,
    setCodeByte: setCurrentCodeByte,
    recordCodeSourceRange,
    traceInstruction,
    emitInstr: (head, operands, span) => emitInstr(head, operands, span),
    loadImm16ToDE: (value, span) => loadImm16ToDE(value, span),
    loadImm16ToHL: (value, span) => loadImm16ToHL(value, span),
    emitAbs16Fixup,
    emitAbs16FixupEd,
  }));

  const emitRawCodeBytesImpl = emitRawCodeBytes;
  emitRawCodeBytes = (bs: Uint8Array, file: string, traceText: string): void => {
    recordLoweredAsmItem({ kind: 'instr', head: '@raw', operands: [], bytes: [...bs] });
    emitRawCodeBytesImpl(bs, file, traceText);
  };

  const { normalizeFixedToken } = createAsmUtilityHelpers({
    isEnumName: (name) => env.enums.has(name),
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
    resolveScalarKind,
    resolveAggregateType,
    resolveEaTypeExpr,
    sizeOfTypeExpr: (te) => sizeOfTypeExpr(te, env, diagnostics),
  });

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

  const { selectOpOverload, formatAsmOperandForOpDiag } = createOpMatchingHelpers({
    reg8: REG8_NAMES,
    isIxIyIndexedMem,
    flattenEaDottedName,
    isEnumName: (name) => env.enums.has(name),
    normalizeFixedToken,
    conditionOpcodeFromName,
    evalImmNoDiag,
    inferMemWidth,
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

  const { enforceDirectCallSiteEaBudget, enforceEaRuntimeAtomBudget } =
    createRuntimeAtomBudgetHelpers({
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
    reg8: REG8_NAMES,
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
    scalarKindOfResolution,
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
    reg8: REG8_NAMES,
    resolveEa,
    resolveEaTypeExpr,
    resolveAggregateType,
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
    evalImmExpr: (expr: ImmExprNode) => evalImmExpr(expr, env, diagnostics),
    formatIxDisp,
    isWordCompatibleScalarKind,
    loadImm16ToHL,
    materializeEaAddressToHL,
    reg8Code: REG8_CODES,
    resolveEa,
    resolveScalarBinding,
    resolveScalarKind,
    resolveScalarTypeForEa,
    resolveScalarTypeForLd,
    scalarKindOfResolution,
    setSpTrackingInvalid: () => {
      invalidateSpTracking?.();
    },
    stackSlotOffsets,
    storageTypes,
  });

  const { programLoweringContext } = createEmitProgramContext({
    diagnostics,
    diag,
    diagAt,
    diagAtWithId,
    diagAtWithSeverityAndId: diagAtWithSeverityAndId as never,
    warnAt,
    program,
    includeDirs,
    taken,
    pending,
    traceComment,
    traceLabel,
    currentCodeSegmentTagRef,
    generatedLabelCounterRef,
    bindSpTracking: (
      callbacks?:
        | {
            applySpTracking: (headRaw: string, operands: AsmOperandNode[]) => void;
            invalidateSpTracking: () => void;
          }
        | undefined,
    ) => {
      applySpTracking = callbacks?.applySpTracking;
      invalidateSpTracking = callbacks?.invalidateSpTracking;
    },
    getCodeOffset: getCurrentCodeOffset,
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
    resolveScalarTypeForLd,
    resolveArrayType,
    typeDisplay,
    sameTypeShape,
    resolveEa,
    buildEaWordPipeline,
    enforceEaRuntimeAtomBudget,
    enforceDirectCallSiteEaBudget,
    pushEaAddress,
    materializeEaAddressToHL,
    pushMemValue,
    pushImm16,
    pushZeroExtendedReg8,
    loadImm16ToHL,
    emitStepPipeline,
    emitScalarWordLoad,
    emitScalarWordStore,
    lowerLdWithEa,
    stackSlotOffsets,
    stackSlotTypes,
    localAliasTargets,
    storageTypes,
    moduleAliasTargets,
    rawTypedCallWarningsEnabled,
    resolveCallable: resolveVisibleCallable,
    resolveOpCandidates: resolveVisibleOpCandidates,
    opStackPolicyMode,
    formatAsmOperandForOpDiag,
    selectOpOverload,
    summarizeOpStackEffect,
    cloneImmExpr,
    cloneEaExpr,
    cloneOperand,
    flattenEaDottedName,
    normalizeFixedToken,
    reg8: REG8_NAMES,
    reg16: REG16_NAMES,
    localCallablesByFile,
    visibleCallables,
    localOpsByFile,
    visibleOpsByName,
    declaredOpNames,
    declaredBinNames,
    deferredExterns,
    moduleAliasDecls,
    rawAddressSymbols,
    absoluteSymbols,
    symbols,
    dataBytes,
    codeBytes,
    hexBytes,
    activeSectionRef,
    codeOffsetRef,
    dataOffsetRef,
    varOffsetRef,
    baseExprs,
    advanceAlign,
    alignTo,
    loadBinInput,
    loadHexInput,
    resolveAggregateType,
    sizeOfTypeExpr,
    lowerFunctionDecl,
    recordLoweredAsmItem,
    lowerImmExprForLoweredAsm,
    namedSectionSinksByNode,
    currentNamedSectionSinkRef,
  });

  // --- Phase 2: prescan (visibility / alias metadata) ---
  const prescan = runEmitPrescanPhase(programLoweringContext);
  // --- Phase 3: lowering (bytes + fixup queues) ---
  const lowered = runEmitLoweringPhase(programLoweringContext, prescan);

  flushTrailingUserComments();

  // --- Phase 4: placement, fixup resolution, merged `EmittedByteMap` ---
  const finalized = runEmitPlacementAndArtifactPhase(
    mergeEmitFinalizationContext(lowered, {
      namedSectionSinks,
      diagnostics,
      diag,
      diagAt,
      primaryFile,
      baseExprs,
      evalImmExpr,
      env,
      loweredAsmStream,
      fixups,
      rel8Fixups,
      bytes,
      codeSourceSegments,
      alignTo,
      writeSection,
      computeWrittenRange,
      rebaseCodeSourceSegments,
      ...(options?.defaultCodeBase !== undefined
        ? { defaultCodeBase: options.defaultCodeBase }
        : {}),
    }),
  );
  return { ...finalized, loweredAsmStream };
}

export type { EmitProgramOptions, EmitProgramResult } from './emitPipeline.js';
