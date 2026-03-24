import type { AsmInstructionNode, SourceSpan } from './ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { parseDiag as diag } from './parseDiagnostics.js';
import { ALL_REGISTER_NAMES } from './grammarData.js';
import { isAssignmentStoragePath } from './parseAssignmentInstruction.js';
import { canonicalRegisterToken, parseEaExprFromText } from './parseOperands.js';

export function parseSuccPredInstruction(
  filePath: string,
  head: 'succ' | 'pred',
  operandText: string,
  instrSpan: SourceSpan,
  diagnostics: Diagnostic[],
): AsmInstructionNode | undefined {
  const text = operandText.trim();
  if (text.length === 0 || text.includes(',')) {
    diag(diagnostics, filePath, `"${head}" expects exactly one typed path operand`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }

  const canonicalRegister = canonicalRegisterToken(text);
  if (ALL_REGISTER_NAMES.has(canonicalRegister)) {
    diag(diagnostics, filePath, `"${head}" only accepts typed path operands in this slice`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }
  if (text.startsWith('(') && text.endsWith(')')) {
    diag(diagnostics, filePath, `"${head}" does not accept indirect memory operands`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }
  if (text.startsWith('@')) {
    diag(diagnostics, filePath, `"${head}" does not accept address-of operands`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }

  const ea = parseEaExprFromText(filePath, text, instrSpan, diagnostics);
  if (!ea) {
    diag(diagnostics, filePath, `Invalid "${head}" operand "${text}"`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }
  if (!isAssignmentStoragePath(ea)) {
    diag(diagnostics, filePath, `"${head}" requires a typed storage path, not an affine address expression`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }

  return {
    kind: 'AsmInstruction',
    span: instrSpan,
    head,
    operands: [{ kind: 'Ea', span: instrSpan, expr: ea }],
  };
}