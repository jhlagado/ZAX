import type { Diagnostic, DiagnosticId } from '../diagnostics/types.js';
import type {
  AsmItemNode,
  AsmOperandNode,
  EaExprNode,
  ImmExprNode,
  OpDeclNode,
  SourceSpan,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { OpOverloadSelection } from './opMatching.js';
import type { OpStackSummary } from './opStackAnalysis.js';

export interface LoweringDiagnosticsCapability {
  diagnostics: Diagnostic[];
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
}

export interface LoweringDiagnosticsWithIdCapability extends LoweringDiagnosticsCapability {
  diagAtWithId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    message: string,
  ) => void;
}

export interface LoweringDiagnosticsWithSeverityCapability extends LoweringDiagnosticsWithIdCapability {
  diagAtWithSeverityAndId: (
    diagnostics: Diagnostic[],
    span: SourceSpan,
    id: DiagnosticId,
    severity: 'warning' | 'error',
    message: string,
  ) => void;
}

export interface CompileEnvCapability {
  env: CompileEnv;
}

export interface AstCloneCapability {
  cloneImmExpr: (expr: ImmExprNode) => ImmExprNode;
  cloneEaExpr: (ea: EaExprNode) => EaExprNode;
  cloneOperand: (operand: AsmOperandNode) => AsmOperandNode;
}

export interface DottedEaNameCapability {
  flattenEaDottedName: (ea: EaExprNode) => string | undefined;
}

export interface FixedTokenNormalizationCapability {
  normalizeFixedToken: (operand: AsmOperandNode) => string | undefined;
}

export interface InverseConditionCapability {
  inverseConditionName: (name: string) => string | undefined;
}

export interface HiddenLabelCapability {
  newHiddenLabel: (prefix: string) => string;
}

export interface AsmRangeLoweringCapability {
  lowerAsmRange: (items: readonly AsmItemNode[], startIndex: number, stopKinds: Set<string>) => number;
}

export interface FlowSyncCapability {
  syncToFlow: () => void;
}

export interface OpCandidateResolverCapability {
  resolveOpCandidates: (name: string, file: string) => OpDeclNode[] | undefined;
}

export interface OpOperandFormattingCapability {
  formatAsmOperandForOpDiag: (operand: AsmOperandNode) => string;
}

export interface OpOverloadSelectionCapability {
  selectOpOverload: (overloads: OpDeclNode[], operands: AsmOperandNode[]) => OpOverloadSelection;
}

export interface OpStackSummaryCapability {
  summarizeOpStackEffect: (opDecl: OpDeclNode) => OpStackSummary;
}
