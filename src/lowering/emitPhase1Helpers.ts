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
import type {
  AsmInstructionNode,
  AsmOperandNode,
  ImmExprNode,
  ProgramNode,
  SourceSpan,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import { evalImmExpr } from '../semantics/env.js';
import { sizeOfTypeExpr } from '../semantics/layout.js';
import { encodeInstruction } from '../z80/encode.js';
import { buildEaResolutionContext, createEaResolutionHelpers } from './eaResolution.js';
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
import { createAsmUtilityHelpers, flattenEaDottedName } from './asmUtils.js';
import { formatImmExprForAsm, formatIxDisp } from './traceFormat.js';
import { createTypeResolutionHelpers } from './typeResolution.js';
import { createEmitProgramContext } from './emitProgramContext.js';
import { createEmitStateHelpers } from './emitState.js';
import type { EmitProgramOptions } from './emitPipeline.js';
import type { EmitPhase1Workspace } from './emitPhase1Workspace.js';
import { alignTo } from './sectionLayout.js';
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
} from './asmUtils.js';
import { loadBinInput, loadHexInput } from './inputAssets.js';

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

export type EmitPhase1Helpers = {
  /** Flushes trailing user comments from the lowered asm recording buffer. */
  flushTrailingUserComments: () => void;
  /** Live lowered asm stream (same ref as workspace). */
  loweredAsmStream: EmitPhase1Workspace['loweredAsmStream'];
  /** Program-level lowering context (symbols, traversal, function lowerer). */
  programLoweringContext: ReturnType<typeof createEmitProgramContext>['programLoweringContext'];
  /** Sinks for named section contributions during emit. */
  namedSectionSinks: ReturnType<typeof createEmitStateHelpers>['namedSectionSinks'];
};

type Context = {
  /** Whole program AST. */
  program: ProgramNode;
  /** Compile environment (consts, types, modules). */
  env: CompileEnv;
  /** Shared diagnostic sink for emit phase 1. */
  diagnostics: Diagnostic[];
  /** Optional emit options (listing sources, section keys, etc.). */
  options?: EmitProgramOptions;
  /** Mutable workspace shared with program lowering. */
  workspace: EmitPhase1Workspace;
};

