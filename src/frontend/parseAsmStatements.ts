import type { AsmItemNode, ImmExprNode, SourceSpan } from './ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { parseDiag as diag } from './parseDiagnostics.js';
import { immLiteral, parseImmExprFromText } from './parseImm.js';
import { parseAsmInstruction, parseAsmOperand } from './parseOperands.js';
import {
  ASM_CONTROL_KEYWORDS,
  CONDITION_CODES,
  CONDITION_CODE_LIST,
} from './grammarData.js';

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
export type ParseAsmStatementOptions = {
  allowedConditionIdentifiers?: ReadonlySet<string>;
};

type ParseAsmStatementContext = {
  filePath: string;
  stmtSpan: SourceSpan;
  diagnostics: Diagnostic[];
  controlStack: AsmControlFrame[];
  options?: ParseAsmStatementOptions;
};

export function appendParsedAsmStatement(out: AsmItemNode[], parsed: ParsedAsmStatement): void {
  if (!parsed) return;
  if (Array.isArray(parsed)) {
    out.push(...parsed);
    return;
  }
  out.push(parsed);
}

function parseConditionCode(
  filePath: string,
  keyword: 'if' | 'while' | 'until',
  rawToken: string,
  stmtSpan: SourceSpan,
  diagnostics: Diagnostic[],
  options?: ParseAsmStatementOptions,
): string {
  const cc = rawToken.toLowerCase();
  if (CONDITION_CODES.has(cc)) return cc;
  if (options?.allowedConditionIdentifiers?.has(cc)) return cc;
  diag(
    diagnostics,
    filePath,
    `Invalid ${keyword} condition code "${rawToken}": expected ${CONDITION_CODE_LIST.join(', ')}.`,
    {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    },
  );
  return '__missing__';
}

function firstAsmControlKeyword(text: string): string | undefined {
  const head = text.match(/^[A-Za-z]+/)?.[0]?.toLowerCase();
  if (!head || !ASM_CONTROL_KEYWORDS.has(head)) return undefined;
  const next = text[head.length];
  return next === undefined || !/[A-Za-z0-9_]/.test(next) ? head : undefined;
}

type ParsedCaseItem = { value: ImmExprNode; end?: ImmExprNode };

function splitTopLevelCaseText(caseText: string): string[] {
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
  return parts;
}

function findTopLevelRangeSeparator(caseText: string): number | undefined {
  let rangeStart: number | undefined;
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
    if (
      ch === '.' &&
      caseText[i + 1] === '.' &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0
    ) {
      if (rangeStart !== undefined) return undefined;
      rangeStart = i;
      i++;
    }
  }

  return rangeStart;
}

function parseCaseItemFromText(
  filePath: string,
  caseText: string,
  stmtSpan: SourceSpan,
  diagnostics: Diagnostic[],
): ParsedCaseItem | undefined {
  const rangeStart = findTopLevelRangeSeparator(caseText);
  if (rangeStart === undefined) {
    const value = parseImmExprFromText(filePath, caseText, stmtSpan, diagnostics, false);
    return value ? { value } : undefined;
  }

  const startText = caseText.slice(0, rangeStart).trim();
  const endText = caseText.slice(rangeStart + 2).trim();
  if (startText.length === 0 || endText.length === 0) return undefined;
  const value = parseImmExprFromText(filePath, startText, stmtSpan, diagnostics, false);
  const end = parseImmExprFromText(filePath, endText, stmtSpan, diagnostics, false);
  if (!value || !end) return undefined;
  return { value, end };
}

function parseCaseValuesFromText(
  filePath: string,
  caseText: string,
  stmtSpan: SourceSpan,
  diagnostics: Diagnostic[],
): ParsedCaseItem[] | undefined {
  const values: ParsedCaseItem[] = [];
  for (const rawPart of splitTopLevelCaseText(caseText)) {
    const part = rawPart.trim();
    if (part.length === 0) return undefined;
    const value = parseCaseItemFromText(filePath, part, stmtSpan, diagnostics);
    if (!value) return undefined;
    values.push(value);
  }
  return values.length > 0 ? values : undefined;
}

function parseRepeatStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack } = ctx;
  if (trimmed.toLowerCase() === 'repeat') {
    controlStack.push({ kind: 'Repeat', openSpan: stmtSpan });
    return { kind: 'Repeat', span: stmtSpan };
  }
  diag(diagnostics, filePath, `"repeat" does not take operands`, {
    line: stmtSpan.start.line,
    column: stmtSpan.start.column,
  });
  return undefined;
}

function parseElseStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack } = ctx;
  if (trimmed.toLowerCase() !== 'else') {
    diag(diagnostics, filePath, `"else" does not take operands`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

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

function parseEndStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack } = ctx;
  if (trimmed.toLowerCase() !== 'end') {
    diag(diagnostics, filePath, `"end" does not take operands`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

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

function parseIfStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack, options } = ctx;
  const missingCc = '__missing__';
  const ifMatch = /^if\s+([A-Za-z][A-Za-z0-9]*)$/i.exec(trimmed);
  if (ifMatch) {
    const cc = parseConditionCode(filePath, 'if', ifMatch[1]!, stmtSpan, diagnostics, options);
    controlStack.push({ kind: 'If', elseSeen: false, openSpan: stmtSpan });
    return { kind: 'If', span: stmtSpan, cc };
  }
  if (trimmed.toLowerCase() === 'if') {
    diag(diagnostics, filePath, `"if" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'If', elseSeen: false, openSpan: stmtSpan });
    return { kind: 'If', span: stmtSpan, cc: missingCc };
  }
  diag(diagnostics, filePath, `"if" expects a condition code`, {
    line: stmtSpan.start.line,
    column: stmtSpan.start.column,
  });
  controlStack.push({ kind: 'If', elseSeen: false, openSpan: stmtSpan, recoverOnly: true });
  return { kind: 'If', span: stmtSpan, cc: missingCc };
}

function parseWhileStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack, options } = ctx;
  const missingCc = '__missing__';
  const whileMatch = /^while\s+([A-Za-z][A-Za-z0-9]*)$/i.exec(trimmed);
  if (whileMatch) {
    const cc = parseConditionCode(filePath, 'while', whileMatch[1]!, stmtSpan, diagnostics, options);
    controlStack.push({ kind: 'While', openSpan: stmtSpan });
    return { kind: 'While', span: stmtSpan, cc };
  }
  if (trimmed.toLowerCase() === 'while') {
    diag(diagnostics, filePath, `"while" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'While', openSpan: stmtSpan });
    return { kind: 'While', span: stmtSpan, cc: missingCc };
  }
  diag(diagnostics, filePath, `"while" expects a condition code`, {
    line: stmtSpan.start.line,
    column: stmtSpan.start.column,
  });
  controlStack.push({ kind: 'While', openSpan: stmtSpan, recoverOnly: true });
  return { kind: 'While', span: stmtSpan, cc: missingCc };
}

function parseUntilStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack, options } = ctx;
  const missingCc = '__missing__';
  const top = controlStack[controlStack.length - 1];
  if (top?.kind !== 'Repeat') {
    diag(diagnostics, filePath, `"until" without matching "repeat"`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

  if (trimmed.toLowerCase() === 'until') {
    diag(diagnostics, filePath, `"until" expects a condition code`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.pop();
    return { kind: 'Until', span: stmtSpan, cc: missingCc };
  }

  const untilMatch = /^until\s+([A-Za-z][A-Za-z0-9]*)$/i.exec(trimmed);
  if (untilMatch) {
    const cc = parseConditionCode(
      filePath,
      'until',
      untilMatch[1]!,
      stmtSpan,
      diagnostics,
      options,
    );
    controlStack.pop();
    return { kind: 'Until', span: stmtSpan, cc };
  }

  diag(diagnostics, filePath, `"until" expects a condition code`, {
    line: stmtSpan.start.line,
    column: stmtSpan.start.column,
  });
  controlStack.pop();
  return { kind: 'Until', span: stmtSpan, cc: missingCc };
}

function parseSelectStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack } = ctx;
  const fallbackNode = {
    kind: 'Select' as const,
    span: stmtSpan,
    selector: { kind: 'Imm' as const, span: stmtSpan, expr: immLiteral(filePath, stmtSpan, 0) },
  };

  if (trimmed.toLowerCase() === 'select') {
    diag(diagnostics, filePath, `"select" expects a selector`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    controlStack.push({ kind: 'Select', elseSeen: false, armSeen: false, openSpan: stmtSpan });
    return fallbackNode;
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
      return fallbackNode;
    }
    controlStack.push({ kind: 'Select', elseSeen: false, armSeen: false, openSpan: stmtSpan });
    return { kind: 'Select', span: stmtSpan, selector };
  }

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
  return fallbackNode;
}

function parseCaseStatement(trimmed: string, ctx: ParseAsmStatementContext): ParsedAsmStatement {
  const { filePath, stmtSpan, diagnostics, controlStack } = ctx;
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

  if (trimmed.toLowerCase() === 'case') {
    diag(diagnostics, filePath, `"case" expects a value`, {
      line: stmtSpan.start.line,
      column: stmtSpan.start.column,
    });
    return undefined;
  }

  const caseMatch = /^case\s+(.+)$/i.exec(trimmed);
  if (caseMatch) {
    const exprText = caseMatch[1]!.trim();
    const values = parseCaseValuesFromText(filePath, exprText, stmtSpan, diagnostics);
    if (!values) {
      diag(diagnostics, filePath, `Invalid case value`, {
        line: stmtSpan.start.line,
        column: stmtSpan.start.column,
      });
      return undefined;
    }
    return values.map((value) => ({ kind: 'Case', span: stmtSpan, ...value }));
  }

  diag(diagnostics, filePath, `Invalid case value`, {
    line: stmtSpan.start.line,
    column: stmtSpan.start.column,
  });
  return undefined;
}

export function parseAsmStatement(
  filePath: string,
  text: string,
  stmtSpan: SourceSpan,
  diagnostics: Diagnostic[],
  controlStack: AsmControlFrame[],
  options?: ParseAsmStatementOptions,
): ParsedAsmStatement {
  const trimmed = text.trim();
  const ctx: ParseAsmStatementContext = {
    filePath,
    stmtSpan,
    diagnostics,
    controlStack,
    ...(options ? { options } : {}),
  };
  switch (firstAsmControlKeyword(trimmed)) {
    case 'repeat':
      return parseRepeatStatement(trimmed, ctx);
    case 'else':
      return parseElseStatement(trimmed, ctx);
    case 'end':
      return parseEndStatement(trimmed, ctx);
    case 'if':
      return parseIfStatement(trimmed, ctx);
    case 'while':
      return parseWhileStatement(trimmed, ctx);
    case 'until':
      return parseUntilStatement(trimmed, ctx);
    case 'select':
      return parseSelectStatement(trimmed, ctx);
    case 'case':
      return parseCaseStatement(trimmed, ctx);
  }

  return parseAsmInstruction(filePath, trimmed, stmtSpan, diagnostics);
}
