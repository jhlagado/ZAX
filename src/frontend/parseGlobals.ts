import type { VarBlockNode, VarDeclNode } from './ast.js';
import type { SourceFile } from './source.js';
import { span } from './source.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import {
  TOP_LEVEL_KEYWORDS,
  diagInvalidBlockLine,
  isTopLevelStart,
  looksLikeKeywordBodyDeclLine,
  parseVarDeclLine,
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

type RawLine = {
  raw: string;
  startOffset: number;
  endOffset: number;
};

type ParseGlobalsContext = {
  file: SourceFile;
  lineCount: number;
  diagnostics: Diagnostic[];
  modulePath: string;
  getRawLine: (lineIndex: number) => RawLine;
  isReservedTopLevelName: (name: string) => boolean;
};

type ParsedGlobalsBlock = {
  varBlock: VarBlockNode;
  nextIndex: number;
};

export function parseGlobalsBlock(
  storageHeader: 'var' | 'globals',
  startIndex: number,
  lineNo: number,
  ctx: ParseGlobalsContext,
): ParsedGlobalsBlock {
  const { file, lineCount, diagnostics, modulePath, getRawLine, isReservedTopLevelName } = ctx;
  if (storageHeader === 'var') {
    diag(diagnostics, modulePath, `Top-level "var" block has been renamed to "globals".`, {
      line: lineNo,
      column: 1,
    });
  }

  const blockDeclKind = 'globals declaration';
  const blockHeaderExpected = 'globals';
  const blockStart = getRawLine(startIndex).startOffset;
  let index = startIndex + 1;
  const decls: VarDeclNode[] = [];
  const declNamesLower = new Set<string>();

  while (index < lineCount) {
    const { raw: rawDecl, startOffset: so, endOffset: eo } = getRawLine(index);
    const t = stripComment(rawDecl).trim();
    if (t.length === 0) {
      index++;
      continue;
    }
    if (isTopLevelStart(t)) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.+)$/.exec(t);
      if (m && TOP_LEVEL_KEYWORDS.has(m[1]!)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid globals declaration name "${m[1]!}": collides with a top-level keyword.`,
          { line: index + 1, column: 1 },
        );
        index++;
        continue;
      }
      if (looksLikeKeywordBodyDeclLine(t)) {
        diagInvalidBlockLine(
          diagnostics,
          modulePath,
          blockDeclKind,
          t,
          '<name>: <type>',
          index + 1,
        );
        index++;
        continue;
      }
      break;
    }
    const declSpan = span(file, so, eo);
    const parsed = parseVarDeclLine(t, declSpan, index + 1, 'globals', {
      diagnostics,
      modulePath,
      isReservedTopLevelName,
    });
    if (!parsed) {
      if (/^globals\b/i.test(t)) {
        diagInvalidBlockLine(
          diagnostics,
          modulePath,
          blockDeclKind,
          t,
          blockHeaderExpected,
          index + 1,
        );
      }
      index++;
      continue;
    }
    const nameLower = parsed.name.toLowerCase();
    if (declNamesLower.has(nameLower)) {
      diag(diagnostics, modulePath, `Duplicate globals declaration name "${parsed.name}".`, {
        line: index + 1,
        column: 1,
      });
      index++;
      continue;
    }
    if (nameLower === 'globals') {
      diag(
        diagnostics,
        modulePath,
        `Invalid globals declaration name "${parsed.name}": collides with a top-level keyword.`,
        {
          line: index + 1,
          column: 1,
        },
      );
      index++;
      continue;
    }
    declNamesLower.add(nameLower);
    decls.push(parsed);
    index++;
  }

  const blockEnd =
    index < lineCount ? (getRawLine(index).startOffset ?? blockStart) : file.text.length;
  return {
    varBlock: {
      kind: 'VarBlock',
      span: span(file, blockStart, blockEnd),
      scope: 'module',
      decls,
    },
    nextIndex: index,
  };
}
