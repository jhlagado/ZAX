import { DiagnosticIds, type Diagnostic } from '../diagnostics/types.js';
import type {
  AsmInstructionNode,
  AsmItemNode,
  AsmOperandNode,
  EaExprNode,
  ImmExprNode,
  OpDeclNode,
  OpMatcherNode,
  SourceSpan,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { OpStackSummary } from './opStackAnalysis.js';
import { createOpExpansionExecutionHelpers } from './opExpansionExecution.js';
import { createOpSubstitutionHelpers } from './opSubstitution.js';

type OpExpansionStackEntry = {
  key: string;
  name: string;
  declSpan: SourceSpan;
  callSiteSpan: SourceSpan;
};

type CloneHelper<T> = (value: T) => T;

type Context = {
  opsByName: Map<string, OpDeclNode[]>;
  diagnostics: Diagnostic[];
  env: CompileEnv;
  hasStackSlots: boolean;
  opStackPolicyMode: 'off' | 'warn' | 'error';
  opExpansionStack: OpExpansionStackEntry[];
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  diagAtWithId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: (typeof DiagnosticIds)[keyof typeof DiagnosticIds],
    message: string,
  ) => void;
  diagAtWithSeverityAndId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: (typeof DiagnosticIds)[keyof typeof DiagnosticIds],
    severity: 'warning' | 'error',
    message: string,
  ) => void;
  matcherMatchesOperand: (matcher: OpMatcherNode, operand: AsmOperandNode) => boolean;
  formatOpSignature: (opDecl: OpDeclNode) => string;
  formatAsmOperandForOpDiag: (operand: AsmOperandNode) => string;
  firstOpOverloadMismatchReason: (opDecl: OpDeclNode, operands: AsmOperandNode[]) => string | undefined;
  formatOpDefinitionForDiag: (opDecl: OpDeclNode) => string;
  selectMostSpecificOpOverload: (matches: OpDeclNode[], operands: AsmOperandNode[]) => OpDeclNode | undefined;
  summarizeOpStackEffect: (opDecl: OpDeclNode) => OpStackSummary;
  cloneImmExpr: CloneHelper<ImmExprNode>;
  cloneEaExpr: CloneHelper<EaExprNode>;
  cloneOperand: CloneHelper<AsmOperandNode>;
  flattenEaDottedName: (ea: EaExprNode) => string | undefined;
  normalizeFixedToken: (operand: AsmOperandNode) => string | undefined;
  inverseConditionName: (name: string) => string | undefined;
  newHiddenLabel: (prefix: string) => string;
  lowerAsmRange: (items: readonly AsmItemNode[], startIndex: number, stopKinds: Set<string>) => number;
  syncToFlow: () => void;
};