export function createEmitPhase1Helpers(ctx: Context): EmitPhase1Helpers {
  let applySpTracking: ((headRaw: string, operands: AsmOperandNode[]) => void) | undefined;
  let invalidateSpTracking: (() => void) | undefined;
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
    env: ctx.env,
    storageTypes: ctx.workspace.storageTypes,
    stackSlotTypes: ctx.workspace.stackSlotTypes,
    rawAddressSymbols: ctx.workspace.rawAddressSymbols,
    moduleAliasTargets: ctx.workspace.moduleAliasTargets,
    getLocalAliasTargets: () => ctx.workspace.localAliasTargets,
  });

  const evalImmNoDiag = (expr: ImmExprNode): number | undefined => {
    const scratch: Diagnostic[] = [];
    return evalImmExpr(expr, ctx.env, scratch);
  };

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
    ...(ctx.options?.namedSectionKeys ? { namedSectionKeys: ctx.options.namedSectionKeys } : {}),
    ...(ctx.options?.sourceTexts ? { sourceTexts: ctx.options.sourceTexts } : {}),
    ...(ctx.options?.sourceLineComments ? { sourceLineComments: ctx.options.sourceLineComments } : {}),
    codeBytes: ctx.workspace.codeBytes,
    codeSourceSegments: ctx.workspace.codeSourceSegments,
    fixups: ctx.workspace.fixups,
    rel8Fixups: ctx.workspace.rel8Fixups,
    loweredAsmStream: ctx.workspace.loweredAsmStream,
    loweredAsmBlocksByKey: ctx.workspace.loweredAsmBlocksByKey,
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
    const encoded = encodeInstruction(syntheticInstruction, ctx.env, ctx.diagnostics);
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
    traceInstruction: (_offset, _bytesOut, _text) => {},
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
    evalImmExpr: (expr) => evalImmExpr(expr, ctx.env, ctx.diagnostics),
  });

  ({ emitCodeBytes, emitRawCodeBytes, emitStepPipeline } = createEmissionCoreHelpers({
    getCodeOffset: getCurrentCodeOffset,
    setCodeOffset: setCurrentCodeOffset,
    setCodeByte: setCurrentCodeByte,
    recordCodeSourceRange,
    traceInstruction: (_offset, _bytesOut, _text) => {},
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
    isEnumName: (name) => ctx.env.enums.has(name),
  });

  const { resolveEa } = createEaResolutionHelpers(
    buildEaResolutionContext({
      env: ctx.env,
      diagnostics: ctx.diagnostics,
      diagAt,
      workspace: {
        stackSlotOffsets: ctx.workspace.stackSlotOffsets,
        stackSlotTypes: ctx.workspace.stackSlotTypes,
        storageTypes: ctx.workspace.storageTypes,
        moduleAliasTargets: ctx.workspace.moduleAliasTargets,
        localAliasTargets: ctx.workspace.localAliasTargets,
      },
      resolveScalarKind,
      resolveAggregateType,
      resolveEaTypeExpr,
      evalImmNoDiag,
    }),
  );

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
    return sizeOfTypeExpr(resolved.typeExpr, ctx.env, ctx.diagnostics);
  };

  const { selectOpOverload, formatAsmOperandForOpDiag } = createOpMatchingHelpers({
    reg8: REG8_NAMES,
    isIxIyIndexedMem,
    flattenEaDottedName,
    isEnumName: (name) => ctx.env.enums.has(name),
    normalizeFixedToken,
    conditionOpcodeFromName,
    evalImmNoDiag,
    inferMemWidth,
  });

  for (const [aliasLower, aliasTarget] of ctx.workspace.moduleAliasTargets) {
    if (ctx.workspace.storageTypes.has(aliasLower)) continue;
    const inferred = resolveEaTypeExpr(aliasTarget);
    if (!inferred) {
      const decl = ctx.workspace.moduleAliasDecls.get(aliasLower);
      const target = decl?.name ?? aliasLower;
      if (decl) {
        diagAt(
          ctx.diagnostics,
          decl.span,
          `Incompatible inferred alias binding for "${target}": unable to infer type from alias source.`,
        );
      } else {
        diag(
          ctx.diagnostics,
          ctx.program.entryFile,
          `Incompatible inferred alias binding for "${target}": unable to infer type from alias source.`,
        );
      }
      continue;
    }
    ctx.workspace.storageTypes.set(aliasLower, inferred);
  }

  const { enforceDirectCallSiteEaBudget, enforceEaRuntimeAtomBudget } =
    createRuntimeAtomBudgetHelpers({
      diagnostics: ctx.diagnostics,
      diagAt,
      resolveScalarBinding,
      stackSlotOffsets: ctx.workspace.stackSlotOffsets,
      stackSlotTypes: ctx.workspace.stackSlotTypes,
      storageTypes: ctx.workspace.storageTypes,
    });

  const { buildEaBytePipeline, buildEaWordPipeline } = createAddressingPipelineBuilders({
    diagnostics: ctx.diagnostics,
    diagAt,
    reg8: REG8_NAMES,
    resolveEa,
    resolveEaTypeExpr,
    resolveScalarBinding,
    resolveScalarKind,
    sizeOfTypeExpr: (typeExpr) => sizeOfTypeExpr(typeExpr, ctx.env, ctx.diagnostics),
    evalImmExpr: (expr) => evalImmExpr(expr, ctx.env, ctx.diagnostics),
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
    diagnostics: ctx.diagnostics,
    diagAt,
    reg8: REG8_NAMES,
    resolveEa,
    resolveEaTypeExpr,
    resolveAggregateType,
    resolveScalarBinding,
    resolveScalarKind,
    sizeOfTypeExpr: (typeExpr) => sizeOfTypeExpr(typeExpr, ctx.env, ctx.diagnostics),
    evalImmExpr: (expr) => evalImmExpr(expr, ctx.env, ctx.diagnostics),
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
    diagnostics: ctx.diagnostics,
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
    env: ctx.env,
    evalImmExpr: (expr: ImmExprNode) => evalImmExpr(expr, ctx.env, ctx.diagnostics),
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
    stackSlotOffsets: ctx.workspace.stackSlotOffsets,
    storageTypes: ctx.workspace.storageTypes,
  });

  const { programLoweringContext } = createEmitProgramContext({
    diagnostics: {
      diagnostics: ctx.diagnostics,
      diag,
      diagAt,
      diagAtWithId,
      diagAtWithSeverityAndId,
      warnAt,
    },
    symbolsAndTrace: {
      taken: ctx.workspace.taken,
      pending: ctx.workspace.pending,
      traceComment,
      traceLabel,
      currentCodeSegmentTagRef,
      generatedLabelCounterRef,
    },
    spTracking: {
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
    },
    emission: {
      getCodeOffset: getCurrentCodeOffset,
      emitInstr,
      emitRawCodeBytes,
      emitAbs16Fixup,
      emitAbs16FixupPrefixed,
      emitRel8Fixup,
    },
    conditions: {
      conditionOpcodeFromName,
      conditionNameFromOpcode,
      callConditionOpcodeFromName,
      jrConditionOpcodeFromName,
      conditionOpcode,
      inverseConditionName,
      symbolicTargetFromExpr,
    },
    types: {
      evalImmExpr,
      env: ctx.env,
      resolveScalarBinding,
      resolveScalarKind,
      resolveEaTypeExpr,
      resolveScalarTypeForEa,
      resolveScalarTypeForLd,
      resolveArrayType,
      typeDisplay,
      sameTypeShape,
    },
    materialization: {
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
    },
    storage: {
      stackSlotOffsets: ctx.workspace.stackSlotOffsets,
      stackSlotTypes: ctx.workspace.stackSlotTypes,
      localAliasTargets: ctx.workspace.localAliasTargets,
      storageTypes: ctx.workspace.storageTypes,
      moduleAliasTargets: ctx.workspace.moduleAliasTargets,
      rawTypedCallWarningsEnabled: ctx.workspace.rawTypedCallWarningsEnabled,
    },
    callableResolution: {
      resolveCallable: ctx.workspace.resolveVisibleCallable,
      resolveOpCandidates: ctx.workspace.resolveVisibleOpCandidates,
      opStackPolicyMode: ctx.workspace.opStackPolicyMode,
    },
    opOverload: {
      formatAsmOperandForOpDiag,
      selectOpOverload,
      summarizeOpStackEffect: ctx.workspace.summarizeOpStackEffect,
    },
    astUtilities: {
      cloneImmExpr,
      cloneEaExpr,
      cloneOperand,
      flattenEaDottedName,
      normalizeFixedToken,
    },
    registers: {
      reg8: REG8_NAMES,
      reg16: REG16_NAMES,
    },
    program: {
      program: ctx.program,
      includeDirs: ctx.workspace.includeDirs,
      localCallablesByFile: ctx.workspace.localCallablesByFile,
      visibleCallables: ctx.workspace.visibleCallables,
      localOpsByFile: ctx.workspace.localOpsByFile,
      visibleOpsByName: ctx.workspace.visibleOpsByName,
      declaredOpNames: ctx.workspace.declaredOpNames,
      declaredBinNames: ctx.workspace.declaredBinNames,
      deferredExterns: ctx.workspace.deferredExterns,
      storageTypes: ctx.workspace.storageTypes,
      moduleAliasTargets: ctx.workspace.moduleAliasTargets,
      moduleAliasDecls: ctx.workspace.moduleAliasDecls,
      rawAddressSymbols: ctx.workspace.rawAddressSymbols,
      absoluteSymbols: ctx.workspace.absoluteSymbols,
      symbols: ctx.workspace.symbols,
      dataBytes: ctx.workspace.dataBytes,
      codeBytes: ctx.workspace.codeBytes,
      hexBytes: ctx.workspace.hexBytes,
      activeSectionRef,
      codeOffsetRef,
      dataOffsetRef,
      varOffsetRef,
      baseExprs: ctx.workspace.baseExprs,
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
      currentCodeSegmentTagRef,
    },
  });

  return {
    flushTrailingUserComments,
    loweredAsmStream: ctx.workspace.loweredAsmStream,
    programLoweringContext,
    namedSectionSinks,
  };
}
