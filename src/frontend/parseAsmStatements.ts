import type { AsmItemNode, ImmExprNode, SourceSpan } from './ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import { immLiteral, parseImmExprFromText } from './parseImm.js';
import { parseAsmInstruction, parseAsmOperand } from './parseOperands.js';

function diag(
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

function canonicalConditionToken(token: string): string {
  return token.toLowerCase();
}

export type AsmControlFrame =
  | { kind: 'If'; elseSeen: boolean; openSpan: SourceSpan; recoverOnly?: boolean }
  | { kind: 'While'; openSpan: SourceSpan; recoverOnly?: boolean }
  | { kind: 'Repeat'; openSpan: SourceSpan }
  | {
      kind: 'Select';
      elseSeen: boolean;
      armSeen: boolean;
      openSpan: SourceSpan;
      recoverOnly?: boolean;
    };

export function isRecoverOnlyControlFrame(frame: AsmControlFrame): boolean {
  return (
    (frame.kind === 'If' || frame.kind === 'While' || frame.kind === 'Select') &&
    frame.recoverOnly === true
  );
}

export type ParsedAsmStatement = AsmItemNode | AsmItemNode[] | undefined;

export function appendParsedAsmStatement(out: AsmItemNode[], parsed: ParsedAsmStatement): void {
  if (!parsed) return;
  if (Array.isArray(parsed)) {
    out.push(...parsed);
    return;
  }
  out.push(parsed);
}

function parseCaseValuesFromText(
  filePath: string,
  caseText: string,
  stmtSpan: SourceSpan,
  diagnostics: Diagnostic[],
): ImmExprNode[] | undefined {
  const parts: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inChar = false;
  let escaped = false;

  for (let i = 0; i < caseText.length; i++) {
    const ch = caseText[i]!;
    if (inChar) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === "'") {
        inChar = false;
      }
      continue;
    }
    if (ch === "'") {
      inChar = true;
      continue;
    }
    if (ch === '(') {
      parenDepth++;
      continue;
    }
    if (ch === ')') {
      if (parenDepth > 0) parenDepth--;
      continue;
    }
    if (ch === '[') {
      bracketDepth++;
      continue;
    }
    if (ch === ']') {
      if (bracketDepth > 0) bracketDepth--;
      continue;
    }
    if (ch === '{') {
      braceDepth++;
      continue;
    }
    if (ch === '}') {
      if (braceDepth > 0) braceDepth--;
      continue;
    }
    if (ch === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      parts.push(caseText.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(caseText.slice(start));

  const values: ImmExprNode[] = [];
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.length === 0) return undefined;
    const value = parseImmExprFromText(filePath, part, stmtSpan, diagnostics, false);
    if (!value) return undefined;
    values.push(value);
  }
  return values.length > 0 ? values : undefined;
}

