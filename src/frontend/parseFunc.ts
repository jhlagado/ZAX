import type {
  AsmBlockNode,
  AsmItemNode,
  AsmLabelNode,
  FuncDeclNode,
  ParamNode,
  SourceSpan,
  VarBlockNode,
  VarDeclNode,
} from './ast.js';
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
  diagInvalidBlockLine,
  diagInvalidHeaderLine,
  formatIdentifierToken,
  looksLikeKeywordBodyDeclLine,
  parseReturnRegsFromText,
  parseVarDeclLine,
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

type ParseFuncContext = {
  file: SourceFile;
  lineCount: number;
  diagnostics: Diagnostic[];
  modulePath: string;
  getRawLine: (lineIndex: number) => RawLine;
  parseParamsFromText: (
    filePath: string,
    paramsText: string,
    paramsSpan: SourceSpan,
    diagnostics: Diagnostic[],
    ctx: ParseParamsContext,
  ) => ParamNode[] | undefined;
} & ParseParamsContext;

type ParsedFuncDecl = {
  node?: FuncDeclNode;
  nextIndex: number;
};

export function parseTopLevelFuncDecl(
  funcTail: string,
  stmtText: string,
  stmtSpan: SourceSpan,
  lineNo: number,
  startIndex: number,
  exported: boolean,
  ctx: ParseFuncContext,
): ParsedFuncDecl {
  const {
    file,
    lineCount,
    diagnostics,
    modulePath,
    getRawLine,
    isReservedTopLevelName,
    parseParamsFromText,
  } = ctx;
  const header = funcTail;
  const openParen = header.indexOf('(');
  const closeParen = header.lastIndexOf(')');
  if (openParen < 0 || closeParen < openParen) {
    diagInvalidHeaderLine(
      diagnostics,
      modulePath,
      'func header',
      stmtText,
      '<name>(...): <retType>',
      lineNo,
    );
    return { nextIndex: startIndex + 1 };
  }

  const name = header.slice(0, openParen).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid func name ${formatIdentifierToken(name)}: expected <identifier>.`,
      { line: lineNo, column: 1 },
    );
    return { nextIndex: startIndex + 1 };
  }
  if (isReservedTopLevelName(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid func name "${name}": collides with a top-level keyword.`,
      {
        line: lineNo,
        column: 1,
      },
    );
    return { nextIndex: startIndex + 1 };
  }

  const funcStartOffset = stmtSpan.start.offset;
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
      return { nextIndex: startIndex + 1 };
    }
    const parsedRegs = parseReturnRegsFromText(
      retMatch[1]!.trim(),
      stmtSpan,
      lineNo,
      diagnostics,
      modulePath,
    );
    if (!parsedRegs) return { nextIndex: startIndex + 1 };
    returnRegs = parsedRegs.regs;
  }

  const paramsText = header.slice(openParen + 1, closeParen);
  const params = parseParamsFromText(modulePath, paramsText, stmtSpan, diagnostics, {
    isReservedTopLevelName,
  });
  if (!params) return { nextIndex: startIndex + 1 };

  let index = startIndex + 1;

  let locals: VarBlockNode | undefined;
  let asmStartOffset: number | undefined;
  let interruptedBeforeBodyKeyword: string | undefined;
  let interruptedBeforeBodyLine: number | undefined;
  while (index < lineCount) {
    const { raw: raw2, startOffset: so2 } = getRawLine(index);
    const t2 = stripComment(raw2).trim();
    const t2Lower = t2.toLowerCase();
    if (t2.length === 0) {
      index++;
      continue;
    }
    const t2TopKeyword = topLevelStartKeyword(t2);
    if (t2TopKeyword !== undefined && t2Lower !== 'var') {
      interruptedBeforeBodyKeyword = t2TopKeyword;
      interruptedBeforeBodyLine = index + 1;
      break;
    }

    if (t2Lower === 'var') {
      const varStart = so2;
      index++;
      const decls: VarDeclNode[] = [];
      const declNamesLower = new Set<string>();
      let varTerminated = false;

      while (index < lineCount) {
        const { raw: rawDecl, startOffset: soDecl, endOffset: eoDecl } = getRawLine(index);
        const tDecl = stripComment(rawDecl).trim();
        const tDeclLower = tDecl.toLowerCase();
        if (tDecl.length === 0) {
          index++;
          continue;
        }
        if (tDeclLower === 'end') {
          locals = {
            kind: 'VarBlock',
            span: span(file, varStart, eoDecl),
            scope: 'function',
            decls,
          };
          index++;
          varTerminated = true;
          break;
        }
        if (tDeclLower === 'asm') {
          diag(
            diagnostics,
            modulePath,
            `Function-local var block must end with "end" before function body`,
            { line: index + 1, column: 1 },
          );
          locals = {
            kind: 'VarBlock',
            span: span(file, varStart, soDecl),
            scope: 'function',
            decls,
          };
          index++;
          varTerminated = true;
          break;
        }
        const tDeclTopKeyword = topLevelStartKeyword(tDecl);
        if (tDeclTopKeyword !== undefined) {
          if (looksLikeKeywordBodyDeclLine(tDecl)) {
            diagInvalidBlockLine(
              diagnostics,
              modulePath,
              'var declaration',
              tDecl,
              '<name>: <type>',
              index + 1,
            );
            index++;
            continue;
          }
          interruptedBeforeBodyKeyword = tDeclTopKeyword;
          interruptedBeforeBodyLine = index + 1;
          locals = {
            kind: 'VarBlock',
            span: span(file, varStart, soDecl),
            scope: 'function',
            decls,
          };
          break;
        }

        const declSpan = span(file, soDecl, eoDecl);
        const parsed = parseVarDeclLine(tDecl, declSpan, index + 1, 'var', {
          diagnostics,
          modulePath,
          isReservedTopLevelName,
        });
        if (!parsed) {
          index++;
          continue;
        }
        const localNameLower = parsed.name.toLowerCase();
        if (declNamesLower.has(localNameLower)) {
          diag(diagnostics, modulePath, `Duplicate var declaration name "${parsed.name}".`, {
            line: index + 1,
            column: 1,
          });
          index++;
          continue;
        }
        declNamesLower.add(localNameLower);
        decls.push(parsed);
        index++;
      }
      if (interruptedBeforeBodyKeyword !== undefined) break;
      if (!varTerminated) {
        diag(
          diagnostics,
          modulePath,
          `Unterminated func "${name}": expected "end" to terminate var block`,
          {
            line: lineNo,
            column: 1,
          },
        );
        return { nextIndex: index };
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
      return { nextIndex: index };
    }
    diag(diagnostics, modulePath, `Unterminated func "${name}": expected function body`, {
      line: lineNo,
      column: 1,
    });
    return { nextIndex: lineCount };
  }

  const asmItems: AsmItemNode[] = [];
  const asmControlStack: AsmControlFrame[] = [];
  let terminated = false;
  let interruptedByKeyword: string | undefined;
  let interruptedByLine: number | undefined;
  while (index < lineCount) {
    const { raw: rawLine, startOffset: lineOffset, endOffset } = getRawLine(index);
    const withoutComment = stripComment(rawLine);
    const content = withoutComment.trim();
    const contentLower = content.toLowerCase();
    if (content.length === 0) {
      index++;
      continue;
    }
    if (contentLower === 'asm' && asmControlStack.length === 0 && asmItems.length === 0) {
      diag(
        diagnostics,
        modulePath,
        `Unexpected "asm" in function body (function bodies are implicit)`,
        { line: index + 1, column: 1 },
      );
      index++;
      continue;
    }

    if (contentLower === 'end' && asmControlStack.length === 0) {
      terminated = true;
      const funcEndOffset = endOffset;
      const funcSpan = span(file, funcStartOffset, funcEndOffset);
      const asmSpan = span(file, asmStartOffset, funcEndOffset);
      const asm: AsmBlockNode = { kind: 'AsmBlock', span: asmSpan, items: asmItems };

      return {
        node: {
          kind: 'FuncDecl',
          span: funcSpan,
          name,
          exported,
          params,
          ...(returnRegs ? { returnRegs } : {}),
          ...(locals ? { locals } : {}),
          asm,
        },
        nextIndex: index + 1,
      };
    }
    const topKeyword = topLevelStartKeyword(content);
    if (topKeyword !== undefined) {
      interruptedByKeyword = topKeyword;
      interruptedByLine = index + 1;
      break;
    }

    const fullSpan = span(file, lineOffset, endOffset);
    const contentStart = withoutComment.indexOf(content);
    const contentSpan =
      contentStart >= 0
        ? span(file, lineOffset + contentStart, lineOffset + withoutComment.length)
        : fullSpan;

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
      index++;
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
    index++;
  }

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
    return { nextIndex: index };
  }
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
  diag(diagnostics, modulePath, `Unterminated func "${name}": missing "end"`, {
    line: lineNo,
    column: 1,
  });
  return { nextIndex: lineCount };
}
