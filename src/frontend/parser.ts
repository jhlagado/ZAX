import type {
  AlignDirectiveNode,
  ImportNode,
  AsmBlockNode,
  AsmItemNode,
  AsmLabelNode,
  BinDeclNode,
  ConstDeclNode,
  DataBlockNode,
  DataDeclNode,
  DataRecordFieldInitNode,
  EnumDeclNode,
  ExternDeclNode,
  ExternFuncNode,
  FuncDeclNode,
  HexDeclNode,
  ImmExprNode,
  ModuleFileNode,
  ModuleItemNode,
  OpDeclNode,
  OpMatcherNode,
  OpParamNode,
  OffsetofPathNode,
  ParamNode,
  ProgramNode,
  RecordFieldNode,
  SectionDirectiveNode,
  SourceSpan,
  TypeDeclNode,
  TypeExprNode,
  VarBlockNode,
  VarDeclNode,
  VarDeclInitializerNode,
} from './ast.js';
import { makeSourceFile, span } from './source.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import {
  diagIfInferredArrayLengthNotAllowed,
  parseImmExprFromText,
  parseTypeExprFromText,
} from './parseImm.js';
import { parseEaExprFromText } from './parseOperands.js';
import {
  appendParsedAsmStatement,
  isRecoverOnlyControlFrame,
  parseAsmStatement,
  type AsmControlFrame,
  type ParsedAsmStatement,
} from './parseAsmStatements.js';

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

function isReservedTopLevelDeclName(name: string): boolean {
  return RESERVED_TOP_LEVEL_KEYWORDS.has(name.toLowerCase());
}

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

function stripComment(line: string): string {
  const semi = line.indexOf(';');
  return semi >= 0 ? line.slice(0, semi) : line;
}

function canonicalConditionToken(token: string): string {
  return token.toLowerCase();
}

function splitTopLevelComma(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inChar = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inChar) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === "'") inChar = false;
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
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

