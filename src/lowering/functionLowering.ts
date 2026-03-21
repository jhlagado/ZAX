import { TEMPLATE_SW_DEBC } from '../addressing/steps.js';
import type { StepPipeline } from '../addressing/steps.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import type { Diagnostic, DiagnosticId } from '../diagnostics/types.js';
import type {
  AsmInstructionNode,
  AsmOperandNode,
  EaExprNode,
  FuncDeclNode,
  ImmExprNode,
  OpDeclNode,
  ParamNode,
  SourceSpan,
  TypeExprNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import { resolveVisibleConst, resolveVisibleEnum } from '../moduleVisibility.js';
import type { OpStackPolicyMode } from '../pipeline.js';
import type {
  Callable,
  PendingSymbol,
  SourceSegmentTag,
} from './loweringTypes.js';
import type { OpOverloadSelection } from './opMatching.js';
import type { OpStackSummary } from './opStackAnalysis.js';
import type { EaResolution } from './eaResolution.js';
import type { ScalarKind } from './typeResolution.js';
import { createAsmInstructionLoweringHelpers } from './asmInstructionLowering.js';
import { createAsmBodyOrchestrationHelpers } from './asmBodyOrchestration.js';
import {
  createFunctionBodySetupHelpers,
  type FlowState,
  type OpExpansionFrame,
} from './functionBodySetup.js';
import { createFunctionCallLoweringHelpers } from './functionCallLowering.js';

// This module owns the per-function lowering coordinator. It assembles the
// function-local helpers, state, and diagnostics around the extracted
// body-setup and call-lowering submodules.
type ResolvedArrayType = { element: TypeExprNode; length?: number };
export type FunctionLoweringItemContext = {
  item: FuncDeclNode;
};

export type FunctionLoweringDiagnosticsContext = {
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  diagAtWithId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    message: string,
  ) => void;
  diagAtWithSeverityAndId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    severity: 'error' | 'warning',
    message: string,
  ) => void;
  warnAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
};

export type FunctionLoweringSymbolContext = {
  taken: Set<string>;
  pending: PendingSymbol[];
  traceComment: (offset: number, text: string) => void;
  traceLabel: (offset: number, name: string) => void;
  currentCodeSegmentTagRef: { current: SourceSegmentTag | undefined };
  generatedLabelCounterRef: { current: number };
};

export type FunctionLoweringSpTrackingContext = {
  bindSpTracking: (
    callbacks?:
      | {
          applySpTracking: (headRaw: string, operands: AsmOperandNode[]) => void;
          invalidateSpTracking: () => void;
        }
      | undefined,
  ) => void;
};

export type FunctionLoweringEmissionContext = {
  getCodeOffset: () => number;
  emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  emitRawCodeBytes: (bs: Uint8Array, file: string, traceText: string) => void;
  emitAbs16Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  emitAbs16FixupPrefixed: (
    prefix: number,
    opcode2: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  emitRel8Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    mnemonic: string,
  ) => void;
};

export type FunctionLoweringConditionContext = {
  conditionOpcodeFromName: (name: string) => number | undefined;
  conditionNameFromOpcode: (opcode: number) => string | undefined;
  callConditionOpcodeFromName: (name: string) => number | undefined;
  jrConditionOpcodeFromName: (name: string) => number | undefined;
  conditionOpcode: (operand: AsmOperandNode) => number | undefined;
  inverseConditionName: (name: string) => string | undefined;
  symbolicTargetFromExpr: (
    expr: ImmExprNode,
  ) => { baseLower: string; addend: number } | undefined;
};

export type FunctionLoweringTypeContext = {
  evalImmExpr: (
    expr: ImmExprNode,
    env: CompileEnv,
    diagnostics: Diagnostic[],
  ) => number | undefined;
  env: CompileEnv;
  resolveScalarBinding: (name: string) => ScalarKind | undefined;
  resolveScalarKind: (typeExpr: TypeExprNode) => ScalarKind | undefined;
  resolveEaTypeExpr: (ea: EaExprNode) => TypeExprNode | undefined;
  resolveScalarTypeForEa: (ea: EaExprNode) => ScalarKind | undefined;
  resolveScalarTypeForLd: (ea: EaExprNode) => ScalarKind | undefined;
  resolveArrayType: (typeExpr: TypeExprNode, env?: CompileEnv) => ResolvedArrayType | undefined;
  typeDisplay: (typeExpr: TypeExprNode) => string;
  sameTypeShape: (left: TypeExprNode, right: TypeExprNode) => boolean;
};

