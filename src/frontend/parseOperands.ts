import type {
  AsmInstructionNode,
  AsmOperandNode,
  EaExprNode,
  EaIndexNode,
  SourceSpan,
} from './ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import {
  immLiteral,
  parseImmExprFromText,
  parseNumberLiteral,
  parseTypeExprFromText,
} from './parseImm.js';
import { parseDiag as diag, parseDiagAtWithId } from './parseDiagnostics.js';
import { ALL_REGISTER_NAMES, INDEX_REG16_NAMES, INDEX_REG8_NAMES } from './grammarData.js';

const ASSIGNMENT_REGISTER_NAMES = new Set<string>([
  'A',
  'B',
  'C',
  'D',
  'E',
  'H',
  'L',
  'IXH',
  'IXL',
  'IYH',
  'IYL',
  'BC',
  'DE',
  'HL',
  'IX',
  'IY',
]);

function parseBalancedContent(
  text: string,
  open: '[' | '(',
  close: ']' | ')',
): { inside: string; rest: string } | undefined {
  if (!text.startsWith(open)) return undefined;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === open) {
      depth++;
      continue;
    }
    if (ch !== close) continue;
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

function parseBalancedBracketContent(text: string): { inside: string; rest: string } | undefined {
  return parseBalancedContent(text, '[', ']');
}

function parseBalancedParenContent(text: string): { inside: string; rest: string } | undefined {
  return parseBalancedContent(text, '(', ')');
}