function parseParamsFromText(
  filePath: string,
  paramsText: string,
  paramsSpan: SourceSpan,
  diagnostics: Diagnostic[],
): ParamNode[] | undefined {
  const trimmed = paramsText.trim();
  if (trimmed.length === 0) return [];

  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.some((p) => p.length === 0)) {
    diag(
      diagnostics,
      filePath,
      `Invalid parameter list: trailing or empty entries are not permitted.`,
      {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      },
    );
    return undefined;
  }
  const out: ParamNode[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(part);
    if (!m) {
      diag(diagnostics, filePath, `Invalid parameter declaration: expected <name>: <type>`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }

    const name = m[1]!;
    if (isReservedTopLevelDeclName(name)) {
      diag(
        diagnostics,
        filePath,
        `Invalid parameter name "${name}": collides with a top-level keyword.`,
        {
          line: paramsSpan.start.line,
          column: paramsSpan.start.column,
        },
      );
      return undefined;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      diag(diagnostics, filePath, `Duplicate parameter name "${name}".`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }
    seen.add(lower);
    const typeText = m[2]!.trim();
    const typeExpr = parseTypeExprFromText(typeText, paramsSpan, {
      allowInferredArrayLength: true,
    });
    if (!typeExpr) {
      diag(diagnostics, filePath, `Invalid parameter type "${typeText}": expected <type>`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }
    if (typeExpr.kind === 'TypeName' && typeExpr.name === 'void') {
      diag(diagnostics, filePath, `Parameter "${name}" may not have type void`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }

    out.push({ kind: 'Param', span: paramsSpan, name, typeExpr });
  }
  return out;
}

function parseOpMatcherFromText(matcherText: string, matcherSpan: SourceSpan): OpMatcherNode {
  const t = matcherText.trim();
  const lower = t.toLowerCase();
  switch (lower) {
    case 'reg8':
      return { kind: 'MatcherReg8', span: matcherSpan };
    case 'reg16':
      return { kind: 'MatcherReg16', span: matcherSpan };
    case 'idx16':
      return { kind: 'MatcherIdx16', span: matcherSpan };
    case 'cc':
      return { kind: 'MatcherCc', span: matcherSpan };
    case 'imm8':
      return { kind: 'MatcherImm8', span: matcherSpan };
    case 'imm16':
      return { kind: 'MatcherImm16', span: matcherSpan };
    case 'ea':
      return { kind: 'MatcherEa', span: matcherSpan };
    case 'mem8':
      return { kind: 'MatcherMem8', span: matcherSpan };
    case 'mem16':
      return { kind: 'MatcherMem16', span: matcherSpan };
    default:
      return { kind: 'MatcherFixed', span: matcherSpan, token: t };
  }
}

function parseOpParamsFromText(
  filePath: string,
  paramsText: string,
  paramsSpan: SourceSpan,
  diagnostics: Diagnostic[],
): OpParamNode[] | undefined {
  const trimmed = paramsText.trim();
  if (trimmed.length === 0) return [];

  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.some((p) => p.length === 0)) {
    diag(
      diagnostics,
      filePath,
      `Invalid op parameter list: trailing or empty entries are not permitted.`,
      {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      },
    );
    return undefined;
  }
  const out: OpParamNode[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(part);
    if (!m) {
      diag(diagnostics, filePath, `Invalid op parameter declaration: expected <name>: <matcher>`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }

    const name = m[1]!;
    if (isReservedTopLevelDeclName(name)) {
      diag(
        diagnostics,
        filePath,
        `Invalid op parameter name "${name}": collides with a top-level keyword.`,
        {
          line: paramsSpan.start.line,
          column: paramsSpan.start.column,
        },
      );
      return undefined;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      diag(diagnostics, filePath, `Duplicate op parameter name "${name}".`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }
    seen.add(lower);
    const matcherText = m[2]!.trim();
    out.push({
      kind: 'OpParam',
      span: paramsSpan,
      name,
      matcher: parseOpMatcherFromText(matcherText, paramsSpan),
    });
  }
  return out;
}

/**
 * Parse a single `.zax` module file from an in-memory source string.
 *
 * Implementation note:
 * - Parsing is best-effort: on errors, diagnostics are appended and parsing continues.
 * - The module may include `import` statements, but import resolution/loading is handled by the compiler.
 */
export function parseModuleFile(
  modulePath: string,
  sourceText: string,
  diagnostics: Diagnostic[],
): ModuleFileNode {
  const file = makeSourceFile(modulePath, sourceText);
  const lineCount = file.lineStarts.length;

  function getRawLine(lineIndex: number): { raw: string; startOffset: number; endOffset: number } {
    const startOffset = file.lineStarts[lineIndex] ?? 0;
    const nextStart = file.lineStarts[lineIndex + 1] ?? file.text.length;
    let rawWithEol = file.text.slice(startOffset, nextStart);
    if (rawWithEol.endsWith('\n')) rawWithEol = rawWithEol.slice(0, -1);
    if (rawWithEol.endsWith('\r')) rawWithEol = rawWithEol.slice(0, -1);
    return { raw: rawWithEol, startOffset, endOffset: startOffset + rawWithEol.length };
  }

  const items: ModuleItemNode[] = [];

  function consumeKeywordPrefix(input: string, keyword: string): string | undefined {
    const match = new RegExp(`^${keyword}(?:\\s+(.*))?$`, 'i').exec(input);
    if (!match) return undefined;
    return (match[1] ?? '').trimStart();
  }

  const TOP_LEVEL_KEYWORDS = new Set([
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

  function topLevelStartKeyword(t: string): string | undefined {
    const exportTail = consumeKeywordPrefix(t, 'export');
    const w = exportTail !== undefined ? exportTail : t;
    const keyword = (w.split(/\s/, 1)[0] ?? '').toLowerCase();
    return TOP_LEVEL_KEYWORDS.has(keyword) ? keyword : undefined;
  }

  function isTopLevelStart(t: string): boolean {
    return topLevelStartKeyword(t) !== undefined;
  }

  function consumeTopKeyword(input: string, keyword: string): string | undefined {
    return consumeKeywordPrefix(input, keyword);
  }

  function isReservedTopLevelName(name: string): boolean {
    return isReservedTopLevelDeclName(name);
  }

  function looksLikeKeywordBodyDeclLine(lineText: string): boolean {
    const t = lineText.trim();
    let depth = 0;
    let colon = -1;
    for (let index = 0; index < t.length; index++) {
      const ch = t[index];
      if (ch === '(') depth++;
      else if (ch === ')' && depth > 0) depth--;
      else if (ch === ':' && depth === 0) {
        colon = index;
        break;
      }
    }
    if (colon <= 0) return false;
    const beforeColon = t.slice(0, colon).trim();
    if (/^func\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*$/i.test(beforeColon)) return false;
    return /^[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*(\s*\([^)]*\))?\s*$/.test(beforeColon);
  }

  function quoteDiagLineText(text: string): string {
    const trimmed = text.trim();
    const preview = trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed;
    return preview.replace(/"/g, '\\"');
  }

  function diagInvalidBlockLine(
    kind: string,
    lineText: string,
    expected: string,
    line: number,
  ): void {
    const q = quoteDiagLineText(lineText);
    diag(diagnostics, modulePath, `Invalid ${kind} line "${q}": expected ${expected}`, {
      line,
      column: 1,
    });
  }

  function diagInvalidHeaderLine(
    kind: string,
    lineText: string,
    expected: string,
    line: number,
  ): void {
    const q = quoteDiagLineText(lineText);
    diag(diagnostics, modulePath, `Invalid ${kind} line "${q}": expected ${expected}`, {
      line,
      column: 1,
    });
  }

  function formatIdentifierToken(rawText: string): string {
    const trimmed = rawText.trim();
    if (trimmed.length === 0) return '<empty>';
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }

  function parseVarDeclLine(
    lineText: string,
    declSpan: SourceSpan,
    lineNo: number,
    scope: 'globals' | 'var',
  ): VarDeclNode | undefined {
    const declKind = scope === 'globals' ? 'globals declaration' : 'var declaration';
    const raw = lineText.trim();
    const valueOrAliasExpected = '<name>: <type>';

    const aliasMatch = /^([^:=]+?)\s*=\s*(.+)$/.exec(raw);
    if (aliasMatch && !aliasMatch[1]!.includes(':')) {
      const name = aliasMatch[1]!.trim();
      const rhsText = aliasMatch[2]!.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid ${scope} declaration name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        return undefined;
      }
      if (TOP_LEVEL_KEYWORDS.has(name.toLowerCase())) {
        diag(
          diagnostics,
          modulePath,
          `Invalid ${scope} declaration name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        return undefined;
      }
      const rhsEa = parseEaExprFromText(modulePath, rhsText, declSpan, diagnostics);
      if (!rhsEa) {
        diag(
          diagnostics,
          modulePath,
          `Incompatible inferred alias binding for "${name}": expected address expression on right-hand side.`,
          { line: lineNo, column: 1 },
        );
        return undefined;
      }
      const initializer: VarDeclInitializerNode = {
        kind: 'VarInitAlias',
        span: declSpan,
        expr: rhsEa,
      };
      return { kind: 'VarDecl', span: declSpan, name, initializer };
    }

    const typedMatch = /^([^:]+)\s*:\s*(.+)$/.exec(raw);
    if (!typedMatch) {
      diagInvalidBlockLine(declKind, raw, valueOrAliasExpected, lineNo);
      return undefined;
    }

    const name = typedMatch[1]!.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      diag(
        diagnostics,
        modulePath,
        `Invalid ${scope} declaration name ${formatIdentifierToken(name)}: expected <identifier>.`,
        { line: lineNo, column: 1 },
      );
      return undefined;
    }
    if (TOP_LEVEL_KEYWORDS.has(name.toLowerCase())) {
      diag(
        diagnostics,
        modulePath,
        `Invalid ${scope} declaration name "${name}": collides with a top-level keyword.`,
        { line: lineNo, column: 1 },
      );
      return undefined;
    }

    const typeAndInitText = typedMatch[2]!.trim();
    const eqIdx = typeAndInitText.indexOf('=');
    const typeText = (eqIdx >= 0 ? typeAndInitText.slice(0, eqIdx) : typeAndInitText).trim();
    const initText = (eqIdx >= 0 ? typeAndInitText.slice(eqIdx + 1) : '').trim();
    const typeExpr = parseTypeExprFromText(typeText, declSpan, {
      allowInferredArrayLength: false,
    });
    if (!typeExpr) {
      if (
        diagIfInferredArrayLengthNotAllowed(diagnostics, modulePath, typeText, {
          line: lineNo,
          column: 1,
        })
      ) {
        return undefined;
      }
      diagInvalidBlockLine(declKind, raw, valueOrAliasExpected, lineNo);
      return undefined;
    }

    if (eqIdx < 0) {
      return { kind: 'VarDecl', span: declSpan, name, typeExpr };
    }

    const aliasLike = parseEaExprFromText(modulePath, initText, declSpan, diagnostics);
    if (aliasLike) {
      diag(
        diagnostics,
        modulePath,
        `Unsupported typed alias form for "${name}": use "${name} = ${initText}" for alias initialization.`,
        { line: lineNo, column: 1 },
      );
      return undefined;
    }

    const valueExpr = parseImmExprFromText(modulePath, initText, declSpan, diagnostics);
    if (!valueExpr) {
      diagInvalidBlockLine(declKind, raw, valueOrAliasExpected, lineNo);
      return undefined;
    }

    const initializer: VarDeclInitializerNode = {
      kind: 'VarInitValue',
      span: declSpan,
      expr: valueExpr,
    };
    return { kind: 'VarDecl', span: declSpan, name, typeExpr, initializer };
  }

  function consumeInvalidExternBlock(startIndex: number): number {
    let previewIndex = startIndex + 1;
    while (previewIndex < lineCount) {
      const { raw } = getRawLine(previewIndex);
      const t = stripComment(raw).trim();
      if (t.length === 0) {
        previewIndex++;
        continue;
      }
      const looksLikeBodyStart =
        t.toLowerCase() === 'end' ||
        consumeKeywordPrefix(t, 'func') !== undefined ||
        looksLikeKeywordBodyDeclLine(t);
      if (!looksLikeBodyStart) return startIndex + 1;
      break;
    }
    if (previewIndex >= lineCount) return startIndex + 1;

    let index = previewIndex;
    while (index < lineCount) {
      const { raw } = getRawLine(index);
      const t = stripComment(raw).trim();
      const tLower = t.toLowerCase();
      if (t.length === 0) {
        index++;
        continue;
      }
      if (tLower === 'end') return index + 1;
      const topKeyword = topLevelStartKeyword(t);
      if (
        topKeyword !== undefined &&
        consumeKeywordPrefix(t, 'func') === undefined &&
        !looksLikeKeywordBodyDeclLine(t)
      ) {
        return index;
      }
      index++;
    }
    return lineCount;
  }

  const malformedTopLevelHeaderExpectations: ReadonlyArray<{
    keyword: string;
    kind: string;
    expected: string;
  }> = [
    { keyword: 'import', kind: 'import statement', expected: '"<path>.zax" or <moduleId>' },
    { keyword: 'type', kind: 'type declaration', expected: '<name> [<typeExpr>]' },
    { keyword: 'union', kind: 'union declaration', expected: '<name>' },
    { keyword: 'globals', kind: 'globals declaration', expected: 'globals' },
    { keyword: 'var', kind: 'globals declaration', expected: 'globals' },
    { keyword: 'func', kind: 'func header', expected: '<name>(...)[ : <retRegs> ]' },
    { keyword: 'op', kind: 'op header', expected: '<name>(...)' },
    {
      keyword: 'extern',
      kind: 'extern declaration',
      expected: '[<baseName>] or func <name>(...)[ : <retRegs> ] at <imm16>',
    },
    { keyword: 'enum', kind: 'enum declaration', expected: '<name> <member>[, ...]' },
    { keyword: 'section', kind: 'section directive', expected: '<code|data|var> [at <imm16>]' },
    { keyword: 'align', kind: 'align directive', expected: '<imm16>' },
    { keyword: 'const', kind: 'const declaration', expected: '<name> = <imm>' },
    { keyword: 'bin', kind: 'bin declaration', expected: '<name> in <code|data> from "<path>"' },
    { keyword: 'hex', kind: 'hex declaration', expected: '<name> from "<path>"' },
    { keyword: 'data', kind: 'data declaration', expected: 'data' },
  ];

  const unsupportedExportTargetKind: Readonly<Partial<Record<string, string>>> = {
    import: 'import statements',
    type: 'type declarations',
    union: 'union declarations',
    globals: 'globals declarations',
    var: 'legacy "var" declarations (use "globals")',
    extern: 'extern declarations',
    enum: 'enum declarations',
    section: 'section directives',
    align: 'align directives',
    bin: 'bin declarations',
    hex: 'hex declarations',
    data: 'data declarations',
  };

  function parseReturnRegsFromText(
    text: string,
    stmtSpan: SourceSpan,
    lineNo: number,
  ): { regs: string[] } | undefined {
    const body = text.trim();
    const tokens = body
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return { regs: [] };

    const allowed = new Set(['AF', 'BC', 'DE', 'HL']);
    const legacyKeywords = new Set(['VOID', 'BYTE', 'WORD', 'LONG', 'VERYLONG', 'NONE', 'FLAGS']);
    const seen = new Set<string>();
    for (const t of tokens) {
      const upper = t.toUpperCase();
      if (legacyKeywords.has(upper)) {
        diag(
          diagnostics,
          modulePath,
          `Legacy return keyword "${t}" is not supported; declare explicit registers (e.g., omit ":" for no returns, or use HL/DE/BC/AF list).`,
          { line: lineNo, column: 1 },
        );
        return undefined;
      }
      if (!allowed.has(upper)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid return register "${t}": expected HL, DE, BC, or AF.`,
          { line: lineNo, column: 1 },
        );
        return undefined;
      }
      if (seen.has(upper)) {
        diag(diagnostics, modulePath, `Duplicate return register "${t}".`, {
          line: lineNo,
          column: 1,
        });
        return undefined;
      }
      seen.add(upper);
    }
    return { regs: [...seen] };
  }

  function parseExternFuncFromTail(
    tail: string,
    stmtSpan: SourceSpan,
    lineNo: number,
  ): ExternFuncNode | undefined {
    const header = tail;
    const openParen = header.indexOf('(');
    const closeParen = header.lastIndexOf(')');
    if (openParen < 0 || closeParen < openParen) {
      diagInvalidHeaderLine(
        'extern func declaration',
        `func ${header}`,
        '<name>(...)[ : <retRegs> ] at <imm16>',
        lineNo,
      );
      return undefined;
    }

    const name = header.slice(0, openParen).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      diag(
        diagnostics,
        modulePath,
        `Invalid extern func name ${formatIdentifierToken(name)}: expected <identifier>.`,
        { line: lineNo, column: 1 },
      );
      return undefined;
    }
    if (isReservedTopLevelName(name)) {
      diag(
        diagnostics,
        modulePath,
        `Invalid extern func name "${name}": collides with a top-level keyword.`,
        { line: lineNo, column: 1 },
      );
      return undefined;
    }

    const afterClose = header.slice(closeParen + 1).trimStart();
    const atIdx = afterClose.toLowerCase().lastIndexOf(' at ');
    if (atIdx < 0) {
      diagInvalidHeaderLine(
        'extern func declaration',
        `func ${header}`,
        '<name>(...)[ : <retRegs> ] at <imm16>',
        lineNo,
      );
      return undefined;
    }

    const retTextRaw = afterClose.slice(0, atIdx).trim();
    const atText = afterClose.slice(atIdx + 4).trim();

    let returnRegs: string[] | undefined;
    if (retTextRaw.length === 0) {
      returnRegs = [];
    } else {
      if (!retTextRaw.startsWith(':')) {
        diagInvalidHeaderLine(
          'extern func declaration',
          `func ${header}`,
          '<name>(...)[ : <retRegs> ] at <imm16>',
          lineNo,
        );
        return undefined;
      }
      const regText = retTextRaw.slice(1).trim();
      const parsed = parseReturnRegsFromText(regText, stmtSpan, lineNo);
      if (!parsed) return undefined;
      returnRegs = parsed.regs;
    }

    const paramsText = header.slice(openParen + 1, closeParen);
    const params = parseParamsFromText(modulePath, paramsText, stmtSpan, diagnostics);
    if (!params) return undefined;

    const at = parseImmExprFromText(modulePath, atText, stmtSpan, diagnostics);
    if (!at) return undefined;

    return {
      kind: 'ExternFunc',
      span: stmtSpan,
      name,
      params,
      returnRegs,
      at,
    };
  }

  let i = 0;
  while (i < lineCount) {
    const { raw, startOffset: lineStartOffset, endOffset: lineEndOffset } = getRawLine(i);
    const text = stripComment(raw).trim();
    const lineNo = i + 1;
    if (text.length === 0) {
      i++;
      continue;
    }

    const exportTail = consumeKeywordPrefix(text, 'export');
    const hasExportPrefix = exportTail !== undefined;
    const rest = hasExportPrefix ? exportTail : text;

    if (hasExportPrefix && rest.length === 0) {
      diag(diagnostics, modulePath, `Invalid export statement`, { line: lineNo, column: 1 });
      i++;
      continue;
    }
    const hasTopKeyword = (kw: string): boolean => new RegExp(`^${kw}\\b`, 'i').test(rest);

    // In v0.1, `export` is accepted only on `const`, `func`, and `op` declarations.
    // It has no semantic effect today, but we still reject it on all other constructs
    // to keep the surface area explicit and future-proof.
    if (hasExportPrefix) {
      const allowed =
        consumeKeywordPrefix(rest, 'const') !== undefined ||
        consumeKeywordPrefix(rest, 'func') !== undefined ||
        consumeKeywordPrefix(rest, 'op') !== undefined;
      if (!allowed) {
        const exportAsmTail = consumeKeywordPrefix(rest, 'asm');
        if (exportAsmTail !== undefined) {
          diag(
            diagnostics,
            modulePath,
            `"asm" is not a top-level construct (function and op bodies are implicit instruction streams)`,
            {
              line: lineNo,
              column: 1,
            },
          );
          i++;
          continue;
        }

        const targetKeyword = topLevelStartKeyword(rest);
        if (targetKeyword !== undefined) {
          const targetKind = unsupportedExportTargetKind[targetKeyword];
          if (targetKind !== undefined) {
            diag(diagnostics, modulePath, `export not supported on ${targetKind}`, {
              line: lineNo,
              column: 1,
            });
          } else {
            diag(
              diagnostics,
              modulePath,
              `export is only permitted on const/func/op declarations`,
              {
                line: lineNo,
                column: 1,
              },
            );
          }
        } else {
          diag(diagnostics, modulePath, `export is only permitted on const/func/op declarations`, {
            line: lineNo,
            column: 1,
          });
        }
        i++;
        continue;
      }
    }

    const importTail = consumeTopKeyword(rest, 'import');
    if (importTail !== undefined) {
      const spec = importTail.trim();
      const stmtSpan = span(file, lineStartOffset, lineEndOffset);
      if (spec.startsWith('"') && spec.endsWith('"') && spec.length >= 2) {
        const importNode: ImportNode = {
          kind: 'Import',
          span: stmtSpan,
          specifier: spec.slice(1, -1),
          form: 'path',
        };
        items.push(importNode);
        i++;
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(spec)) {
        const importNode: ImportNode = {
          kind: 'Import',
          span: stmtSpan,
          specifier: spec,
          form: 'moduleId',
        };
        items.push(importNode);
        i++;
        continue;
      }
      diagInvalidHeaderLine('import statement', text, '"<path>.zax" or <moduleId>', lineNo);
      i++;
      continue;
    }

    const typeTail = consumeTopKeyword(rest, 'type');
    if (typeTail !== undefined) {
      const afterType = typeTail.trim();
      const parts = afterType.split(/\s+/, 2);
      const name = parts[0] ?? '';
      const tail = afterType.slice(name.length).trimStart();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        if (name.length > 0) {
          diag(
            diagnostics,
            modulePath,
            `Invalid type name ${formatIdentifierToken(name)}: expected <identifier>.`,
            { line: lineNo, column: 1 },
          );
        } else {
          diagInvalidHeaderLine('type declaration', text, '<name> [<typeExpr>]', lineNo);
        }
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid type name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }

      // Alias form: `type Name <typeExpr>`
      if (tail.length > 0) {
        const stmtSpan = span(file, lineStartOffset, lineEndOffset);
        const typeExpr = parseTypeExprFromText(tail, stmtSpan, { allowInferredArrayLength: false });
        if (!typeExpr) {
          if (
            diagIfInferredArrayLengthNotAllowed(diagnostics, modulePath, tail, {
              line: lineNo,
              column: 1,
            })
          ) {
            i++;
            continue;
          }
          diagInvalidHeaderLine('type declaration', text, '<name> [<typeExpr>]', lineNo);
          i++;
          continue;
        }
        items.push({ kind: 'TypeDecl', span: stmtSpan, name, typeExpr });
        i++;
        continue;
      }

      // Record form:
      // type Name
      //   field: type
      // end
      const typeStart = lineStartOffset;
      const fields: RecordFieldNode[] = [];
      const fieldNamesLower = new Set<string>();
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      let typeEndOffset = file.text.length;
      i++;

      while (i < lineCount) {
        const { raw: rawField, startOffset: so, endOffset: eo } = getRawLine(i);
        const t = stripComment(rawField).trim();
        const tLower = t.toLowerCase();
        if (t.length === 0) {
          i++;
          continue;
        }
        if (tLower === 'end') {
          terminated = true;
          typeEndOffset = eo;
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(t);
        if (topKeyword !== undefined) {
          if (looksLikeKeywordBodyDeclLine(t)) {
            diagInvalidBlockLine('record field declaration', t, '<name>: <type>', i + 1);
            i++;
            continue;
          }
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const m = /^([^:]+)\s*:\s*(.+)$/.exec(t);
        if (!m) {
          diagInvalidBlockLine('record field declaration', t, '<name>: <type>', i + 1);
          i++;
          continue;
        }

        const fieldName = m[1]!.trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldName)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid record field name ${formatIdentifierToken(fieldName)}: expected <identifier>.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        if (isReservedTopLevelName(fieldName)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid record field name "${fieldName}": collides with a top-level keyword.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        const fieldNameLower = fieldName.toLowerCase();
        if (fieldNamesLower.has(fieldNameLower)) {
          diag(diagnostics, modulePath, `Duplicate record field name "${fieldName}".`, {
            line: i + 1,
            column: 1,
          });
          i++;
          continue;
        }
        fieldNamesLower.add(fieldNameLower);
        const typeText = m[2]!.trim();
        const fieldSpan = span(file, so, eo);
        const typeExpr = parseTypeExprFromText(typeText, fieldSpan, {
          allowInferredArrayLength: false,
        });
        if (!typeExpr) {
          if (
            diagIfInferredArrayLengthNotAllowed(diagnostics, modulePath, typeText, {
              line: i + 1,
              column: 1,
            })
          ) {
            i++;
            continue;
          }
          diagInvalidBlockLine('record field declaration', t, '<name>: <type>', i + 1);
          i++;
          continue;
        }

        fields.push({
          kind: 'RecordField',
          span: fieldSpan,
          name: fieldName,
          typeExpr,
        });
        i++;
      }

      if (!terminated) {
        if (interruptedByKeyword !== undefined && interruptedByLine !== undefined) {
          diag(
            diagnostics,
            modulePath,
            `Unterminated type "${name}": expected "end" before "${interruptedByKeyword}"`,
            { line: interruptedByLine, column: 1 },
          );
        } else {
          diag(diagnostics, modulePath, `Unterminated type "${name}": missing "end"`, {
            line: lineNo,
            column: 1,
          });
        }
      }

      if (fields.length === 0) {
        diag(diagnostics, modulePath, `Type "${name}" must contain at least one field`, {
          line: lineNo,
          column: 1,
        });
      }

      const typeEnd = terminated ? typeEndOffset : file.text.length;
      const typeSpan = span(file, typeStart, typeEnd);
      items.push({
        kind: 'TypeDecl',
        span: typeSpan,
        name,
        typeExpr: { kind: 'RecordType', span: typeSpan, fields },
      });
      continue;
    }

    const unionTail = consumeTopKeyword(rest, 'union');
    if (unionTail !== undefined) {
      const name = unionTail.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        if (name.length > 0) {
          diag(
            diagnostics,
            modulePath,
            `Invalid union name ${formatIdentifierToken(name)}: expected <identifier>.`,
            { line: lineNo, column: 1 },
          );
        } else {
          diagInvalidHeaderLine('union declaration', text, '<name>', lineNo);
        }
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid union name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }

      const unionStart = lineStartOffset;
      const fields: RecordFieldNode[] = [];
      const fieldNamesLower = new Set<string>();
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      let unionEndOffset = file.text.length;
      i++;

      while (i < lineCount) {
        const { raw: rawField, startOffset: so, endOffset: eo } = getRawLine(i);
        const t = stripComment(rawField).trim();
        const tLower = t.toLowerCase();
        if (t.length === 0) {
          i++;
          continue;
        }
        if (tLower === 'end') {
          terminated = true;
          unionEndOffset = eo;
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(t);
        if (topKeyword !== undefined && consumeKeywordPrefix(t, 'func') === undefined) {
          if (looksLikeKeywordBodyDeclLine(t)) {
            diagInvalidBlockLine('union field declaration', t, '<name>: <type>', i + 1);
            i++;
            continue;
          }
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const m = /^([^:]+)\s*:\s*(.+)$/.exec(t);
        if (!m) {
          diagInvalidBlockLine('union field declaration', t, '<name>: <type>', i + 1);
          i++;
          continue;
        }

        const fieldName = m[1]!.trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldName)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid union field name ${formatIdentifierToken(fieldName)}: expected <identifier>.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        if (isReservedTopLevelName(fieldName)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid union field name "${fieldName}": collides with a top-level keyword.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        const fieldNameLower = fieldName.toLowerCase();
        if (fieldNamesLower.has(fieldNameLower)) {
          diag(diagnostics, modulePath, `Duplicate union field name "${fieldName}".`, {
            line: i + 1,
            column: 1,
          });
          i++;
          continue;
        }
        fieldNamesLower.add(fieldNameLower);
        const typeText = m[2]!.trim();
        const fieldSpan = span(file, so, eo);
        const typeExpr = parseTypeExprFromText(typeText, fieldSpan, {
          allowInferredArrayLength: false,
        });
        if (!typeExpr) {
          if (
            diagIfInferredArrayLengthNotAllowed(diagnostics, modulePath, typeText, {
              line: i + 1,
              column: 1,
            })
          ) {
            i++;
            continue;
          }
          diagInvalidBlockLine('union field declaration', t, '<name>: <type>', i + 1);
          i++;
          continue;
        }

        fields.push({
          kind: 'RecordField',
          span: fieldSpan,
          name: fieldName,
          typeExpr,
        });
        i++;
      }

      if (!terminated) {
        if (interruptedByKeyword !== undefined && interruptedByLine !== undefined) {
          diag(
            diagnostics,
            modulePath,
            `Unterminated union "${name}": expected "end" before "${interruptedByKeyword}"`,
            { line: interruptedByLine, column: 1 },
          );
        } else {
          diag(diagnostics, modulePath, `Unterminated union "${name}": missing "end"`, {
            line: lineNo,
            column: 1,
          });
        }
      }

      if (fields.length === 0) {
        diag(diagnostics, modulePath, `Union "${name}" must contain at least one field`, {
          line: lineNo,
          column: 1,
        });
      }

      const unionEnd = terminated ? unionEndOffset : file.text.length;
      const unionSpan = span(file, unionStart, unionEnd);
      items.push({ kind: 'UnionDecl', span: unionSpan, name, fields });
      continue;
    }

    const storageHeader = rest.toLowerCase();
    if (storageHeader === 'var' || storageHeader === 'globals') {
      if (storageHeader === 'var') {
        diag(diagnostics, modulePath, `Top-level "var" block has been renamed to "globals".`, {
          line: lineNo,
          column: 1,
        });
      }
      const blockDeclKind = 'globals declaration';
      const blockHeaderExpected = 'globals';
      const blockStart = lineStartOffset;
      i++;
      const decls: VarDeclNode[] = [];
      const declNamesLower = new Set<string>();

      while (i < lineCount) {
        const { raw: rawDecl, startOffset: so, endOffset: eo } = getRawLine(i);
        const t = stripComment(rawDecl).trim();
        if (t.length === 0) {
          i++;
          continue;
        }
        if (isTopLevelStart(t)) {
          const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.+)$/.exec(t);
          if (m && TOP_LEVEL_KEYWORDS.has(m[1]!)) {
            diag(
              diagnostics,
              modulePath,
              `Invalid globals declaration name "${m[1]!}": collides with a top-level keyword.`,
              { line: i + 1, column: 1 },
            );
            i++;
            continue;
          }
          if (looksLikeKeywordBodyDeclLine(t)) {
            diagInvalidBlockLine(blockDeclKind, t, '<name>: <type>', i + 1);
            i++;
            continue;
          }
          break;
        }
        const declSpan = span(file, so, eo);
        const parsed = parseVarDeclLine(t, declSpan, i + 1, 'globals');
        if (!parsed) {
          if (/^globals\b/i.test(t)) {
            diagInvalidBlockLine(blockDeclKind, t, blockHeaderExpected, i + 1);
          }
          i++;
          continue;
        }
        const nameLower = parsed.name.toLowerCase();
        if (declNamesLower.has(nameLower)) {
          diag(diagnostics, modulePath, `Duplicate globals declaration name "${parsed.name}".`, {
            line: i + 1,
            column: 1,
          });
          i++;
          continue;
        }
        if (nameLower === 'globals') {
          diag(
            diagnostics,
            modulePath,
            `Invalid globals declaration name "${parsed.name}": collides with a top-level keyword.`,
            {
              line: i + 1,
              column: 1,
            },
          );
          i++;
          continue;
        }
        declNamesLower.add(nameLower);
        decls.push(parsed);
        i++;
      }

      const blockEnd = i < lineCount ? (getRawLine(i).startOffset ?? blockStart) : file.text.length;
      const varBlock: VarBlockNode = {
        kind: 'VarBlock',
        span: span(file, blockStart, blockEnd),
        scope: 'module',
        decls,
      };
      items.push(varBlock);
      continue;
    }

    const funcTail = consumeTopKeyword(rest, 'func');
    if (funcTail !== undefined) {
      const exported = hasExportPrefix;
      const header = funcTail;
      const openParen = header.indexOf('(');
      const closeParen = header.lastIndexOf(')');
      if (openParen < 0 || closeParen < openParen) {
        diagInvalidHeaderLine('func header', text, '<name>(...): <retType>', lineNo);
        i++;
        continue;
      }

      const name = header.slice(0, openParen).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid func name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid func name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }

      const funcStartOffset = lineStartOffset;
      const headerSpan = span(file, lineStartOffset, lineEndOffset);
      const afterClose = header.slice(closeParen + 1).trimStart();
      let returnRegs: string[] | undefined;
      if (afterClose.length === 0) {
        returnRegs = [];
      } else {
        const retMatch = /^:\s*(.+)$/.exec(afterClose);
        if (!retMatch) {
          diag(diagnostics, modulePath, `Invalid func header: expected ": <return registers>"`, {
            line: lineNo,
            column: 1,
          });
          i++;
          continue;
        }
        const parsedRegs = parseReturnRegsFromText(retMatch[1]!.trim(), headerSpan, lineNo);
        if (!parsedRegs) {
          i++;
          continue;
        }
        returnRegs = parsedRegs.regs;
      }

      const paramsText = header.slice(openParen + 1, closeParen);
      const params = parseParamsFromText(modulePath, paramsText, headerSpan, diagnostics);
      if (!params) {
        i++;
        continue;
      }

      i++;

      // Optional function-local `var` block; function instruction body is parsed
      // as an implicit instruction stream.
      let locals: VarBlockNode | undefined;
      let asmStartOffset: number | undefined;
      let interruptedBeforeBodyKeyword: string | undefined;
      let interruptedBeforeBodyLine: number | undefined;
      while (i < lineCount) {
        const { raw: raw2, startOffset: so2 } = getRawLine(i);
        const t2 = stripComment(raw2).trim();
        const t2Lower = t2.toLowerCase();
        if (t2.length === 0) {
          i++;
          continue;
        }
        const t2TopKeyword = topLevelStartKeyword(t2);
        if (t2TopKeyword !== undefined && t2Lower !== 'var') {
          interruptedBeforeBodyKeyword = t2TopKeyword;
          interruptedBeforeBodyLine = i + 1;
          break;
        }

        if (t2Lower === 'var') {
          const varStart = so2;
          i++;
          const decls: VarDeclNode[] = [];
          const declNamesLower = new Set<string>();
          let varTerminated = false;

          while (i < lineCount) {
            const { raw: rawDecl, startOffset: soDecl, endOffset: eoDecl } = getRawLine(i);
            const tDecl = stripComment(rawDecl).trim();
            const tDeclLower = tDecl.toLowerCase();
            if (tDecl.length === 0) {
              i++;
              continue;
            }
            if (tDeclLower === 'end') {
              locals = {
                kind: 'VarBlock',
                span: span(file, varStart, eoDecl),
                scope: 'function',
                decls,
              };
              i++; // consume var-terminating end
              varTerminated = true;
              break;
            }
            if (tDeclLower === 'asm') {
              diag(
                diagnostics,
                modulePath,
                `Function-local var block must end with "end" before function body`,
                { line: i + 1, column: 1 },
              );
              locals = {
                kind: 'VarBlock',
                span: span(file, varStart, soDecl),
                scope: 'function',
                decls,
              };
              i++; // consume asm so body parsing can continue
              varTerminated = true;
              break;
            }
            const tDeclTopKeyword = topLevelStartKeyword(tDecl);
            if (tDeclTopKeyword !== undefined) {
              if (looksLikeKeywordBodyDeclLine(tDecl)) {
                diagInvalidBlockLine('var declaration', tDecl, '<name>: <type>', i + 1);
                i++;
                continue;
              }
              interruptedBeforeBodyKeyword = tDeclTopKeyword;
              interruptedBeforeBodyLine = i + 1;
              locals = {
                kind: 'VarBlock',
                span: span(file, varStart, soDecl),
                scope: 'function',
                decls,
              };
              break;
            }

            const declSpan = span(file, soDecl, eoDecl);
            const parsed = parseVarDeclLine(tDecl, declSpan, i + 1, 'var');
            if (!parsed) {
              i++;
              continue;
            }
            const localNameLower = parsed.name.toLowerCase();
            if (declNamesLower.has(localNameLower)) {
              diag(diagnostics, modulePath, `Duplicate var declaration name "${parsed.name}".`, {
                line: i + 1,
                column: 1,
              });
              i++;
              continue;
            }
            declNamesLower.add(localNameLower);
            decls.push(parsed);
            i++;
          }
          if (interruptedBeforeBodyKeyword !== undefined) break;
          if (!varTerminated) {
            diag(
              diagnostics,
              modulePath,
              `Unterminated func "${name}": expected "end" to terminate var block`,
              { line: lineNo, column: 1 },
            );
            break;
          }
          continue;
        }

        if (t2Lower === 'end') {
          asmStartOffset = so2;
          break;
        }
        asmStartOffset = so2;
        break;
      }

      if (asmStartOffset === undefined) {
        if (interruptedBeforeBodyKeyword !== undefined && interruptedBeforeBodyLine !== undefined) {
          diag(
            diagnostics,
            modulePath,
            `Unterminated func "${name}": expected function body before "${interruptedBeforeBodyKeyword}"`,
            { line: interruptedBeforeBodyLine, column: 1 },
          );
          continue;
        }
        diag(diagnostics, modulePath, `Unterminated func "${name}": expected function body`, {
          line: lineNo,
          column: 1,
        });
        break;
      }

      const asmItems: AsmItemNode[] = [];
      const asmControlStack: AsmControlFrame[] = [];
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      while (i < lineCount) {
        const { raw: rawLine, startOffset: lineOffset, endOffset } = getRawLine(i);
        const withoutComment = stripComment(rawLine);
        const content = withoutComment.trim();
        const contentLower = content.toLowerCase();
        if (content.length === 0) {
          i++;
          continue;
        }
        if (contentLower === 'asm' && asmControlStack.length === 0 && asmItems.length === 0) {
          diag(
            diagnostics,
            modulePath,
            `Unexpected "asm" in function body (function bodies are implicit)`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }

        if (contentLower === 'end' && asmControlStack.length === 0) {
          terminated = true;
          const funcEndOffset = endOffset;
          const funcSpan = span(file, funcStartOffset, funcEndOffset);
          const asmSpan = span(file, asmStartOffset, funcEndOffset);
          const asm: AsmBlockNode = { kind: 'AsmBlock', span: asmSpan, items: asmItems };

          const funcNode: FuncDeclNode = {
            kind: 'FuncDecl',
            span: funcSpan,
            name,
            exported,
            params,
            ...(returnRegs ? { returnRegs } : {}),
            ...(locals ? { locals } : {}),
            asm,
          };
          items.push(funcNode);
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(content);
        if (topKeyword !== undefined) {
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const fullSpan = span(file, lineOffset, endOffset);
        const contentStart = withoutComment.indexOf(content);
        const contentSpan =
          contentStart >= 0
            ? span(file, lineOffset + contentStart, lineOffset + withoutComment.length)
            : fullSpan;

        /* label: */
        const labelMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(content);
        if (labelMatch) {
          const label = labelMatch[1]!;
          const remainder = labelMatch[2] ?? '';
          const labelNode: AsmLabelNode = { kind: 'AsmLabel', span: fullSpan, name: label };
          asmItems.push(labelNode);
          if (remainder.trim().length > 0) {
            const stmtNode = parseAsmStatement(
              modulePath,
              remainder,
              contentSpan,
              diagnostics,
              asmControlStack,
            );
            appendParsedAsmStatement(asmItems, stmtNode);
          }
          i++;
          continue;
        }

        const stmtNode = parseAsmStatement(
          modulePath,
          content,
          contentSpan,
          diagnostics,
          asmControlStack,
        );
        appendParsedAsmStatement(asmItems, stmtNode);
        i++;
      }

      if (!terminated) {
        if (interruptedByKeyword !== undefined && interruptedByLine !== undefined) {
          for (const frame of asmControlStack) {
            if (isRecoverOnlyControlFrame(frame)) continue;
            const frameSpan = frame.openSpan;
            const msg =
              frame.kind === 'Repeat'
                ? `"repeat" without matching "until <cc>"`
                : `"${frame.kind.toLowerCase()}" without matching "end"`;
            diag(diagnostics, modulePath, msg, {
              line: frameSpan.start.line,
              column: frameSpan.start.column,
            });
          }
          diag(
            diagnostics,
            modulePath,
            `Unterminated func "${name}": expected "end" before "${interruptedByKeyword}"`,
            { line: interruptedByLine, column: 1 },
          );
          continue;
        }
        for (const frame of asmControlStack) {
          if (isRecoverOnlyControlFrame(frame)) continue;
          const span = frame.openSpan;
          const msg =
            frame.kind === 'Repeat'
              ? `"repeat" without matching "until <cc>"`
              : `"${frame.kind.toLowerCase()}" without matching "end"`;
          diag(diagnostics, modulePath, msg, { line: span.start.line, column: span.start.column });
        }
        diag(diagnostics, modulePath, `Unterminated func "${name}": missing "end"`, {
          line: lineNo,
          column: 1,
        });
        break;
      }

      continue;
    }

    const opTail = consumeTopKeyword(rest, 'op');
    if (opTail !== undefined) {
      const exported = hasExportPrefix;
      const header = opTail;
      const openParen = header.indexOf('(');
      const closeParen = header.lastIndexOf(')');
      if (openParen < 0 || closeParen < openParen) {
        diagInvalidHeaderLine('op header', text, '<name>(...)', lineNo);
        i++;
        continue;
      }

      const name = header.slice(0, openParen).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid op name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid op name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }

      const trailing = header.slice(closeParen + 1).trim();
      if (trailing.length > 0) {
        diag(diagnostics, modulePath, `Invalid op header: unexpected trailing tokens`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }

      const opStartOffset = lineStartOffset;
      const headerSpan = span(file, lineStartOffset, lineEndOffset);
      const paramsText = header.slice(openParen + 1, closeParen);
      const params = parseOpParamsFromText(modulePath, paramsText, headerSpan, diagnostics);
      if (!params) {
        i++;
        continue;
      }
      i++;

      const bodyItems: AsmItemNode[] = [];
      const controlStack: AsmControlFrame[] = [];
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      let opEndOffset = file.text.length;
      while (i < lineCount) {
        const { raw: rawLine, startOffset: so, endOffset: eo } = getRawLine(i);
        const content = stripComment(rawLine).trim();
        const contentLower = content.toLowerCase();
        if (content.length === 0) {
          i++;
          continue;
        }
        if (bodyItems.length === 0 && controlStack.length === 0 && contentLower === 'asm') {
          diag(diagnostics, modulePath, `Unexpected "asm" in op body (op bodies are implicit)`, {
            line: i + 1,
            column: 1,
          });
          i++;
          continue;
        }
        if (contentLower === 'end' && controlStack.length === 0) {
          terminated = true;
          opEndOffset = eo;
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(content);
        if (topKeyword !== undefined) {
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const fullSpan = span(file, so, eo);
        const contentStart = stripComment(rawLine).indexOf(content);
        const contentSpan =
          contentStart >= 0
            ? span(file, so + contentStart, so + stripComment(rawLine).length)
            : fullSpan;
        const labelMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(content);
        if (labelMatch) {
          const label = labelMatch[1]!;
          const remainder = labelMatch[2] ?? '';
          bodyItems.push({ kind: 'AsmLabel', span: fullSpan, name: label });
          if (remainder.trim().length > 0) {
            const stmt = parseAsmStatement(
              modulePath,
              remainder,
              contentSpan,
              diagnostics,
              controlStack,
            );
            appendParsedAsmStatement(bodyItems, stmt);
          }
          i++;
          continue;
        }

        const stmt = parseAsmStatement(modulePath, content, contentSpan, diagnostics, controlStack);
        appendParsedAsmStatement(bodyItems, stmt);
        i++;
      }

      if (!terminated) {
        if (interruptedByKeyword !== undefined && interruptedByLine !== undefined) {
          for (const frame of controlStack) {
            if (isRecoverOnlyControlFrame(frame)) continue;
            const frameSpan = frame.openSpan;
            const msg =
              frame.kind === 'Repeat'
                ? `"repeat" without matching "until <cc>"`
                : `"${frame.kind.toLowerCase()}" without matching "end"`;
            diag(diagnostics, modulePath, msg, {
              line: frameSpan.start.line,
              column: frameSpan.start.column,
            });
          }
          diag(
            diagnostics,
            modulePath,
            `Unterminated op "${name}": expected "end" before "${interruptedByKeyword}"`,
            { line: interruptedByLine, column: 1 },
          );
          continue;
        }
        for (const frame of controlStack) {
          if (isRecoverOnlyControlFrame(frame)) continue;
          const span = frame.openSpan;
          const msg =
            frame.kind === 'Repeat'
              ? `"repeat" without matching "until <cc>"`
              : `"${frame.kind.toLowerCase()}" without matching "end"`;
          diag(diagnostics, modulePath, msg, { line: span.start.line, column: span.start.column });
        }
        diag(diagnostics, modulePath, `Unterminated op "${name}": missing "end"`, {
          line: lineNo,
          column: 1,
        });
      }

      items.push({
        kind: 'OpDecl',
        span: span(file, opStartOffset, opEndOffset),
        name,
        exported,
        params,
        body: { kind: 'AsmBlock', span: span(file, opStartOffset, opEndOffset), items: bodyItems },
      } as OpDeclNode);
      continue;
    }

    const externTail = consumeTopKeyword(rest, 'extern');
    if (externTail !== undefined) {
      const decl = externTail.trim();
      const stmtSpan = span(file, lineStartOffset, lineEndOffset);
      const externFuncTail = consumeKeywordPrefix(decl, 'func');
      if (externFuncTail !== undefined) {
        const externFunc = parseExternFuncFromTail(externFuncTail, stmtSpan, lineNo);
        if (externFunc) {
          const externDecl: ExternDeclNode = {
            kind: 'ExternDecl',
            span: stmtSpan,
            funcs: [externFunc],
          };
          items.push(externDecl);
        }
        i++;
        continue;
      }

      if (decl.length > 0) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(decl)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid extern base name ${formatIdentifierToken(decl)}: expected <identifier>.`,
            { line: lineNo, column: 1 },
          );
          i = consumeInvalidExternBlock(i);
          continue;
        }
        if (isReservedTopLevelName(decl)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid extern base name "${decl}": collides with a top-level keyword.`,
            { line: lineNo, column: 1 },
          );
          i = consumeInvalidExternBlock(i);
          continue;
        }
      }

      // Block form:
      // extern [baseName]
      //   func ...
      // end
      //
      // To avoid swallowing unrelated malformed top-level declarations, require that
      // the first non-empty line after `extern` looks like `func ...` or `end`.
      let preview = i + 1;
      let previewText: string | undefined;
      while (preview < lineCount) {
        const { raw: rawPreview } = getRawLine(preview);
        const t = stripComment(rawPreview).trim();
        if (t.length === 0) {
          preview++;
          continue;
        }
        previewText = t;
        break;
      }
      const previewKeyword = previewText ? topLevelStartKeyword(previewText) : undefined;
      const previewLooksLikeExternBodyDecl =
        previewText !== undefined &&
        previewKeyword !== undefined &&
        looksLikeKeywordBodyDeclLine(previewText);
      if (
        previewText === undefined ||
        (previewText.toLowerCase() !== 'end' &&
          consumeKeywordPrefix(previewText, 'func') === undefined &&
          !previewLooksLikeExternBodyDecl)
      ) {
        diagInvalidHeaderLine(
          'extern declaration',
          text,
          '[<baseName>] or func <name>(...): <retType> at <imm16>',
          lineNo,
        );
        i++;
        continue;
      }

      const blockStart = lineStartOffset;
      const funcs: ExternFuncNode[] = [];
      const base = decl.length > 0 ? decl : undefined;
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      let blockEndOffset = file.text.length;
      i++;

      while (i < lineCount) {
        const { raw: rawDecl, startOffset: so, endOffset: eo } = getRawLine(i);
        const t = stripComment(rawDecl).trim();
        const tLower = t.toLowerCase();
        if (t.length === 0) {
          i++;
          continue;
        }
        if (tLower === 'end') {
          terminated = true;
          blockEndOffset = eo;
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(t);
        if (topKeyword !== undefined && consumeKeywordPrefix(t, 'func') === undefined) {
          if (looksLikeKeywordBodyDeclLine(t)) {
            diagInvalidBlockLine(
              'extern func declaration',
              t,
              'func <name>(...): <retType> at <imm16>',
              i + 1,
            );
            i++;
            continue;
          }
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const funcTail = consumeKeywordPrefix(t, 'func');
        if (funcTail === undefined) {
          diagInvalidBlockLine(
            'extern func declaration',
            t,
            'func <name>(...): <retType> at <imm16>',
            i + 1,
          );
          i++;
          continue;
        }

        const fn = parseExternFuncFromTail(funcTail, span(file, so, eo), i + 1);
        if (fn) funcs.push(fn);
        i++;
      }

      if (!terminated) {
        const namePart = base ? ` "${base}"` : '';
        if (interruptedByKeyword !== undefined && interruptedByLine !== undefined) {
          diag(
            diagnostics,
            modulePath,
            `Unterminated extern${namePart}: expected "end" before "${interruptedByKeyword}"`,
            { line: interruptedByLine, column: 1 },
          );
        } else {
          diag(diagnostics, modulePath, `Unterminated extern${namePart}: missing "end"`, {
            line: lineNo,
            column: 1,
          });
        }
      }
      if (funcs.length === 0) {
        diag(diagnostics, modulePath, `extern block must contain at least one func declaration`, {
          line: lineNo,
          column: 1,
        });
      }

      items.push({
        kind: 'ExternDecl',
        span: span(file, blockStart, terminated ? blockEndOffset : file.text.length),
        ...(base ? { base } : {}),
        funcs,
      });
      continue;
    }

    const enumTail = consumeTopKeyword(rest, 'enum');
    if (enumTail !== undefined) {
      const decl = enumTail;
      const nameMatch = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.*))?$/.exec(decl);
      if (!nameMatch) {
        const invalidName = decl.split(/\s+/, 1)[0] ?? '';
        if (invalidName.length > 0) {
          diag(
            diagnostics,
            modulePath,
            `Invalid enum name ${formatIdentifierToken(invalidName)}: expected <identifier>.`,
            { line: lineNo, column: 1 },
          );
        } else {
          diagInvalidHeaderLine('enum declaration', text, '<name> <member>[, ...]', lineNo);
        }
        i++;
        continue;
      }

      const name = nameMatch[1]!;
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid enum name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      const membersText = (nameMatch[2] ?? '').trim();
      if (membersText.length === 0) {
        diag(diagnostics, modulePath, `Enum "${name}" must declare at least one member`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }

      const rawParts = membersText.split(',').map((p) => p.trim());
      if (rawParts.some((p) => p.length === 0)) {
        diag(diagnostics, modulePath, `Trailing commas are not permitted in enum member lists`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }

      const members: string[] = [];
      const membersLower = new Set<string>();
      for (const m of rawParts) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(m)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid enum member name ${formatIdentifierToken(m)}: expected <identifier>.`,
            {
              line: lineNo,
              column: 1,
            },
          );
          continue;
        }
        if (isReservedTopLevelName(m)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid enum member name "${m}": collides with a top-level keyword.`,
            {
              line: lineNo,
              column: 1,
            },
          );
          continue;
        }
        const memberLower = m.toLowerCase();
        if (membersLower.has(memberLower)) {
          diag(diagnostics, modulePath, `Duplicate enum member name "${m}".`, {
            line: lineNo,
            column: 1,
          });
          continue;
        }
        membersLower.add(memberLower);
        members.push(m);
      }

      const enumSpan = span(file, lineStartOffset, lineEndOffset);
      const enumNode: EnumDeclNode = { kind: 'EnumDecl', span: enumSpan, name, members };
      items.push(enumNode);
      i++;
      continue;
    }

    const sectionTail = consumeTopKeyword(rest, 'section');
    if (rest.toLowerCase() === 'section' || sectionTail !== undefined) {
      const decl = rest === 'section' ? '' : (sectionTail ?? '');
      const m = /^(code|data|var)(?:\s+at\s+(.+))?$/.exec(decl);
      if (!m) {
        diagInvalidHeaderLine('section directive', text, '<code|data|var> [at <imm16>]', lineNo);
        i++;
        continue;
      }

      const section = m[1]! as SectionDirectiveNode['section'];
      const atText = m[2]?.trim();
      const dirSpan = span(file, lineStartOffset, lineEndOffset);
      const at = atText
        ? parseImmExprFromText(modulePath, atText, dirSpan, diagnostics)
        : undefined;

      const sectionNode: SectionDirectiveNode = {
        kind: 'Section',
        span: dirSpan,
        section,
        ...(at ? { at } : {}),
      };
      items.push(sectionNode);
      i++;
      continue;
    }

    const alignTail = consumeTopKeyword(rest, 'align');
    if (rest.toLowerCase() === 'align' || alignTail !== undefined) {
      const exprText = rest === 'align' ? '' : (alignTail ?? '');
      if (exprText.length === 0) {
        diagInvalidHeaderLine('align directive', text, '<imm16>', lineNo);
        i++;
        continue;
      }
      const dirSpan = span(file, lineStartOffset, lineEndOffset);
      const value = parseImmExprFromText(modulePath, exprText, dirSpan, diagnostics);
      if (!value) {
        i++;
        continue;
      }
      const alignNode: AlignDirectiveNode = { kind: 'Align', span: dirSpan, value };
      items.push(alignNode);
      i++;
      continue;
    }

    const constTail = consumeTopKeyword(rest, 'const');
    if (constTail !== undefined) {
      const decl = constTail;
      const eq = decl.indexOf('=');
      if (eq < 0) {
        diagInvalidHeaderLine('const declaration', text, '<name> = <imm>', lineNo);
        i++;
        continue;
      }

      const name = decl.slice(0, eq).trim();
      const rhs = decl.slice(eq + 1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid const name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid const name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (rhs.length === 0) {
        diag(diagnostics, modulePath, `Invalid const declaration: missing initializer`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }

      const exprSpan = span(file, lineStartOffset, lineEndOffset);
      const expr = parseImmExprFromText(modulePath, rhs, exprSpan, diagnostics);
      if (!expr) {
        i++;
        continue;
      }

      const constNode: ConstDeclNode = {
        kind: 'ConstDecl',
        span: exprSpan,
        name,
        exported: hasExportPrefix,
        value: expr,
      };
      items.push(constNode);
      i++;
      continue;
    }

    const binTail = consumeTopKeyword(rest, 'bin');
    if (binTail !== undefined) {
      const m = /^(\S+)\s+in\s+(\S+)\s+from\s+(.+)$/.exec(binTail.trim());
      if (!m) {
        diagInvalidHeaderLine(
          'bin declaration',
          text,
          '<name> in <code|data> from "<path>"',
          lineNo,
        );
        i++;
        continue;
      }
      const name = m[1]!;
      const sectionText = m[2]!.toLowerCase();
      const pathText = m[3]!.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid bin name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (sectionText === 'var') {
        diag(diagnostics, modulePath, `bin declarations cannot target section "var"`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }
      if (sectionText !== 'code' && sectionText !== 'data') {
        diag(
          diagnostics,
          modulePath,
          `Invalid bin section "${m[2]!}": expected "code" or "data".`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid bin name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (!(pathText.startsWith('"') && pathText.endsWith('"') && pathText.length >= 2)) {
        diag(diagnostics, modulePath, `Invalid bin declaration: expected quoted source path`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }
      const node: BinDeclNode = {
        kind: 'BinDecl',
        span: span(file, lineStartOffset, lineEndOffset),
        name,
        section: sectionText as BinDeclNode['section'],
        fromPath: pathText.slice(1, -1),
      };
      items.push(node);
      i++;
      continue;
    }

    const hexTail = consumeTopKeyword(rest, 'hex');
    if (hexTail !== undefined) {
      const m = /^(\S+)\s+from\s+(.+)$/.exec(hexTail.trim());
      if (!m) {
        diagInvalidHeaderLine('hex declaration', text, '<name> from "<path>"', lineNo);
        i++;
        continue;
      }
      const name = m[1]!;
      const pathText = m[2]!.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid hex name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid hex name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (!(pathText.startsWith('"') && pathText.endsWith('"') && pathText.length >= 2)) {
        diag(diagnostics, modulePath, `Invalid hex declaration: expected quoted source path`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }
      const node: HexDeclNode = {
        kind: 'HexDecl',
        span: span(file, lineStartOffset, lineEndOffset),
        name,
        fromPath: pathText.slice(1, -1),
      };
      items.push(node);
      i++;
      continue;
    }

    if (rest.toLowerCase() === 'data') {
      const blockStart = lineStartOffset;
      i++;
      const decls: DataDeclNode[] = [];
      const declNamesLower = new Set<string>();

      while (i < lineCount) {
        const { raw: rawDecl, startOffset: so, endOffset: eo } = getRawLine(i);
        const t = stripComment(rawDecl).trim();
        if (t.length === 0) {
          i++;
          continue;
        }
        if (isTopLevelStart(t)) {
          const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^=]+?)\s*=\s*(.+)$/.exec(t);
          if (m && TOP_LEVEL_KEYWORDS.has(m[1]!.toLowerCase())) {
            diag(
              diagnostics,
              modulePath,
              `Invalid data declaration name "${m[1]!}": collides with a top-level keyword.`,
              { line: i + 1, column: 1 },
            );
            i++;
            continue;
          }
          if (looksLikeKeywordBodyDeclLine(t)) {
            diagInvalidBlockLine('data declaration', t, '<name>: <type> = <initializer>', i + 1);
            i++;
            continue;
          }
          break;
        }

        const m = /^([^:]+)\s*:\s*([^=]+?)\s*=\s*(.+)$/.exec(t);
        if (!m) {
          diagInvalidBlockLine('data declaration', t, '<name>: <type> = <initializer>', i + 1);
          i++;
          continue;
        }

        const name = m[1]!.trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid data declaration name ${formatIdentifierToken(name)}: expected <identifier>.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        if (TOP_LEVEL_KEYWORDS.has(name.toLowerCase())) {
          diag(
            diagnostics,
            modulePath,
            `Invalid data declaration name "${name}": collides with a top-level keyword.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        const nameLower = name.toLowerCase();
        if (declNamesLower.has(nameLower)) {
          diag(diagnostics, modulePath, `Duplicate data declaration name "${name}".`, {
            line: i + 1,
            column: 1,
          });
          i++;
          continue;
        }
        declNamesLower.add(nameLower);
        const typeText = m[2]!.trim();
        const initText = m[3]!.trim();

        const lineSpan = span(file, so, eo);
        const typeExpr = parseTypeExprFromText(typeText, lineSpan, {
          allowInferredArrayLength: true,
        });

        if (!typeExpr) {
          diagInvalidBlockLine('data declaration', t, '<name>: <type> = <initializer>', i + 1);
          i++;
          continue;
        }

        let initializer: DataDeclNode['initializer'] | undefined;
        if (initText.startsWith('"') && initText.endsWith('"') && initText.length >= 2) {
          initializer = { kind: 'InitString', span: lineSpan, value: initText.slice(1, -1) };
        } else if (initText.startsWith('{') && initText.endsWith('}')) {
          const inner = initText.slice(1, -1).trim();
          const parts = inner.length === 0 ? [] : splitTopLevelComma(inner).map((p) => p.trim());
          const namedFields: DataRecordFieldInitNode[] = [];
          const positionalElements: ImmExprNode[] = [];
          let sawNamed = false;
          let sawPositional = false;
          let parseFailed = false;

          for (const part of parts) {
            if (part.length === 0) {
              parseFailed = true;
              break;
            }
            const namedMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(part);
            if (namedMatch) {
              sawNamed = true;
              const value = parseImmExprFromText(
                modulePath,
                namedMatch[2]!.trim(),
                lineSpan,
                diagnostics,
              );
              if (!value) {
                parseFailed = true;
                continue;
              }
              namedFields.push({
                kind: 'DataRecordFieldInit',
                span: lineSpan,
                name: namedMatch[1]!,
                value,
              });
              continue;
            }
            sawPositional = true;
            const e = parseImmExprFromText(modulePath, part, lineSpan, diagnostics);
            if (!e) {
              parseFailed = true;
              continue;
            }
            positionalElements.push(e);
          }

          if (sawNamed && sawPositional) {
            diag(
              diagnostics,
              modulePath,
              `Mixed positional and named aggregate initializer entries are not allowed for "${name}".`,
              { line: i + 1, column: 1 },
            );
            parseFailed = true;
          }

          if (!parseFailed) {
            initializer = sawNamed
              ? { kind: 'InitRecordNamed', span: lineSpan, fields: namedFields }
              : { kind: 'InitArray', span: lineSpan, elements: positionalElements };
          }
        } else if (initText.startsWith('[') && initText.endsWith(']')) {
          const inner = initText.slice(1, -1).trim();
          const parts = inner.length === 0 ? [] : splitTopLevelComma(inner).map((p) => p.trim());
          const elements: ImmExprNode[] = [];
          for (const part of parts) {
            const e = parseImmExprFromText(modulePath, part, lineSpan, diagnostics);
            if (e) elements.push(e);
          }
          initializer = { kind: 'InitArray', span: lineSpan, elements };
        } else {
          const e = parseImmExprFromText(modulePath, initText, lineSpan, diagnostics);
          if (e) initializer = { kind: 'InitArray', span: lineSpan, elements: [e] };
        }

        if (!initializer) {
          i++;
          continue;
        }

        const declNode: DataDeclNode = {
          kind: 'DataDecl',
          span: lineSpan,
          name,
          typeExpr,
          initializer,
        };
        decls.push(declNode);
        i++;
      }

      const blockEnd = i < lineCount ? (getRawLine(i).startOffset ?? blockStart) : file.text.length;
      const dataBlock: DataBlockNode = {
        kind: 'DataBlock',
        span: span(file, blockStart, blockEnd),
        decls,
      };
      items.push(dataBlock);
      continue;
    }

    const asmTail = consumeKeywordPrefix(text, 'asm');
    const asmAfterExportTail = hasExportPrefix ? consumeKeywordPrefix(rest, 'asm') : undefined;
    if (asmTail !== undefined || asmAfterExportTail !== undefined) {
      diag(
        diagnostics,
        modulePath,
        `"asm" is not a top-level construct (function and op bodies are implicit instruction streams)`,
        {
          line: lineNo,
          column: 1,
        },
      );
      i++;
      continue;
    }

    let matchedMalformedTopLevelHeader = false;
    for (const expectation of malformedTopLevelHeaderExpectations) {
      if (hasTopKeyword(expectation.keyword)) {
        diagInvalidHeaderLine(expectation.kind, text, expectation.expected, lineNo);
        i++;
        matchedMalformedTopLevelHeader = true;
        break;
      }
    }
    if (matchedMalformedTopLevelHeader) {
      continue;
    }

    diag(diagnostics, modulePath, `Unsupported top-level construct: ${text}`, {
      line: lineNo,
      column: 1,
    });
    i++;
  }

  const moduleSpan = span(file, 0, sourceText.length);
  const moduleFile: ModuleFileNode = {
    kind: 'ModuleFile',
    span: moduleSpan,
    path: modulePath,
    items,
  };

  return moduleFile;
}

/**
 * Parse a ZAX program from a single in-memory source file.
 *
 * Note: this helper parses only the entry module. Import resolution/loading is handled by the compiler.
 */
export function parseProgram(
  entryFile: string,
  sourceText: string,
  diagnostics: Diagnostic[],
): ProgramNode {
  const moduleFile = parseModuleFile(entryFile, sourceText, diagnostics);
  const moduleSpan = moduleFile.span;
  const program: ProgramNode = {
    kind: 'Program',
    span: moduleSpan,
    entryFile,
    files: [moduleFile],
  };

  return program;
}
