import type { AsmBlockNode, AsmItemNode, OpDeclNode, OpParamNode, SourceSpan } from './ast.js';
import type { SourceFile } from './source.js';
import { span } from './source.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import {
  appendParsedAsmStatement,
  isRecoverOnlyControlFrame,
  parseAsmStatement,
  type AsmControlFrame,
} from './parseAsmStatements.js';
import {
  diagInvalidHeaderLine,
  formatIdentifierToken,
  parseReturnRegsFromText,
  topLevelStartKeyword,
} from './parseModuleCommon.js';
import type { ParseParamsContext } from './parseParams.js';

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

type ParseOpContext = {
  file: SourceFile;
  lineCount: number;
  diagnostics: Diagnostic[];
  modulePath: string;
  getRawLine: (lineIndex: number) => RawLine;
  parseOpParamsFromText: (
    filePath: string,
    paramsText: string,
    paramsSpan: SourceSpan,
    diagnostics: Diagnostic[],
    ctx: ParseParamsContext,
  ) => OpParamNode[] | undefined;
} & ParseParamsContext;

type ParsedOpDecl = {
  node: OpDeclNode;
  nextIndex: number;
};

export function parseTopLevelOpDecl(
  opTail: string,
  stmtText: string,
  stmtSpan: SourceSpan,
  lineNo: number,
  startIndex: number,
  exported: boolean,
  ctx: ParseOpContext,
): ParsedOpDecl | undefined {
  const {
    file,
    lineCount,
    diagnostics,
    modulePath,
    getRawLine,
    isReservedTopLevelName,
    parseOpParamsFromText,
  } = ctx;
  const header = opTail;
  const openParen = header.indexOf('(');
  const closeParen = header.lastIndexOf(')');
  if (openParen < 0 || closeParen < openParen) {
    diagInvalidHeaderLine(diagnostics, modulePath, 'op header', stmtText, '<name>(...)', lineNo);
    return undefined;
  }

  const name = header.slice(0, openParen).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid op name ${formatIdentifierToken(name)}: expected <identifier>.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }
  if (isReservedTopLevelName(name)) {
    diag(diagnostics, modulePath, `Invalid op name "${name}": collides with a top-level keyword.`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }

  const trailing = header.slice(closeParen + 1).trim();
  if (trailing.length > 0) {
    diag(diagnostics, modulePath, `Invalid op header: unexpected trailing tokens`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }

  const opStartOffset = stmtSpan.start.offset;
  const paramsText = header.slice(openParen + 1, closeParen);
  const params = parseOpParamsFromText(modulePath, paramsText, stmtSpan, diagnostics, {
    isReservedTopLevelName,
  });
  if (!params) return undefined;

  let index = startIndex + 1;
  const bodyItems: AsmItemNode[] = [];
  const controlStack: AsmControlFrame[] = [];
  let terminated = false;
  let interruptedByKeyword: string | undefined;
  let interruptedByLine: number | undefined;
  let opEndOffset = file.text.length;
  while (index < lineCount) {
    const { raw: rawLine, startOffset: so, endOffset: eo } = getRawLine(index);
    const rawNoComment = stripComment(rawLine);
    const content = rawNoComment.trim();
    const contentLower = content.toLowerCase();
    if (content.length === 0) {
      index++;
      continue;
    }
    if (bodyItems.length === 0 && controlStack.length === 0 && contentLower === 'asm') {
      diag(diagnostics, modulePath, `Unexpected "asm" in op body (op bodies are implicit)`, {
        line: index + 1,
        column: 1,
      });
      index++;
      continue;
    }
    if (contentLower === 'end' && controlStack.length === 0) {
      terminated = true;
      opEndOffset = eo;
      index++;
      break;
    }
    const topKeyword = topLevelStartKeyword(content);
    if (topKeyword !== undefined) {
      interruptedByKeyword = topKeyword;
      interruptedByLine = index + 1;
      break;
    }

    const fullSpan = span(file, so, eo);
    const contentStart = rawNoComment.indexOf(content);
    const contentSpan =
      contentStart >= 0 ? span(file, so + contentStart, so + rawNoComment.length) : fullSpan;
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
      index++;
      continue;
    }

    const stmt = parseAsmStatement(modulePath, content, contentSpan, diagnostics, controlStack);
    appendParsedAsmStatement(bodyItems, stmt);
    index++;
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
        {
          line: interruptedByLine,
          column: 1,
        },
      );
    } else {
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
      diag(diagnostics, modulePath, `Unterminated op "${name}": missing "end"`, {
        line: lineNo,
        column: 1,
      });
    }
  }

  return {
    node: {
      kind: 'OpDecl',
      span: span(file, opStartOffset, opEndOffset),
      name,
      exported,
      params,
      body: {
        kind: 'AsmBlock',
        span: span(file, opStartOffset, opEndOffset),
        items: bodyItems,
      } as AsmBlockNode,
    },
    nextIndex: index,
  };
}