export function createOpExpansionOrchestrationHelpers(ctx: Context) {
  const tryHandleOpExpansion = (asmItem: AsmInstructionNode): boolean => {
    const opCandidates = ctx.opsByName.get(asmItem.head.toLowerCase());
    if (!opCandidates || opCandidates.length === 0) return false;

    const arityMatches = opCandidates.filter(
      (candidate) => candidate.params.length === asmItem.operands.length,
    );
    if (arityMatches.length === 0) {
      const available = opCandidates.map((candidate) => `  - ${ctx.formatOpSignature(candidate)}`).join('\n');
      ctx.diagAtWithId(
        ctx.diagnostics,
        asmItem.span,
        DiagnosticIds.OpArityMismatch,
        `No op overload of "${asmItem.head}" accepts ${asmItem.operands.length} operand(s).\n` +
          `available overloads:\n${available}`,
      );
      return true;
    }

    const matches = arityMatches.filter((candidate) => {
      if (candidate.params.length !== asmItem.operands.length) return false;
      for (let idx = 0; idx < candidate.params.length; idx++) {
        const param = candidate.params[idx]!;
        const arg = asmItem.operands[idx]!;
        if (!ctx.matcherMatchesOperand(param.matcher, arg)) return false;
      }
      return true;
    });
    if (matches.length === 0) {
      const operandSummary = asmItem.operands.map(ctx.formatAsmOperandForOpDiag).join(', ');
      const available = arityMatches
        .map((candidate) => {
          const reason = ctx.firstOpOverloadMismatchReason(candidate, asmItem.operands);
          return `  - ${ctx.formatOpDefinitionForDiag(candidate)}${reason ? ` ; ${reason}` : ''}`;
        })
        .join('\n');
      ctx.diagAtWithId(
        ctx.diagnostics,
        asmItem.span,
        DiagnosticIds.OpNoMatchingOverload,
        `No matching op overload for "${asmItem.head}" with provided operands.\n` +
          `call-site operands: (${operandSummary})\n` +
          `available overloads:\n${available}`,
      );
      return true;
    }

    const selected = ctx.selectMostSpecificOpOverload(matches, asmItem.operands);
    if (!selected) {
      const operandSummary = asmItem.operands.map(ctx.formatAsmOperandForOpDiag).join(', ');
      const equallySpecific = matches
        .map((candidate) => `  - ${ctx.formatOpDefinitionForDiag(candidate)}`)
        .join('\n');
      ctx.diagAtWithId(
        ctx.diagnostics,
        asmItem.span,
        DiagnosticIds.OpAmbiguousOverload,
        `Ambiguous op overload for "${asmItem.head}" (${matches.length} matches).\n` +
          `call-site operands: (${operandSummary})\n` +
          `equally specific candidates:\n${equallySpecific}`,
      );
      return true;
    }

    const opDecl = selected;
    if (ctx.opStackPolicyMode !== 'off' && ctx.hasStackSlots) {
      const summary = ctx.summarizeOpStackEffect(opDecl);
      const severity = ctx.opStackPolicyMode === 'error' ? 'error' : 'warning';
      if (summary.kind === 'known') {
        if (summary.hasUntrackedSpMutation) {
          ctx.diagAtWithSeverityAndId(
            ctx.diagnostics,
            asmItem.span,
            DiagnosticIds.OpStackPolicyRisk,
            severity,
            `op "${opDecl.name}" may mutate SP in an untracked way (static body analysis); invocation inside stack-slot function may invalidate stack verification.`,
          );
        }
        if (summary.delta !== 0) {
          ctx.diagAtWithSeverityAndId(
            ctx.diagnostics,
            asmItem.span,
            DiagnosticIds.OpStackPolicyRisk,
            severity,
            `op "${opDecl.name}" has non-zero static stack delta (${summary.delta}) and is invoked inside stack-slot function.`,
          );
        }
      }
    }

    const opKey = opDecl.name.toLowerCase();
    const cycleStart = ctx.opExpansionStack.findIndex((entry) => entry.key === opKey);
    if (cycleStart !== -1) {
      const cycleChain = [
        ...ctx.opExpansionStack
          .slice(cycleStart)
          .map((entry) => `${entry.name} (${entry.declSpan.file}:${entry.declSpan.start.line})`),
        `${opDecl.name} (${opDecl.span.file}:${opDecl.span.start.line})`,
      ].join(' -> ');
      ctx.diagAtWithId(
        ctx.diagnostics,
        asmItem.span,
        DiagnosticIds.OpExpansionCycle,
        `Cyclic op expansion detected for "${opDecl.name}".\n` + `expansion chain: ${cycleChain}`,
      );
      return true;
    }

    const bindings = new Map<string, AsmOperandNode>();
    for (let idx = 0; idx < opDecl.params.length; idx++) {
      bindings.set(opDecl.params[idx]!.name.toLowerCase(), asmItem.operands[idx]!);
    }

    const {
      substituteImmWithOpLabels,
      substituteOperandWithOpLabels,
      substituteConditionWithOpLabels,
    } = createOpSubstitutionHelpers({
      bindings,
      env: ctx.env,
      diagnostics: ctx.diagnostics,
      diagAt: ctx.diagAt,
      cloneImmExpr: ctx.cloneImmExpr,
      cloneEaExpr: ctx.cloneEaExpr,
      cloneOperand: ctx.cloneOperand,
      flattenEaDottedName: ctx.flattenEaDottedName,
      normalizeFixedToken: ctx.normalizeFixedToken,
      inverseConditionName: ctx.inverseConditionName,
    });

    ctx.opExpansionStack.push({
      key: opKey,
      name: opDecl.name,
      declSpan: opDecl.span,
      callSiteSpan: asmItem.span,
    });
    try {
      const { expandAndLowerOpBody } = createOpExpansionExecutionHelpers({
        diagnostics: ctx.diagnostics,
        diagAt: ctx.diagAt,
        newHiddenLabel: ctx.newHiddenLabel,
        lowerAsmRange: ctx.lowerAsmRange,
      });
      expandAndLowerOpBody({
        opDecl,
        substituteOperandWithOpLabels,
        substituteImmWithOpLabels,
        substituteConditionWithOpLabels,
      });
    } finally {
      ctx.opExpansionStack.pop();
    }
    ctx.syncToFlow();
    return true;
  };

  return {
    tryHandleOpExpansion,
  };
}