export type FunctionLoweringMaterializationContext = {
  resolveEa: (ea: EaExprNode, span: SourceSpan) => EaResolution | undefined;
  buildEaWordPipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  enforceEaRuntimeAtomBudget: (operand: AsmOperandNode, context: string) => boolean;
  enforceDirectCallSiteEaBudget: (operand: AsmOperandNode, calleeName: string) => boolean;
  pushEaAddress: (ea: EaExprNode, span: SourceSpan) => boolean;
  materializeEaAddressToHL: (ea: EaExprNode, span: SourceSpan) => boolean;
  pushMemValue: (ea: EaExprNode, want: 'byte' | 'word', span: SourceSpan) => boolean;
  pushImm16: (value: number, span: SourceSpan) => boolean;
  pushZeroExtendedReg8: (regName: string, span: SourceSpan) => boolean;
  loadImm16ToHL: (value: number, span: SourceSpan) => boolean;
  emitStepPipeline: (pipe: StepPipeline, span: SourceSpan) => boolean;
  emitScalarWordLoad: (
    target: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  emitScalarWordStore: (
    source: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  lowerLdWithEa: (asmItem: AsmInstructionNode) => boolean;
};

export type FunctionLoweringStorageContext = {
  stackSlotOffsets: Map<string, number>;
  stackSlotTypes: Map<string, TypeExprNode>;
  localAliasTargets: Map<string, EaExprNode>;
  storageTypes: Map<string, TypeExprNode>;
  rawTypedCallWarningsEnabled: boolean;
};

export type FunctionLoweringCallableResolutionContext = {
  resolveCallable: (name: string, file: string) => Callable | undefined;
  resolveOpCandidates: (name: string, file: string) => OpDeclNode[] | undefined;
  opStackPolicyMode: OpStackPolicyMode;
};

export type FunctionLoweringOpOverloadContext = {
  formatAsmOperandForOpDiag: (operand: AsmOperandNode) => string;
  selectOpOverload: (overloads: OpDeclNode[], operands: AsmOperandNode[]) => OpOverloadSelection;
  summarizeOpStackEffect: (op: OpDeclNode) => OpStackSummary;
};

export type FunctionLoweringAstUtilityContext = {
  cloneImmExpr: (expr: ImmExprNode) => ImmExprNode;
  cloneEaExpr: (expr: EaExprNode) => EaExprNode;
  cloneOperand: (operand: AsmOperandNode) => AsmOperandNode;
  flattenEaDottedName: (ea: EaExprNode) => string | undefined;
  normalizeFixedToken: (operand: AsmOperandNode) => string | undefined;
};

export type FunctionLoweringRegisterContext = {
  reg8: Set<string>;
  reg16: Set<string>;
};

export type FunctionLoweringSharedContext = FunctionLoweringDiagnosticsContext &
  FunctionLoweringSymbolContext &
  FunctionLoweringSpTrackingContext &
  FunctionLoweringEmissionContext &
  FunctionLoweringConditionContext &
  FunctionLoweringTypeContext &
  FunctionLoweringMaterializationContext &
  FunctionLoweringStorageContext &
  FunctionLoweringCallableResolutionContext &
  FunctionLoweringOpOverloadContext &
  FunctionLoweringAstUtilityContext &
  FunctionLoweringRegisterContext;

export type FunctionLoweringContext = FunctionLoweringItemContext & FunctionLoweringSharedContext;

type LocalInitializerNameStatus = 'constant' | 'non-constant' | 'unknown';

function collectImmExprNames(expr: ImmExprNode): string[] {
  switch (expr.kind) {
    case 'ImmLiteral':
    case 'ImmSizeof':
      return [];
    case 'ImmName':
      return [expr.name];
    case 'ImmOffsetof':
      return expr.path.steps.flatMap((step) =>
        step.kind === 'OffsetofIndex' ? collectImmExprNames(step.expr) : [],
      );
    case 'ImmUnary':
      return collectImmExprNames(expr.expr);
    case 'ImmBinary':
      return [...collectImmExprNames(expr.left), ...collectImmExprNames(expr.right)];
  }
}

function classifyLocalInitializerName(
  name: string,
  file: string,
  env: CompileEnv,
  resolveScalarBinding: (name: string) => ScalarKind | undefined,
  stackSlotTypes: Map<string, TypeExprNode>,
  localAliasTargets: Map<string, EaExprNode>,
  storageTypes: Map<string, TypeExprNode>,
): LocalInitializerNameStatus {
  if (resolveVisibleConst(name, file, env) !== undefined) return 'constant';
  if (resolveVisibleEnum(name, file, env) !== undefined) return 'constant';

  const lower = name.toLowerCase();
  if (
    resolveScalarBinding(name) !== undefined ||
    stackSlotTypes.has(lower) ||
    localAliasTargets.has(lower) ||
    storageTypes.has(lower)
  ) {
    return 'non-constant';
  }

  return 'unknown';
}

function localInitializerFitsScalarKind(value: number, scalarKind: 'byte' | 'word' | 'addr'): boolean {
  if (scalarKind === 'byte') return value >= -0x80 && value <= 0xff;
  return value >= -0x8000 && value <= 0xffff;
}

function localInitializerRangeLabel(scalarKind: 'byte' | 'word' | 'addr'): string {
  return scalarKind === 'byte' ? 'byte range (-128..255)' : 'word/addr range (-32768..65535)';
}

export function lowerFunctionDecl(ctx: FunctionLoweringContext): void {
  const { item, diagnostics, diag, diagAt, diagAtWithId, diagAtWithSeverityAndId, warnAt } = ctx;
  const {
    taken,
    pending,
    traceComment,
    traceLabel,
    currentCodeSegmentTagRef,
    bindSpTracking,
    getCodeOffset,
  } = ctx;
  const {
    emitInstr: emitInstrBase,
    emitRawCodeBytes,
    emitAbs16Fixup,
    emitAbs16FixupPrefixed,
    emitRel8Fixup,
  } = ctx;
  const { conditionOpcodeFromName, conditionNameFromOpcode, callConditionOpcodeFromName } = ctx;
  const { jrConditionOpcodeFromName, conditionOpcode, inverseConditionName, symbolicTargetFromExpr } = ctx;
  const { evalImmExpr, env, resolveScalarBinding, resolveScalarKind, resolveEaTypeExpr } = ctx;
  const { resolveScalarTypeForEa, resolveScalarTypeForLd, resolveArrayType, buildEaWordPipeline } = ctx;
  const { enforceEaRuntimeAtomBudget, enforceDirectCallSiteEaBudget } = ctx;
  const {
    resolveEa,
    pushEaAddress,
    materializeEaAddressToHL,
    pushMemValue,
    pushImm16,
    pushZeroExtendedReg8,
    loadImm16ToHL,
  } = ctx;
  const { stackSlotOffsets, stackSlotTypes, localAliasTargets, storageTypes } = ctx;
  const { rawTypedCallWarningsEnabled, resolveCallable, resolveOpCandidates, opStackPolicyMode } = ctx;
  const { formatAsmOperandForOpDiag, selectOpOverload, summarizeOpStackEffect } = ctx;
  const { cloneImmExpr, cloneEaExpr, cloneOperand } = ctx;
  const { flattenEaDottedName, normalizeFixedToken, reg8, reg16, generatedLabelCounterRef } = ctx;
  const { typeDisplay, sameTypeShape, emitStepPipeline, emitScalarWordLoad, emitScalarWordStore, lowerLdWithEa } = ctx;
  let currentCodeSegmentTag = currentCodeSegmentTagRef.current;
  const setCurrentCodeSegmentTag = (tag: SourceSegmentTag | undefined): void => {
    currentCodeSegmentTag = tag;
    currentCodeSegmentTagRef.current = tag;
  };
  const emitInstr = emitInstrBase;

  const rewriteImmExprForFrameOffsets = (
    expr: ImmExprNode,
  ): { expr: ImmExprNode; ok: boolean } => {
    switch (expr.kind) {
      case 'ImmLiteral':
      case 'ImmSizeof':
        return { expr, ok: true };
      case 'ImmName': {
        const lower = expr.name.toLowerCase();
        const slotOffset = stackSlotOffsets.get(lower);
        if (slotOffset !== undefined) {
          const typeExpr = stackSlotTypes.get(lower);
          const scalarKind = typeExpr ? resolveScalarKind(typeExpr) : undefined;
          if (!scalarKind) {
            diagAt(
              diagnostics,
              expr.span,
              `Non-scalar slot "${expr.name}" cannot be used as a raw IX offset.`,
            );
            return { expr, ok: false };
          }
          return { expr: { kind: 'ImmLiteral', span: expr.span, value: slotOffset }, ok: true };
        }
        if (localAliasTargets.has(lower)) {
          diagAt(
            diagnostics,
            expr.span,
            `Alias "${expr.name}" has no frame slot; cannot be used as a raw IX offset.`,
          );
          return { expr, ok: false };
        }
        return { expr, ok: true };
      }
      case 'ImmUnary': {
        const inner = rewriteImmExprForFrameOffsets(expr.expr);
        return { expr: { ...expr, expr: inner.expr }, ok: inner.ok };
      }
      case 'ImmBinary': {
        const left = rewriteImmExprForFrameOffsets(expr.left);
        const right = rewriteImmExprForFrameOffsets(expr.right);
        return {
          expr: { ...expr, left: left.expr, right: right.expr },
          ok: left.ok && right.ok,
        };
      }
      case 'ImmOffsetof': {
        let ok = true;
        const steps = expr.path.steps.map((step) => {
          if (step.kind !== 'OffsetofIndex') return step;
          const rewritten = rewriteImmExprForFrameOffsets(step.expr);
          ok = ok && rewritten.ok;
          return { ...step, expr: rewritten.expr };
        });
        return { expr: { ...expr, path: { ...expr.path, steps } }, ok };
      }
    }
  };

  const rewriteEaExprForFrameOffsets = (
    ea: EaExprNode,
  ): { expr: EaExprNode; ok: boolean } => {
    switch (ea.kind) {
      case 'EaName':
        return { expr: ea, ok: true };
      case 'EaImm': {
        const rewritten = rewriteImmExprForFrameOffsets(ea.expr);
        return { expr: { ...ea, expr: rewritten.expr }, ok: rewritten.ok };
      }
      case 'EaReinterpret': {
        const base = rewriteEaExprForFrameOffsets(ea.base);
        return { expr: { ...ea, base: base.expr }, ok: base.ok };
      }
      case 'EaField': {
        const base = rewriteEaExprForFrameOffsets(ea.base);
        return { expr: { ...ea, base: base.expr }, ok: base.ok };
      }
      case 'EaAdd':
      case 'EaSub': {
        const base = rewriteEaExprForFrameOffsets(ea.base);
        const offset = rewriteImmExprForFrameOffsets(ea.offset);
        return {
          expr: { ...ea, base: base.expr, offset: offset.expr },
          ok: base.ok && offset.ok,
        };
      }
      case 'EaIndex': {
        const base = rewriteEaExprForFrameOffsets(ea.base);
        let ok = base.ok;
        const index = (() => {
          switch (ea.index.kind) {
            case 'IndexImm': {
              const value = rewriteImmExprForFrameOffsets(ea.index.value);
              ok = ok && value.ok;
              return { ...ea.index, value: value.expr };
            }
            case 'IndexMemIxIy': {
              if (!ea.index.disp) return ea.index;
              const disp = rewriteImmExprForFrameOffsets(ea.index.disp);
              ok = ok && disp.ok;
              return { ...ea.index, disp: disp.expr };
            }
            case 'IndexEa': {
              const expr = rewriteEaExprForFrameOffsets(ea.index.expr);
              ok = ok && expr.ok;
              return { ...ea.index, expr: expr.expr };
            }
            default:
              return ea.index;
          }
        })();
        return { expr: { ...ea, base: base.expr, index }, ok };
      }
    }
  };

  const rewriteAsmOperandForFrameOffsets = (
    op: AsmOperandNode,
  ): { op: AsmOperandNode; ok: boolean } => {
    switch (op.kind) {
      case 'Reg':
      case 'PortC':
        return { op, ok: true };
      case 'Imm':
      case 'PortImm8': {
        const rewritten = rewriteImmExprForFrameOffsets(op.expr);
        return { op: { ...op, expr: rewritten.expr }, ok: rewritten.ok };
      }
      case 'Ea':
      case 'Mem': {
        const rewritten = rewriteEaExprForFrameOffsets(op.expr);
        return { op: { ...op, expr: rewritten.expr }, ok: rewritten.ok };
      }
    }
  };

  const evalImmExprForAsm = (expr: ImmExprNode): number | undefined => {
    const rewritten = rewriteImmExprForFrameOffsets(expr);
    if (!rewritten.ok) return undefined;
    return evalImmExpr(rewritten.expr, env, diagnostics);
  };

  const symbolicTargetFromExprForAsm = (
    expr: ImmExprNode,
  ): { baseLower: string; addend: number } | undefined => {
    const symbolic = symbolicTargetFromExpr(expr);
    if (!symbolic) return undefined;
    if (stackSlotOffsets.has(symbolic.baseLower)) return undefined;
    if (localAliasTargets.has(symbolic.baseLower)) {
      diagAt(
        diagnostics,
        expr.span,
        `Alias "${symbolic.baseLower}" has no frame slot; cannot be used as a raw IX offset.`,
      );
      return undefined;
    }
    return symbolic;
  };

  const emitInstrForAsm = (head: string, operands: AsmOperandNode[], span: SourceSpan): boolean => {
    const rewritten: AsmOperandNode[] = [];
    for (const op of operands) {
      const next = rewriteAsmOperandForFrameOffsets(op);
      if (!next.ok) return false;
      rewritten.push(next.op);
    }
    for (const op of rewritten) {
      if (op.kind !== 'Mem') continue;
      const ea = op.expr;
      const baseIsIxIy = (base: EaExprNode): boolean =>
        base.kind === 'EaName' && (base.name.toUpperCase() === 'IX' || base.name.toUpperCase() === 'IY');
      let dispExpr: ImmExprNode | undefined;
      if (baseIsIxIy(ea)) {
        dispExpr = { kind: 'ImmLiteral', span: op.span, value: 0 };
      } else if ((ea.kind === 'EaAdd' || ea.kind === 'EaSub') && baseIsIxIy(ea.base)) {
        dispExpr = ea.offset;
      } else {
        continue;
      }
      const value = evalImmExpr(dispExpr, env, diagnostics);
      if (value === undefined) continue;
      if (value < -128 || value > 127) {
        diagAt(
          diagnostics,
          op.span,
          `IX/IY displacement out of range (-128..127): ${value}.`,
        );
        return false;
      }
    }
    return emitInstrBase(head, rewritten, span);
  };

  stackSlotOffsets.clear();
  stackSlotTypes.clear();
  localAliasTargets.clear();

  const localDecls = item.locals.decls;
  const returnRegs = item.returnRegs.map((r: string) => r.toUpperCase());
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
    if (decl.form === 'typed') {
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
      localScalarInitializers.push({
        name: decl.name,
        ...(init ? { expr: init.expr } : {}),
        span: decl.span,
        scalarKind,
      });
      continue;
    }
    const init = decl.initializer;
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
  const hasStackSlots = frameSize > 0 || argc > 0;
  for (let paramIndex = 0; paramIndex < argc; paramIndex++) {
    const p = item.params[paramIndex]!;
    const base = 4 + 2 * paramIndex;
    stackSlotOffsets.set(p.name.toLowerCase(), base);
    stackSlotTypes.set(p.name.toLowerCase(), p.typeExpr);
  }

  let epilogueLabel = `__zax_epilogue_${generatedLabelCounterRef.current++}`;
  while (taken.has(epilogueLabel)) {
    epilogueLabel = `__zax_epilogue_${generatedLabelCounterRef.current++}`;
  }
  const emitSyntheticEpilogue =
    preserveSet.length > 0 || hasStackSlots || localScalarInitializers.length > 0;

  // Function entry label.
  traceComment(getCodeOffset(), `func ${item.name} begin`);
  if (taken.has(item.name)) {
    diag(diagnostics, item.span.file, `Duplicate symbol name "${item.name}".`);
  } else {
    taken.add(item.name);
    traceLabel(getCodeOffset(), item.name);
    pending.push({
      kind: 'label',
      name: item.name,
      section: 'code',
      offset: getCodeOffset(),
      file: item.span.file,
      line: item.span.start.line,
      scope: 'global',
    });
  }

  if (hasStackSlots) {
    const prevTag = currentCodeSegmentTag;
    setCurrentCodeSegmentTag({
      file: item.span.file,
      line: item.span.start.line,
      column: item.span.start.column,
      kind: 'code',
      confidence: 'high',
    });
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
      setCurrentCodeSegmentTag(prevTag);
    }
  }

  for (const init of localScalarInitializers) {
    const prevTag = currentCodeSegmentTag;
    setCurrentCodeSegmentTag({
      file: init.span.file,
      line: init.span.start.line,
      column: init.span.start.column,
      kind: 'code',
      confidence: 'high',
    });
    try {
      let initValue = 0;
      if (init.expr !== undefined) {
        const referencedNames = [...new Set(collectImmExprNames(init.expr))];
        const nonConstantName = referencedNames.find(
          (name) =>
            classifyLocalInitializerName(
              name,
              init.span.file,
              env,
              resolveScalarBinding,
              stackSlotTypes,
              localAliasTargets,
              storageTypes,
            ) === 'non-constant',
        );
        if (nonConstantName) {
          diagAt(
            diagnostics,
            init.span,
            `Invalid local constant initializer for "${init.name}": "${nonConstantName}" is not a compile-time constant.`,
          );
          continue;
        }

        const unknownName = referencedNames.find(
          (name) =>
            classifyLocalInitializerName(
              name,
              init.span.file,
              env,
              resolveScalarBinding,
              stackSlotTypes,
              localAliasTargets,
              storageTypes,
            ) === 'unknown',
        );
        if (unknownName) {
          diagAt(
            diagnostics,
            init.span,
            `Unknown compile-time name "${unknownName}" in local initializer for "${init.name}".`,
          );
          continue;
        }

        const initDiagnostics: Diagnostic[] = [];
        const evaluated = evalImmExpr(init.expr, env, initDiagnostics);
        if (evaluated === undefined) {
          diagnostics.push(...initDiagnostics);
          if (initDiagnostics.length === 0) {
            diagAt(
              diagnostics,
              init.span,
              `Invalid local constant initializer for "${init.name}".`,
            );
          }
          continue;
        }
        initValue = evaluated;
      }

      if (!localInitializerFitsScalarKind(initValue, init.scalarKind)) {
        diagAt(
          diagnostics,
          init.span,
          `Local initializer for "${init.name}" does not fit ${localInitializerRangeLabel(init.scalarKind)}; got ${initValue}.`,
        );
        continue;
      }
      const narrowed = init.scalarKind === 'byte' ? initValue & 0xff : initValue & 0xffff;
      if (hlPreserved) {
        // Preserve caller-visible HL by swapping the initialized local word with
        // the saved HL already at the top of the stack.
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
      setCurrentCodeSegmentTag(prevTag);
    }
  }

  if (shouldPreserveTypedBoundary) {
    const prevTag = currentCodeSegmentTag;
    setCurrentCodeSegmentTag({
      file: item.span.file,
      line: item.span.start.line,
      column: item.span.start.column,
      kind: 'code',
      confidence: 'high',
    });
    try {
      for (const reg of preserveSet) {
        emitInstr('push', [{ kind: 'Reg', span: item.span, name: reg }], item.span);
      }
    } finally {
      setCurrentCodeSegmentTag(prevTag);
    }
  }

  // Track SP deltas relative to the start of user asm, after prologue reservation.
  const trackedSp = {
    delta: 0,
    valid: true,
    invalid: false,
  };
  const applySpTracking = (headRaw: string, operands: AsmOperandNode[]) => {
    const head = headRaw.toLowerCase();
    if (
      head === 'ld' &&
      operands.length === 2 &&
      operands[0]?.kind === 'Reg' &&
      operands[0].name.toUpperCase() === 'SP'
    ) {
      if (operands[1]?.kind === 'Reg' && operands[1].name.toUpperCase() === 'IX') {
        trackedSp.delta = -2;
        trackedSp.valid = true;
        trackedSp.invalid = false;
      } else {
        trackedSp.valid = false;
        trackedSp.invalid = true;
      }
      return;
    }
    if (!trackedSp.valid) return;
    if (head === 'push' && operands.length === 1) {
      trackedSp.delta -= 2;
      return;
    }
    if (head === 'pop' && operands.length === 1) {
      trackedSp.delta += 2;
      return;
    }
    if (
      head === 'inc' &&
      operands.length === 1 &&
      operands[0]?.kind === 'Reg' &&
      operands[0].name.toUpperCase() === 'SP'
    ) {
      trackedSp.delta += 1;
      return;
    }
    if (
      head === 'dec' &&
      operands.length === 1 &&
      operands[0]?.kind === 'Reg' &&
      operands[0].name.toUpperCase() === 'SP'
    ) {
      trackedSp.delta -= 1;
      return;
    }
  };
  bindSpTracking({
    applySpTracking,
    invalidateSpTracking: () => {
      trackedSp.valid = false;
      trackedSp.invalid = true;
    },
  });

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
  const opExpansionStack: OpExpansionFrame[] = [];
  const {
    appendInvalidOpExpansionDiagnostic,
    sourceTagForSpan,
    withCodeSourceTag,
    syncFromFlow: syncFromFlowBase,
    syncToFlow: syncToFlowBase,
    snapshotFlow,
    restoreFlow: restoreFlowBase,
    newHiddenLabel,
    defineCodeLabel,
    emitJumpTo,
    emitJumpCondTo,
    emitJumpIfFalse,
    emitVirtualReg16Transfer,
    joinFlows,
    emitSelectCompareToImm16,
    emitSelectCompareReg8ToImm8,
    emitSelectCompareReg8Range,
    emitSelectCompareImm16Range,
    loadSelectorIntoHL,
  } = createFunctionBodySetupHelpers({
    diagnostics,
    diagAt,
    diagAtWithId,
    getCurrentCodeSegmentTag: () => currentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    taken,
    traceLabel,
    pending,
    getCodeOffset,
    emitAbs16Fixup,
    conditionNameFromOpcode,
    inverseConditionName,
    conditionOpcodeFromName,
    emitInstr,
    emitRawCodeBytes,
    loadImm16ToHL,
    pushEaAddress,
    pushMemValue,
    evalImmExpr: (expr) => evalImmExpr(expr, env, diagnostics),
    reg8,
    generatedLabelCounterRef,
    formatAsmOperandForOpDiag,
  });
  const syncFromFlow = (): void => {
    syncFromFlowBase(flow, trackedSp);
  };
  const syncToFlow = (): void => {
    syncToFlowBase(flow, trackedSp);
  };
  const restoreFlow = (state: FlowState): void => {
    restoreFlowBase(
      {
        get current() {
          return flow;
        },
        set current(value: FlowState) {
          flow = value;
        },
      },
      state,
      trackedSp,
    );
  };

  const { lowerAsmInstructionDispatcher } = createAsmInstructionLoweringHelpers({
    diagnostics,
    diagAt,
    emitInstr: emitInstrForAsm,
    emitRawCodeBytes,
    emitAbs16Fixup,
    emitAbs16FixupPrefixed,
    emitRel8Fixup,
    conditionOpcodeFromName,
    conditionNameFromOpcode,
    callConditionOpcodeFromName,
    jrConditionOpcodeFromName,
    conditionOpcode,
    symbolicTargetFromExpr: symbolicTargetFromExprForAsm,
    evalImmExpr: evalImmExprForAsm,
    resolveScalarBinding,
    resolveScalarTypeForEa,
    resolveScalarTypeForLd,
    resolveEa,
    diagIfRetStackImbalanced: (span, mnemonic) => {
      if (emitSyntheticEpilogue) return;
      if (trackedSp.valid && trackedSp.delta !== 0) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} with non-zero tracked stack delta (${trackedSp.delta}); function stack is imbalanced.`,
        );
        return;
      }
      if (!trackedSp.valid && trackedSp.invalid && hasStackSlots) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} reached after untracked SP mutation; cannot verify function stack balance.`,
        );
        return;
      }
      if (!trackedSp.valid && hasStackSlots) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic ?? 'ret'} reached with unknown stack depth; cannot verify function stack balance.`,
        );
      }
    },
    diagIfCallStackUnverifiable: (options) => {
      const span = options.span;
      const mnemonic = options.mnemonic ?? 'call';
      const contractKind = options.contractKind ?? 'callee';
      const contractNoun =
        contractKind === 'typed-call' ? 'typed-call boundary contract' : 'callee stack contract';
      if (hasStackSlots && trackedSp.valid && trackedSp.delta > 0) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached with positive tracked stack delta (${trackedSp.delta}); cannot verify ${contractNoun}.`,
        );
        return;
      }
      if (hasStackSlots && !trackedSp.valid && trackedSp.invalid) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached after untracked SP mutation; cannot verify ${contractNoun}.`,
        );
        return;
      }
      if (hasStackSlots && !trackedSp.valid) {
        diagAt(
          diagnostics,
          span,
          `${mnemonic} reached with unknown stack depth; cannot verify ${contractNoun}.`,
        );
      }
    },
    warnIfRawCallTargetsTypedCallable: (span, symbolicTarget) => {
      if (!rawTypedCallWarningsEnabled || !symbolicTarget || symbolicTarget.addend !== 0) return;
      const callable = resolveCallable(symbolicTarget.baseLower, span.file);
      if (!callable) return;
      const typedName = callable.node.name;
      diagAtWithSeverityAndId(
        diagnostics,
        span,
        DiagnosticIds.RawCallTypedTargetWarning,
        'warning',
        `Raw call targets typed callable \"${typedName}\" and bypasses typed-call argument/preservation semantics; use typed call syntax unless raw ABI is intentional.`,
      );
    },
    lowerLdWithEa,
    pushEaAddress,
    materializeEaAddressToHL,
    emitScalarWordLoad,
    emitScalarWordStore,
    emitVirtualReg16Transfer,
    reg16,
    emitSyntheticEpilogue,
    epilogueLabel,
    emitJumpTo,
    emitJumpCondTo,
    syncToFlow,
    flowRef,
  });

  const { emitAsmInstruction, lowerAsmRange } = createFunctionCallLoweringHelpers({
    diagnostics,
    asmItemSpanSourceTag: (span) => sourceTagForSpan(span, opExpansionStack),
    getCurrentCodeSegmentTag: () => currentCodeSegmentTag,
    setCurrentCodeSegmentTag,
    appendInvalidOpExpansionDiagnostic,
    enforceEaRuntimeAtomBudget,
    hasStackSlots,
    emitSyntheticEpilogue,
    getTrackedSpDelta: () => trackedSp.delta,
    setTrackedSpDelta: (value) => {
      trackedSp.delta = value;
    },
    getTrackedSpValid: () => trackedSp.valid,
    setTrackedSpValid: (value) => {
      trackedSp.valid = value;
    },
    getTrackedSpInvalid: () => trackedSp.invalid,
    setTrackedSpInvalid: (value) => {
      trackedSp.invalid = value;
    },
    rawTypedCallWarningsEnabled,
    resolveCallable,
    diagAt,
    diagAtWithSeverityAndId,
    resolveScalarTypeForEa,
    enforceDirectCallSiteEaBudget,
    resolveEaTypeExpr,
    stackSlotTypes,
    storageTypes,
    pushEaAddress,
    resolveArrayType,
    sameTypeShape,
    typeDisplay,
    resolveScalarBinding,
    pushMemValue,
    flattenEaDottedName,
    env,
    evalImmExpr,
    resolveScalarKind,
    reg8,
    reg16,
    buildEaWordPipeline,
    emitStepPipeline,
    emitInstr,
    emitAbs16Fixup,
    pushZeroExtendedReg8,
    pushImm16,
    syncToFlow,
    resolveOpCandidates,
    opStackPolicyMode,
    opExpansionStack,
    diagAtWithId,
    formatAsmOperandForOpDiag: (operand) => formatAsmOperandForOpDiag(operand) ?? '?',
    selectOpOverload,
    summarizeOpStackEffect,
    cloneImmExpr,
    cloneEaExpr,
    cloneOperand,
    normalizeFixedToken,
    inverseConditionName,
    newHiddenLabel,
    lowerAsmInstructionDispatcher,
    defineCodeLabel,
    flowRef,
    syncFromFlow,
    snapshotFlow: () => snapshotFlow(flow),
    restoreFlow,
    emitJumpIfFalse,
    emitJumpTo,
    warnAt,
    joinFlows: (left, right, span, contextName) =>
      joinFlows(left, right, span, contextName, hasStackSlots),
    loadSelectorIntoHL,
    emitRawCodeBytes,
    emitSelectCompareReg8ToImm8,
    emitSelectCompareToImm16,
    emitSelectCompareReg8Range,
    emitSelectCompareImm16Range,
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
      withCodeSourceTag(sourceTagForSpan(item.span, opExpansionStack), () => {
        emitInstr('ret', [], item.span);
      });
    },
    emitSyntheticEpilogueBody: () => {
      withCodeSourceTag(sourceTagForSpan(item.span, opExpansionStack), () => {
        pending.push({
          kind: 'label',
          name: epilogueLabel,
          section: 'code',
          offset: getCodeOffset(),
          file: item.span.file,
          line: item.span.start.line,
          scope: 'local',
        });
        traceLabel(getCodeOffset(), epilogueLabel);
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
      traceComment(getCodeOffset(), `func ${item.name} end`);
    },
  });
  lowerAndFinalizeFunctionBody();
  bindSpTracking(undefined);
  setCurrentCodeSegmentTag(currentCodeSegmentTag);
}
