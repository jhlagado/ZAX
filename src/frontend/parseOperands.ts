import type {
  AsmInstructionNode,
  AsmOperandNode,
  EaExprNode,
  EaIndexNode,
  SourceSpan,
} from './ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import { immLiteral, parseImmExprFromText, parseNumberLiteral } from './parseImm.js';

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

function parseBalancedBracketContent(text: string): { inside: string; rest: string } | undefined {
  if (!text.startsWith('[')) return undefined;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '[') {
      depth++;
      continue;
    }
    if (ch !== ']') continue;
    depth--;
    if (depth === 0) {
      return {
        inside: text.slice(1, i),
        rest: text.slice(i + 1),
      };
    }
    if (depth < 0) return undefined;
  }
  return undefined;
}

export function canonicalRegisterToken(token: string): string {
  if (/^af'$/i.test(token)) return "AF'";
  return token.toUpperCase();
}

export function parseEaIndexFromText(
  filePath: string,
  indexText: string,
  indexSpan: SourceSpan,
  diagnostics: Diagnostic[],
): EaIndexNode | undefined {
  const t = indexText.trim();
  if (t.startsWith('(') && t.endsWith(')')) {
    const inner = t.slice(1, -1).trim();
    if (/^HL$/i.test(inner)) return { kind: 'IndexMemHL', span: indexSpan };
    const ixiy = /^(IX|IY)(?:\s*([+-])\s*(.+))?$/i.exec(inner);
    if (ixiy) {
      const base = ixiy[1]!.toUpperCase() as 'IX' | 'IY';
      const dispText = ixiy[2] ? `${ixiy[2]}${ixiy[3]?.trim() ?? ''}` : '';
      const disp =
        dispText.length > 0
          ? parseImmExprFromText(filePath, dispText, indexSpan, diagnostics, false)
          : undefined;
      if (dispText.length > 0 && !disp) {
        diag(diagnostics, filePath, `Invalid index expression: ${t}`, {
          line: indexSpan.start.line,
          column: indexSpan.start.column,
        });
        return undefined;
      }
      return { kind: 'IndexMemIxIy', span: indexSpan, base, ...(disp ? { disp } : {}) };
    }
    if (!/[A-Za-z_]/.test(inner)) {
      const grouped = parseImmExprFromText(filePath, inner, indexSpan, diagnostics, false);
      if (grouped) {
        diagnostics.push({
          id: DiagnosticIds.IndexParenRedundant,
          severity: 'warning',
          message: `Redundant outer parentheses in constant index expression "${t}".`,
          file: indexSpan.file,
          line: indexSpan.start.line,
          column: indexSpan.start.column,
        });
      }
    }
  }
  if (/^(HL|DE|BC)$/i.test(t)) {
    return { kind: 'IndexReg16', span: indexSpan, reg: canonicalRegisterToken(t) };
  }
  if (/^(A|B|C|D|E|H|L)$/i.test(t)) {
    return { kind: 'IndexReg8', span: indexSpan, reg: canonicalRegisterToken(t) };
  }

  const imm = parseImmExprFromText(filePath, t, indexSpan, diagnostics, false);
  if (imm) return { kind: 'IndexImm', span: indexSpan, value: imm };

  const ea = parseEaExprFromText(filePath, t, indexSpan, diagnostics);
  if (ea) return { kind: 'IndexEa', span: indexSpan, expr: ea };

  diag(diagnostics, filePath, `Invalid index expression: ${t}`, {
    line: indexSpan.start.line,
    column: indexSpan.start.column,
  });
  return undefined;
}

export function parseEaExprFromText(
  filePath: string,
  exprText: string,
  exprSpan: SourceSpan,
  diagnostics: Diagnostic[],
): EaExprNode | undefined {
  let rest = exprText.trim();
  const baseMatch = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
  if (!baseMatch) return undefined;
  let expr: EaExprNode = { kind: 'EaName', span: exprSpan, name: baseMatch[1]! };
  rest = rest.slice(baseMatch[0].length).trimStart();

  while (rest.length > 0) {
    if (rest.startsWith('.')) {
      const m = /^\.([A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
      if (!m) return undefined;
      expr = { kind: 'EaField', span: exprSpan, base: expr, field: m[1]! };
      rest = rest.slice(m[0].length).trimStart();
      continue;
    }
    if (rest.startsWith('[')) {
      const bracket = parseBalancedBracketContent(rest);
      if (!bracket) return undefined;
      const index = parseEaIndexFromText(filePath, bracket.inside, exprSpan, diagnostics);
      if (!index) return undefined;
      expr = { kind: 'EaIndex', span: exprSpan, base: expr, index };
      rest = bracket.rest.trimStart();
      continue;
    }
    break;
  }

  if (rest.length > 0) {
    const m = /^([+-])\s*(.+)$/.exec(rest);
    if (!m) return undefined;
    const off = parseImmExprFromText(filePath, m[2]!, exprSpan, diagnostics);
    if (!off) return undefined;
    expr =
      m[1] === '+'
        ? { kind: 'EaAdd', span: exprSpan, base: expr, offset: off }
        : { kind: 'EaSub', span: exprSpan, base: expr, offset: off };
    rest = '';
  }

  return rest.length === 0 ? expr : undefined;
}

export function parseAsmOperand(
  filePath: string,
  operandText: string,
  operandSpan: SourceSpan,
  diagnostics: Diagnostic[],
  emitDiagnostics = true,
): AsmOperandNode | undefined {
  const t = operandText.trim();
  if (t.length === 0) return undefined;

  if (t.startsWith('@')) {
    const placeText = t.slice(1).trim();
    if (placeText.length === 0) {
      diag(diagnostics, filePath, `Invalid address-of target "${t}": expected @<place>.`, {
        line: operandSpan.start.line,
        column: operandSpan.start.column,
      });
      return undefined;
    }
    const ea = parseEaExprFromText(filePath, placeText, operandSpan, diagnostics);
    if (ea) return { kind: 'Ea', span: operandSpan, expr: ea, explicitAddressOf: true };
    diag(diagnostics, filePath, `Invalid address-of target "${t}": expected @<place>.`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
    return undefined;
  }

  if (/^(A|B|C|D|E|H|L|IXH|IXL|IYH|IYL|HL|DE|BC|SP|IX|IY|AF|AF'|I|R)$/i.test(t)) {
    return { kind: 'Reg', span: operandSpan, name: canonicalRegisterToken(t) };
  }

  const n = parseNumberLiteral(t);
  if (n !== undefined) {
    return { kind: 'Imm', span: operandSpan, expr: immLiteral(filePath, operandSpan, n) };
  }

  if (t.startsWith('(') && t.endsWith(')')) {
    const inner = t.slice(1, -1).trim();
    const ea = parseEaExprFromText(filePath, inner, operandSpan, diagnostics);
    if (ea) return { kind: 'Mem', span: operandSpan, expr: ea };
  }
  if (t.includes('.') || t.includes('[')) {
    const ea = parseEaExprFromText(filePath, t, operandSpan, diagnostics);
    if (ea) return { kind: 'Ea', span: operandSpan, expr: ea };
  }

  const expr = parseImmExprFromText(filePath, t, operandSpan, diagnostics, emitDiagnostics);
  if (expr) {
    return { kind: 'Imm', span: operandSpan, expr };
  }
  if (t.startsWith("'")) return undefined;

  if (emitDiagnostics) {
    diag(diagnostics, filePath, `Unsupported operand: ${t}`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
  }
  return undefined;
}

export function parseAsmInstruction(
  filePath: string,
  text: string,
  instrSpan: SourceSpan,
  diagnostics: Diagnostic[],
): AsmInstructionNode | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const firstSpace = trimmed.search(/\s/);
  const head = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const headLower = head.toLowerCase();
  const rest = firstSpace === -1 ? '' : trimmed.slice(firstSpace).trim();

  const operands: AsmOperandNode[] = [];
  if (rest.length > 0) {
    const parseInOutOperand = (operandText: string): AsmOperandNode | undefined => {
      const t = operandText.trim();
      if (t.startsWith('(') && t.endsWith(')')) {
        const inner = t.slice(1, -1).trim();
        if (/^c$/i.test(inner)) return { kind: 'PortC', span: instrSpan };
        const expr = parseImmExprFromText(filePath, inner, instrSpan, diagnostics);
        if (expr) return { kind: 'PortImm8', span: instrSpan, expr };
      }
      return parseAsmOperand(filePath, t, instrSpan, diagnostics);
    };

    const parts = rest.split(',').map((p) => p.trim());
    for (const part of parts) {
      const opNode =
        headLower === 'in' || headLower === 'out'
          ? parseInOutOperand(part)
          : parseAsmOperand(filePath, part, instrSpan, diagnostics);
      if (opNode) operands.push(opNode);
    }
  }

  return { kind: 'AsmInstruction', span: instrSpan, head: headLower, operands };
}