export function canonicalRegisterToken(token: string): string {
  if (/^af'$/i.test(token)) return "AF'";
  return token.toUpperCase();
}

type ParsedEaSegments = {
  expr: EaExprNode;
  rest: string;
  sawSegment: boolean;
};

function parseEaSegments(
  filePath: string,
  expr: EaExprNode,
  initialRest: string,
  exprSpan: SourceSpan,
  diagnostics: Diagnostic[],
): ParsedEaSegments | undefined {
  let rest = initialRest.trimStart();
  let sawSegment = false;

  while (rest.length > 0) {
    if (rest.startsWith('.')) {
      const m = /^\.([A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
      if (!m) return undefined;
      expr = { kind: 'EaField', span: exprSpan, base: expr, field: m[1]! };
      rest = rest.slice(m[0].length).trimStart();
      sawSegment = true;
      continue;
    }
    if (rest.startsWith('[')) {
      const bracket = parseBalancedBracketContent(rest);
      if (!bracket) return undefined;
      const index = parseEaIndexFromText(filePath, bracket.inside, exprSpan, diagnostics);
      if (!index) return undefined;
      expr = { kind: 'EaIndex', span: exprSpan, base: expr, index };
      rest = bracket.rest.trimStart();
      sawSegment = true;
      continue;
    }
    break;
  }

  return { expr, rest, sawSegment };
}

function parseTypedReinterpretBaseAtom(
  text: string,
  exprSpan: SourceSpan,
): { base: EaExprNode; rest: string } | undefined {
  const regMatch = /^(HL|DE|BC|IX|IY)(?=$|[^A-Za-z0-9_'])/i.exec(text);
  if (regMatch) {
    return {
      base: { kind: 'EaName', span: exprSpan, name: canonicalRegisterToken(regMatch[1]!) },
      rest: text.slice(regMatch[0].length).trimStart(),
    };
  }

  const nameMatch = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
  if (!nameMatch) return undefined;
  if (ALL_REGISTER_NAMES.has(canonicalRegisterToken(nameMatch[1]!))) return undefined;
  return {
    base: { kind: 'EaName', span: exprSpan, name: nameMatch[1]! },
    rest: text.slice(nameMatch[0].length).trimStart(),
  };
}

function parseTypedReinterpretBase(
  filePath: string,
  text: string,
  exprSpan: SourceSpan,
  diagnostics: Diagnostic[],
): { base: EaExprNode; rest: string } | undefined {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('(')) {
    return parseTypedReinterpretBaseAtom(trimmed, exprSpan);
  }

  const grouped = parseBalancedParenContent(trimmed);
  if (!grouped) return undefined;
  const inner = grouped.inside.trim();
  const atom = parseTypedReinterpretBaseAtom(inner, exprSpan);
  if (!atom) return undefined;
  const opMatch = /^([+-])\s*(.+)$/.exec(atom.rest);
  if (!opMatch) return undefined;
  const offset = parseImmExprFromText(filePath, opMatch[2]!, exprSpan, diagnostics, false);
  if (!offset) return undefined;

  return {
    base:
      opMatch[1] === '+'
        ? { kind: 'EaAdd', span: exprSpan, base: atom.base, offset }
        : { kind: 'EaSub', span: exprSpan, base: atom.base, offset },
    rest: grouped.rest.trimStart(),
  };
}

function parseTypedReinterpretHead(
  filePath: string,
  text: string,
  exprSpan: SourceSpan,
  diagnostics: Diagnostic[],
): { expr: EaExprNode; rest: string } | undefined {
  if (!text.startsWith('<')) return undefined;
  const closeIndex = text.indexOf('>');
  if (closeIndex <= 1) return undefined;

  const typeText = text.slice(1, closeIndex).trim();
  const typeExpr = parseTypeExprFromText(typeText, exprSpan, {
    allowInferredArrayLength: false,
  });
  if (!typeExpr) return undefined;

  const parsedBase = parseTypedReinterpretBase(
    filePath,
    text.slice(closeIndex + 1),
    exprSpan,
    diagnostics,
  );
  if (!parsedBase) return undefined;

  const segments = parseEaSegments(
    filePath,
    { kind: 'EaReinterpret', span: exprSpan, typeExpr, base: parsedBase.base },
    parsedBase.rest,
    exprSpan,
    diagnostics,
  );
  if (!segments || !segments.sawSegment) return undefined;
  return { expr: segments.expr, rest: segments.rest };
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
        parseDiagAtWithId(
          diagnostics,
          indexSpan.file,
          DiagnosticIds.IndexParenRedundant,
          'warning',
          `Redundant outer parentheses in constant index expression "${t}".`,
          { line: indexSpan.start.line, column: indexSpan.start.column },
        );
      }
    }
  }
  if (/^(HL|DE|BC)$/i.test(t)) {
    const reg = canonicalRegisterToken(t);
    if (INDEX_REG16_NAMES.has(reg)) return { kind: 'IndexReg16', span: indexSpan, reg };
  }
  {
    const reg = canonicalRegisterToken(t);
    if (INDEX_REG8_NAMES.has(reg)) return { kind: 'IndexReg8', span: indexSpan, reg };
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
  let expr: EaExprNode;

  const reinterpret = parseTypedReinterpretHead(filePath, rest, exprSpan, diagnostics);
  if (reinterpret) {
    expr = reinterpret.expr;
    rest = reinterpret.rest;
  } else {
    const baseMatch = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
    if (!baseMatch) return undefined;
    expr = { kind: 'EaName', span: exprSpan, name: baseMatch[1]! };
    rest = rest.slice(baseMatch[0].length).trimStart();

    const segments = parseEaSegments(filePath, expr, rest, exprSpan, diagnostics);
    if (!segments) return undefined;
    expr = segments.expr;
    rest = segments.rest;
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

  const canonicalRegister = canonicalRegisterToken(t);
  if (ALL_REGISTER_NAMES.has(canonicalRegister)) {
    return { kind: 'Reg', span: operandSpan, name: canonicalRegister };
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
  if (trimmed.includes(':=')) {
    return parseAssignmentInstruction(filePath, trimmed, instrSpan, diagnostics);
  }
  const firstSpace = trimmed.search(/\s/);
  const head = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const headLower = head.toLowerCase();
  const rest = firstSpace === -1 ? '' : trimmed.slice(firstSpace).trim();

  if (headLower === 'move') {
    diag(diagnostics, filePath, `"move" has been removed; use ":=".`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }

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

  if (operands.some((op) => op.kind === 'Ea' && op.explicitAddressOf)) {
    diag(diagnostics, filePath, `"@<path>" is only supported with ":=" in this phase.`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
  }

  return { kind: 'AsmInstruction', span: instrSpan, head: headLower, operands };
}

function parseAssignmentInstruction(
  filePath: string,
  text: string,
  instrSpan: SourceSpan,
  diagnostics: Diagnostic[],
): AsmInstructionNode | undefined {
  const assignIndex = text.indexOf(':=');
  const leftText = assignIndex === -1 ? '' : text.slice(0, assignIndex).trim();
  const rightText = assignIndex === -1 ? '' : text.slice(assignIndex + 2).trim();
  if (assignIndex === -1 || leftText.length === 0 || rightText.length === 0 || rightText.includes(':=')) {
    diag(diagnostics, filePath, `":=" expects exactly one target and one source operand`, {
      line: instrSpan.start.line,
      column: instrSpan.start.column,
    });
    return undefined;
  }

  const target = parseAssignmentTarget(filePath, leftText, instrSpan, diagnostics);
  const source = parseAssignmentSource(filePath, rightText, instrSpan, diagnostics);
  if (!target || !source) return undefined;

  if (target.kind === 'Ea') {
    if (source.kind !== 'Reg' && source.kind !== 'Ea') {
      diag(diagnostics, filePath, `":=" storage targets require an assignment-register or path source`, {
        line: instrSpan.start.line,
        column: instrSpan.start.column,
      });
      return undefined;
    }
    if (source.kind === 'Ea' && !source.explicitAddressOf && !isAssignmentStoragePath(source.expr)) {
      diag(diagnostics, filePath, `":=" storage source must be a storage path, not an affine address expression`, {
        line: instrSpan.start.line,
        column: instrSpan.start.column,
      });
      return undefined;
    }
    return { kind: 'AsmInstruction', span: instrSpan, head: ':=', operands: [target, source] };
  }

  if (source.kind === 'Ea' || source.kind === 'Imm' || source.kind === 'Reg') {
    return { kind: 'AsmInstruction', span: instrSpan, head: ':=', operands: [target, source] };
  }

  diag(diagnostics, filePath, `Invalid ":=" source operand "${rightText}"`, {
    line: instrSpan.start.line,
    column: instrSpan.start.column,
  });
  return undefined;
}

function parseAssignmentTarget(
  filePath: string,
  operandText: string,
  operandSpan: SourceSpan,
  diagnostics: Diagnostic[],
): AsmOperandNode | undefined {
  const t = operandText.trim();
  if (t.length === 0) return undefined;

  const canonicalRegister = canonicalRegisterToken(t);
  if (ASSIGNMENT_REGISTER_NAMES.has(canonicalRegister)) {
    return { kind: 'Reg', span: operandSpan, name: canonicalRegister };
  }
  if (ALL_REGISTER_NAMES.has(canonicalRegister)) {
    diag(diagnostics, filePath, `":=" only supports assignment-register destinations in this slice`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
    return undefined;
  }
  if (t.startsWith('(') && t.endsWith(')')) {
    diag(diagnostics, filePath, `":=" does not accept indirect memory operands`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
    return undefined;
  }
  if (t.startsWith('@')) {
    diag(diagnostics, filePath, `":=" does not accept address-of operands in this slice`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
    return undefined;
  }

  const ea = parseEaExprFromText(filePath, t, operandSpan, diagnostics);
  if (ea) {
    if (!isAssignmentStoragePath(ea)) {
      diag(diagnostics, filePath, `":=" target must be a storage path, not an affine address expression`, {
        line: operandSpan.start.line,
        column: operandSpan.start.column,
      });
      return undefined;
    }
    return { kind: 'Ea', span: operandSpan, expr: ea };
  }

  diag(diagnostics, filePath, `Invalid ":=" target operand "${t}"`, {
    line: operandSpan.start.line,
    column: operandSpan.start.column,
  });
  return undefined;
}

function parseAssignmentSource(
  filePath: string,
  operandText: string,
  operandSpan: SourceSpan,
  diagnostics: Diagnostic[],
): AsmOperandNode | undefined {
  const t = operandText.trim();
  if (t.length === 0) return undefined;

  if (t.startsWith('@')) {
    if (t.startsWith('@@') || t.startsWith('@(')) {
      diag(diagnostics, filePath, `":=" does not accept nested or grouped address-of forms`, {
        line: operandSpan.start.line,
        column: operandSpan.start.column,
      });
      return undefined;
    }
    const eaText = t.slice(1).trim();
    const ea = parseEaExprFromText(filePath, eaText, operandSpan, diagnostics);
    if (ea) {
      if (!isAssignmentStoragePath(ea)) {
        diag(diagnostics, filePath, `":=" address-of form must be "@<path>" with a storage path.`, {
          line: operandSpan.start.line,
          column: operandSpan.start.column,
        });
        return undefined;
      }
      return { kind: 'Ea', span: operandSpan, expr: ea, explicitAddressOf: true };
    }
    diag(diagnostics, filePath, `":=" address-of form must be "@<path>" with a storage path.`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
    return undefined;
  }

  const canonicalRegister = canonicalRegisterToken(t);
  if (ASSIGNMENT_REGISTER_NAMES.has(canonicalRegister)) {
    return { kind: 'Reg', span: operandSpan, name: canonicalRegister };
  }
  if (ALL_REGISTER_NAMES.has(canonicalRegister)) {
    diag(diagnostics, filePath, `":=" only supports assignment-register sources in this slice`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
    return undefined;
  }
  if (t.startsWith('(') && t.endsWith(')')) {
    diag(diagnostics, filePath, `":=" does not accept indirect memory operands`, {
      line: operandSpan.start.line,
      column: operandSpan.start.column,
    });
    return undefined;
  }

  const ea = parseEaExprFromText(filePath, t, operandSpan, diagnostics);
  if (ea) return { kind: 'Ea', span: operandSpan, expr: ea };

  const expr = parseAssignmentImmediateExpr(filePath, t, operandSpan, diagnostics);
  if (expr) return { kind: 'Imm', span: operandSpan, expr };

  diag(diagnostics, filePath, `Invalid ":=" source operand "${t}"`, {
    line: operandSpan.start.line,
    column: operandSpan.start.column,
  });
  return undefined;
}

function parseAssignmentImmediateExpr(
  filePath: string,
  operandText: string,
  operandSpan: SourceSpan,
  diagnostics: Diagnostic[],
) {
  const t = operandText.trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*(?:\s*[+-].*)?$/.test(t)) return undefined;
  return parseImmExprFromText(filePath, t, operandSpan, diagnostics, false);
}

function isAssignmentStoragePath(ea: EaExprNode): boolean {
  switch (ea.kind) {
    case 'EaName':
      return true;
    case 'EaReinterpret':
      return isAssignmentStoragePath(ea.base);
    case 'EaField':
      return isAssignmentStoragePath(ea.base);
    case 'EaIndex':
      return isAssignmentStoragePath(ea.base);
    case 'EaAdd':
    case 'EaSub':
      return false;
  }
}
