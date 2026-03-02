import { DiagnosticIds } from '../diagnostics/types.js';
import type { Diagnostic, DiagnosticId } from '../diagnostics/types.js';
import type { SourceSpan } from '../frontend/ast.js';

export function diag(diagnostics: Diagnostic[], file: string, message: string): void {
  diagnostics.push({ id: DiagnosticIds.EmitError, severity: 'error', message, file });
}

export function diagAt(diagnostics: Diagnostic[], span: SourceSpan, message: string): void {
  diagnostics.push({
    id: DiagnosticIds.EmitError,
    severity: 'error',
    message,
    file: span.file,
    line: span.start.line,
    column: span.start.column,
  });
}

export function diagAtWithId(
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

export function diagAtWithSeverityAndId(
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

export function warnAt(diagnostics: Diagnostic[], span: SourceSpan, message: string): void {
  diagnostics.push({
    id: DiagnosticIds.EmitError,
    severity: 'warning',
    message,
    file: span.file,
    line: span.start.line,
    column: span.start.column,
  });
}
