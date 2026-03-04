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
import type { Diagnostic } from '../diagnostics/types.js';
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
import type { NonBankedSectionKeyCollection } from '../sectionKeys.js';
import type { Callable, PendingSymbol, SectionKind, SourceSegmentTag } from './loweringTypes.js';
import { createOpStackAnalysisHelpers } from './opStackAnalysis.js';
import type { OpStackPolicyMode } from '../pipeline.js';
import { moduleQualifierOf } from '../moduleVisibility.js';
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
  createNamedSectionContributionSinks,
  type NamedSectionContributionSink,
} from './sectionContributions.js';
import {
  collectPlacedNamedSectionSymbols,
  placeNonBankedSectionContributions,
  resolvePlacedNamedSectionFixups,
} from './sectionPlacement.js';
import {
  finalizeProgramEmission,
  lowerProgramDeclarations,
  preScanProgramDeclarations,
} from './programLowering.js';
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
    namedSectionKeys?: NonBankedSectionKeyCollection;
  },
): { map: EmittedByteMap; symbols: SymbolEntry[] } {
  const bytes = new Map<number, number>();
  const codeBytes = new Map<number, number>();
  const dataBytes = new Map<number, number>();
  const hexBytes = new Map<number, number>();
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

  const localCallablesByFile = new Map<string, Map<string, Callable>>();
  const visibleCallables = new Map<string, Callable>();
  const localOpsByFile = new Map<string, Map<string, OpDeclNode[]>>();
  const visibleOpsByName = new Map<string, OpDeclNode[]>();
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
  const canAccessLoweredQualifiedName = (name: string, file: string): boolean => {
    const qualifier = moduleQualifierOf(name);
    if (!qualifier) return true;
    const currentModuleId = env.moduleIds?.get(file)?.toLowerCase();
    if (currentModuleId === qualifier) return true;
    const imported = env.importedModuleIds?.get(file);
    if (!imported) return true;
    for (const importedId of imported) {
      if (importedId.toLowerCase() === qualifier) return true;
    }
    return false;
  };

  const resolveVisibleCallable = (name: string, file: string): Callable | undefined => {
    const lower = name.toLowerCase();
    if (!moduleQualifierOf(name)) return localCallablesByFile.get(file)?.get(lower);
    if (!canAccessLoweredQualifiedName(name, file)) return undefined;
    return visibleCallables.get(lower);
  };

  const resolveVisibleOpCandidates = (name: string, file: string): OpDeclNode[] | undefined => {
    const lower = name.toLowerCase();
    if (!moduleQualifierOf(name)) return localOpsByFile.get(file)?.get(lower);
    if (!canAccessLoweredQualifiedName(name, file)) return undefined;
    return visibleOpsByName.get(lower);
  };

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
  let applySpTracking:
    | ((headRaw: string, operands: AsmOperandNode[]) => void)
    | undefined;
  let invalidateSpTracking: (() => void) | undefined;
  let generatedLabelCounter = 0;
  let currentNamedSectionSink: NamedSectionContributionSink | undefined;

  const namedSectionSinks = options?.namedSectionKeys
    ? createNamedSectionContributionSinks(options.namedSectionKeys)
    : [];
  const namedSectionSinksByNode = new Map(
    namedSectionSinks.map((sink) => [sink.contribution.node, sink] as const),
  );

  const sameSourceTag = (x: SourceSegmentTag, y: SourceSegmentTag): boolean =>
    x.file === y.file &&
    x.line === y.line &&
    x.column === y.column &&
    x.kind === y.kind &&
    x.confidence === y.confidence;

  const recordCodeSourceRange = (start: number, end: number): void => {
    if (!currentCodeSegmentTag || end <= start) return;
    const segments = currentNamedSectionSink?.sourceSegments ?? codeSourceSegments;
    const last = segments[segments.length - 1];
    if (last && last.end === start && sameSourceTag(last, currentCodeSegmentTag)) {
      last.end = end;
      return;
    }
    segments.push({ ...currentCodeSegmentTag, start, end });
  };

  const traceInstruction = (offset: number, bytesOut: Uint8Array, text: string): void => {
    if (bytesOut.length === 0) return;
    const trace = currentNamedSectionSink?.asmTrace ?? codeAsmTrace;
    trace.push({
      kind: 'instruction',
      offset,
      text,
      bytes: [...bytesOut],
    });
  };

  const traceLabel = (offset: number, name: string): void => {
    const trace = currentNamedSectionSink?.asmTrace ?? codeAsmTrace;
    trace.push({ kind: 'label', offset, name });
  };

  const traceComment = (offset: number, text: string): void => {
    const trace = currentNamedSectionSink?.asmTrace ?? codeAsmTrace;
    trace.push({ kind: 'comment', offset, text });
  };

  const getCurrentCodeOffset = (): number => currentNamedSectionSink?.offset ?? codeOffset;
  const setCurrentCodeOffset = (value: number): void => {
    if (currentNamedSectionSink) currentNamedSectionSink.offset = value;
    else codeOffset = value;
  };
  const setCurrentCodeByte = (offset: number, value: number): void => {
    const bytesOut = currentNamedSectionSink?.bytes ?? codeBytes;
    bytesOut.set(offset, value);
  };
  const pushCurrentFixup = (fixup: {
    offset: number;
    baseLower: string;
    addend: number;
    file: string;
  }): void => {
    if (currentNamedSectionSink) currentNamedSectionSink.fixups.push(fixup);
    else fixups.push(fixup);
  };
  const pushCurrentRel8Fixup = (fixup: {
    offset: number;
    origin: number;
    baseLower: string;
    addend: number;
    file: string;
    mnemonic: string;
  }): void => {
    if (currentNamedSectionSink) currentNamedSectionSink.rel8Fixups.push(fixup);
    else rel8Fixups.push(fixup);
  };

  let emitCodeBytes: (bs: Uint8Array, file: string) => void;
  let emitRawCodeBytes: (bs: Uint8Array, file: string, traceText: string) => void;
  let emitStepPipeline: (pipe: StepPipeline, span: SourceSpan) => boolean;

  const emitInstr = (head: string, operands: AsmOperandNode[], span: SourceSpan) => {
    const start = getCurrentCodeOffset();
    const encoded = encodeInstruction(
      { kind: 'AsmInstruction', span, head, operands } as any,
      env,
      diagnostics,
    );
    if (!encoded) return false;
    emitCodeBytes(encoded, span.file);
    traceInstruction(start, encoded, formatAsmInstrForTrace(head, operands));
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
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
  });

  ({
    emitCodeBytes,
    emitRawCodeBytes,
    emitStepPipeline,
  } = createEmissionCoreHelpers({
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
    evalImmExpr: (expr: ImmExprNode) => evalImmExpr(expr, env, diagnostics),
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
    scalarKindOfResolution,
    setSpTrackingInvalid: () => {
      invalidateSpTracking?.();
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

  const activeSectionRef = {
    get current() {
      return activeSection;
    },
    set current(value: SectionKind) {
      activeSection = value;
    },
  };
  const codeOffsetRef = {
    get current() {
      return codeOffset;
    },
    set current(value: number) {
      codeOffset = value;
    },
  };
  const dataOffsetRef = {
    get current() {
      return dataOffset;
    },
    set current(value: number) {
      dataOffset = value;
    },
  };
  const varOffsetRef = {
    get current() {
      return varOffset;
    },
    set current(value: number) {
      varOffset = value;
    },
  };

  const programLoweringContext = {
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
        if (currentNamedSectionSink) currentNamedSectionSink.currentSourceTag = value;
      },
    },
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
    localCallablesByFile,
    visibleCallables,
    localOpsByFile,
    visibleOpsByName,
    declaredOpNames,
    deferredExterns,
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
    program,
    includeDirs,
    declaredBinNames,
    rawAddressSymbols,
    moduleAliasTargets,
    moduleAliasDecls,
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
    setBaseExpr,
    advanceAlign,
    alignTo,
    loadBinInput,
    loadHexInput,
    resolveAggregateType,
    sizeOfTypeExpr,
    lowerFunctionDecl,
    resolveCallable: resolveVisibleCallable,
    resolveOpCandidates: resolveVisibleOpCandidates,
    namedSectionSinksByNode,
    withNamedSectionSink: <T>(sink: NamedSectionContributionSink, fn: () => T): T => {
      const prevSink = currentNamedSectionSink;
      currentNamedSectionSink = sink;
      sink.currentSourceTag = currentCodeSegmentTag;
      try {
        return fn();
      } finally {
        currentNamedSectionSink = prevSink;
      }
    },
  };

  preScanProgramDeclarations(programLoweringContext);
  lowerProgramDeclarations(programLoweringContext);

  const { placedContributions } = placeNonBankedSectionContributions(namedSectionSinks, {
    diagnostics,
    env,
    evalImmExpr,
  });
  const placedSymbols = collectPlacedNamedSectionSymbols(placedContributions, diagnostics);
  symbols.push(...placedSymbols);

  const placedSourceSegments: EmittedSourceSegment[] = [];
  const placedAsmTrace: EmittedAsmTraceEntry[] = [];
  for (const placed of placedContributions) {
    const sink = placed.sink;
    for (const [offset, value] of sink.bytes) {
      const addr = placed.baseAddress + offset;
      if (addr < 0 || addr > 0xffff) {
        diagAt(
          diagnostics,
          sink.contribution.node.span,
          `Named section byte address out of range for section "${sink.anchor.key.section} ${sink.anchor.key.name}": ${addr}.`,
        );
        continue;
      }
      if (bytes.has(addr)) {
        diagAt(
          diagnostics,
          sink.contribution.node.span,
          `Named section content overlaps emitted bytes at address ${addr}.`,
        );
        continue;
      }
      bytes.set(addr, value);
    }
    if (sink.anchor.key.section === 'code') {
      placedSourceSegments.push(...rebaseCodeSourceSegments(placed.baseAddress, sink.sourceSegments));
      placedAsmTrace.push(...rebaseAsmTrace(placed.baseAddress, sink.asmTrace));
    }
  }

  const { writtenRange, sourceSegments, asmTrace } = finalizeProgramEmission({
    diagnostics,
    diag,
    primaryFile,
    baseExprs,
    evalImmExpr,
    env,
    codeOffset,
    dataOffset,
    varOffset,
    pending,
    symbols,
    absoluteSymbols,
    deferredExterns,
    fixups,
    rel8Fixups,
    codeBytes,
    dataBytes,
    hexBytes,
    bytes,
    codeSourceSegments,
    codeAsmTrace,
    alignTo,
    writeSection,
    computeWrittenRange,
    rebaseCodeSourceSegments,
    rebaseAsmTrace,
    ...(options?.defaultCodeBase !== undefined
      ? { defaultCodeBase: options.defaultCodeBase }
      : {}),
  });

  resolvePlacedNamedSectionFixups(placedContributions, diagnostics, bytes, symbols);

  const mergedSourceSegments = [...placedSourceSegments, ...sourceSegments].sort((a, b) =>
    a.start === b.start ? a.end - b.end : a.start - b.start,
  );
  const mergedAsmTrace = [...placedAsmTrace, ...asmTrace].sort((a, b) =>
    a.offset === b.offset ? a.kind.localeCompare(b.kind) : a.offset - b.offset,
  );

  return {
    map: {
      bytes,
      writtenRange,
      ...(mergedSourceSegments.length > 0 ? { sourceSegments: mergedSourceSegments } : {}),
      ...(mergedAsmTrace.length > 0 ? { asmTrace: mergedAsmTrace } : {}),
    },
    symbols,
  };
}
