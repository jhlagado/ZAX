import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';

const RESERVED_TOP_LEVEL_KEYWORDS = new Set([
  'func',
  'const',
  'enum',
  'data',
  'import',
  'type',
  'union',
  'globals',
  'var',
  'extern',
  'bin',
  'hex',
  'op',
  'section',
  'align',
]);

export function isReservedTopLevelDeclName(name: string): boolean {
  return RESERVED_TOP_LEVEL_KEYWORDS.has(name.toLowerCase());
}

export function pushParseError(
  diagnostics: Diagnostic[],
  file: string,
  message: string,
  where?: { line: number; column: number },
): void {
  diagnostics.push({
    id: DiagnosticIds.ParseError,
    severity: 'error',
    message,
    file,
    ...(where ? { line: where.line, column: where.column } : {}),
  });
}

export function stripLineComment(line: string): string {
  const semi = line.indexOf(';');
  return semi >= 0 ? line.slice(0, semi) : line;
}