export function parseAsmStatement(
  filePath: string,
  text: string,
  stmtSpan: SourceSpan,
  diagnostics: Diagnostic[],
  controlStack: AsmControlFrame[],
): ParsedAsmStatement {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const hasKeyword = (kw: string): boolean => new RegExp(`^${kw}\\b`, 'i').test(trimmed);

  const missingCc = '__missing__';

  if (lower === 'repeat') {
    controlStack.push({ kind: 'Repeat', openSpan: stmtSpan });
    return { kind: 'Repeat', span: stmtSpan };
  }
  if (hasKeyword('repeat')) {
    diag(diagnostics, filePath, `"repeat" does not take operands`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

  if (lower === 'else') {
    const top = controlStack[controlStack.length - 1];
    if (top?.kind === 'Select') {
      if (top.elseSeen) {
        diag(diagnostics, filePath, `"else" duplicated in select`, {
          line: stmtSpan.start.line,
          column: stmtSpan.start.column,
        });
        return undefined;
      }
      top.elseSeen = true;
      top.armSeen = true;
      return { kind: 'SelectElse', span: stmtSpan };
    }
    if (top?.kind !== 'If') {
      diag(diagnostics, filePath, `"else" without matching "if" or "select"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    if (top.elseSeen) {
      diag(diagnostics, filePath, `"else" duplicated in if`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    top.elseSeen = true;
    return { kind: 'Else', span: stmtSpan };
  }
  if (hasKeyword('else')) {
    diag(diagnostics, filePath, `"else" does not take operands`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

  if (lower === 'end') {
    const top = controlStack.pop();
    if (!top) {
      diag(diagnostics, filePath, `Unexpected "end" in asm block`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    if (top.kind === 'Repeat') {
      diag(diagnostics, filePath, `"repeat" blocks must close with "until <cc>"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    if (top.kind === 'Select' && !top.armSeen && !top.recoverOnly) {
      diag(diagnostics, filePath, `"select" must contain at least one arm ("case" or "else")`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    return { kind: 'End', span: stmtSpan };
  }
  if (hasKeyword('end')) {
    diag(diagnostics, filePath, `"end" does not take operands`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

  const ifMatch = /^if\s+([A-Za-z][A-Za-z0-9]*)$/i.exec(trimmed);
  if (ifMatch) {
    const cc = canonicalConditionToken(ifMatch[1]!);
    controlStack.push({ kind: 'If', elseSeen: false, openSpan: stmtSpan });
    return { kind: 'If', span: stmtSpan, cc };
  }
  if (lower === 'if') {
    diag(diagnostics, filePath, `"if" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'If', elseSeen: false, openSpan: stmtSpan });
    return { kind: 'If', span: stmtSpan, cc: missingCc };
  }
  if (hasKeyword('if')) {
    diag(diagnostics, filePath, `"if" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'If', elseSeen: false, openSpan: stmtSpan, recoverOnly: true });
    return { kind: 'If', span: stmtSpan, cc: missingCc };
  }

  const whileMatch = /^while\s+([A-Za-z][A-Za-z0-9]*)$/i.exec(trimmed);
  if (whileMatch) {
    const cc = canonicalConditionToken(whileMatch[1]!);
    controlStack.push({ kind: 'While', openSpan: stmtSpan });
    return { kind: 'While', span: stmtSpan, cc };
  }
  if (lower === 'while') {
    diag(diagnostics, filePath, `"while" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'While', openSpan: stmtSpan });
    return { kind: 'While', span: stmtSpan, cc: missingCc };
  }
  if (hasKeyword('while')) {
    diag(diagnostics, filePath, `"while" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'While', openSpan: stmtSpan, recoverOnly: true });
    return { kind: 'While', span: stmtSpan, cc: missingCc };
  }

  if (lower === 'until') {
    const top = controlStack[controlStack.length - 1];
    if (top?.kind !== 'Repeat') {
      diag(diagnostics, filePath, `"until" without matching "repeat"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    diag(diagnostics, filePath, `"until" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.pop();
    return { kind: 'Until', span: stmtSpan, cc: missingCc };
  }
  const untilMatch = /^until\s+([A-Za-z][A-Za-z0-9]*)$/i.exec(trimmed);
  if (untilMatch) {
    const cc = canonicalConditionToken(untilMatch[1]!);
    const top = controlStack[controlStack.length - 1];
    if (top?.kind !== 'Repeat') {
      diag(diagnostics, filePath, `"until" without matching "repeat"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    controlStack.pop();
    return { kind: 'Until', span: stmtSpan, cc };
  }
  if (hasKeyword('until')) {
    const top = controlStack[controlStack.length - 1];
    if (top?.kind !== 'Repeat') {
      diag(diagnostics, filePath, `"until" without matching "repeat"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    diag(diagnostics, filePath, `"until" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.pop();
    return { kind: 'Until', span: stmtSpan, cc: missingCc };
  }

  if (lower === 'select') {
    diag(diagnostics, filePath, `"select" expects a selector`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'Select', elseSeen: false, armSeen: false, openSpan: stmtSpan });
    return {
      kind: 'Select',
      span: stmtSpan,
      selector: { kind: 'Imm', span: stmtSpan, expr: immLiteral(filePath, stmtSpan, 0) },
    };
  }
  const selectMatch = /^select\s+(.+)$/i.exec(trimmed);
  if (selectMatch) {
    const selectorText = selectMatch[1]!.trim();
    const selector = parseAsmOperand(filePath, selectorText, stmtSpan, diagnostics, false);
    if (!selector) {
      diag(diagnostics, filePath, `Invalid select selector`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      controlStack.push({
        kind: 'Select',
        elseSeen: false,
        armSeen: false,
        openSpan: stmtSpan,
        recoverOnly: true,
      });
      return {
        kind: 'Select',
        span: stmtSpan,
        selector: { kind: 'Imm', span: stmtSpan, expr: immLiteral(filePath, stmtSpan, 0) },
      };
    }
    controlStack.push({ kind: 'Select', elseSeen: false, armSeen: false, openSpan: stmtSpan });
    return { kind: 'Select', span: stmtSpan, selector };
  }
  if (hasKeyword('select')) {
    diag(diagnostics, filePath, `Invalid select selector`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({
      kind: 'Select',
      elseSeen: false,
      armSeen: false,
      openSpan: stmtSpan,
      recoverOnly: true,
    });
    return {
      kind: 'Select',
      span: stmtSpan,
      selector: { kind: 'Imm', span: stmtSpan, expr: immLiteral(filePath, stmtSpan, 0) },
    };
  }

  const caseMatch = /^case\s+(.+)$/i.exec(trimmed);
  if (caseMatch) {
    const top = controlStack[controlStack.length - 1];
    if (top?.kind !== 'Select') {
      diag(diagnostics, filePath, `"case" without matching "select"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    if (top.elseSeen) {
      diag(diagnostics, filePath, `"case" after "else" in select`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    top.armSeen = true;
    const exprText = caseMatch[1]!.trim();
    const values = parseCaseValuesFromText(filePath, exprText, stmtSpan, diagnostics);
    if (!values) {
      diag(diagnostics, filePath, `Invalid case value`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    return values.map((value) => ({ kind: 'Case', span: stmtSpan, value }));
  }
  if (lower === 'case') {
    const top = controlStack[controlStack.length - 1];
    if (top?.kind !== 'Select') {
      diag(diagnostics, filePath, `"case" without matching "select"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    if (top.elseSeen) {
      diag(diagnostics, filePath, `"case" after "else" in select`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    top.armSeen = true;
    diag(diagnostics, filePath, `"case" expects a value`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }
  if (hasKeyword('case')) {
    const top = controlStack[controlStack.length - 1];
    if (top?.kind !== 'Select') {
      diag(diagnostics, filePath, `"case" without matching "select"`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    if (top.elseSeen) {
      diag(diagnostics, filePath, `"case" after "else" in select`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    top.armSeen = true;
    diag(diagnostics, filePath, `Invalid case value`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

  return parseAsmInstruction(filePath, trimmed, stmtSpan, diagnostics);
}
