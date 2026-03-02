import type { DataBlockNode, DataDeclNode, DataRecordFieldInitNode, ImmExprNode } from './ast.js';
import type { SourceFile } from './source.js';
import { span } from './source.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import { parseImmExprFromText, parseTypeExprFromText } from './parseImm.js';
import {
  TOP_LEVEL_KEYWORDS,
  diagInvalidBlockLine,
  formatIdentifierToken,
  isTopLevelStart,
  looksLikeKeywordBodyDeclLine,
} from './parseModuleCommon.js';

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

type RawLine = {
  raw: string;
  startOffset: number;
  endOffset: number;
};

type ParseDataContext = {
  file: SourceFile;
  lineCount: number;
  diagnostics: Diagnostic[];
  modulePath: string;
  getRawLine: (lineIndex: number) => RawLine;
};

type ParsedDataBlock = {
  node: DataBlockNode;
  nextIndex: number;
};

export function parseDataBlock(startIndex: number, ctx: ParseDataContext): ParsedDataBlock {
  const { file, lineCount, diagnostics, modulePath, getRawLine } = ctx;
  const blockStart = getRawLine(startIndex).startOffset;
  let index = startIndex + 1;
  const decls: DataDeclNode[] = [];
  const declNamesLower = new Set<string>();

  while (index < lineCount) {
    const { raw: rawDecl, startOffset: so, endOffset: eo } = getRawLine(index);
    const t = stripComment(rawDecl).trim();
    if (t.length === 0) {
      index++;
      continue;
    }
    if (isTopLevelStart(t)) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^=]+?)\s*=\s*(.+)$/.exec(t);
      if (m && TOP_LEVEL_KEYWORDS.has(m[1]!.toLowerCase())) {
        diag(
          diagnostics,
          modulePath,
          `Invalid data declaration name "${m[1]!}": collides with a top-level keyword.`,
          { line: index + 1, column: 1 },
        );
        index++;
        continue;
      }
      if (looksLikeKeywordBodyDeclLine(t)) {
        diagInvalidBlockLine(
          diagnostics,
          modulePath,
          'data declaration',
          t,
          '<name>: <type> = <initializer>',
          index + 1,
        );
        index++;
        continue;
      }
      break;
    }

    const m = /^([^:]+)\s*:\s*([^=]+?)\s*=\s*(.+)$/.exec(t);
    if (!m) {
      diagInvalidBlockLine(
        diagnostics,
        modulePath,
        'data declaration',
        t,
        '<name>: <type> = <initializer>',
        index + 1,
      );
      index++;
      continue;
    }

    const name = m[1]!.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      diag(
        diagnostics,
        modulePath,
        `Invalid data declaration name ${formatIdentifierToken(name)}: expected <identifier>.`,
        { line: index + 1, column: 1 },
      );
      index++;
      continue;
    }
    if (TOP_LEVEL_KEYWORDS.has(name.toLowerCase())) {
      diag(
        diagnostics,
        modulePath,
        `Invalid data declaration name "${name}": collides with a top-level keyword.`,
        { line: index + 1, column: 1 },
      );
      index++;
      continue;
    }
    const nameLower = name.toLowerCase();
    if (declNamesLower.has(nameLower)) {
      diag(diagnostics, modulePath, `Duplicate data declaration name "${name}".`, {
        line: index + 1,
        column: 1,
      });
      index++;
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
      diagInvalidBlockLine(
        diagnostics,
        modulePath,
        'data declaration',
        t,
        '<name>: <type> = <initializer>',
        index + 1,
      );
      index++;
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
          { line: index + 1, column: 1 },
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
      index++;
      continue;
    }

    decls.push({
      kind: 'DataDecl',
      span: lineSpan,
      name,
      typeExpr,
      initializer,
    });
    index++;
  }

  const blockEnd =
    index < lineCount ? (getRawLine(index).startOffset ?? blockStart) : file.text.length;
  return {
    node: {
      kind: 'DataBlock',
      span: span(file, blockStart, blockEnd),
      decls,
    },
    nextIndex: index,
  };
}
