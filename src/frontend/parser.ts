import type { ModuleFileNode, ModuleItemNode, ProgramNode } from './ast.js';
import { makeSourceFile, span } from './source.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import {
  TOP_LEVEL_KEYWORDS,
  consumeKeywordPrefix,
  consumeTopKeyword,
  diagInvalidBlockLine,
  diagInvalidHeaderLine,
  formatIdentifierToken,
  isTopLevelStart,
  looksLikeKeywordBodyDeclLine,
  malformedTopLevelHeaderExpectations,
  topLevelStartKeyword,
  unsupportedExportTargetKind,
} from './parseModuleCommon.js';
import { parseTopLevelExternDecl } from './parseExternBlock.js';
import { parseEnumDecl } from './parseEnum.js';
import { parseTopLevelFuncDecl } from './parseFunc.js';
import { parseGlobalsBlock } from './parseGlobals.js';
import { parseTopLevelOpDecl } from './parseOp.js';
import { parseOpParamsFromText, parseParamsFromText } from './parseParams.js';
import { parseTypeDecl, parseUnionDecl } from './parseTypes.js';
import {
  parseAlignDirectiveDecl,
  parseBinDecl,
  parseConstDecl,
  parseHexDecl,
  parseImportDecl,
  parseSectionDirectiveDecl,
} from './parseTopLevelSimple.js';
import { parseDataBlock } from './parseData.js';

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

  function isReservedTopLevelName(name: string): boolean {
    return isReservedTopLevelDeclName(name);
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
      const stmtSpan = span(file, lineStartOffset, lineEndOffset);
      const importNode = parseImportDecl(importTail, {
        diagnostics,
        modulePath,
        lineNo,
        text,
        span: stmtSpan,
        isReservedTopLevelName,
      });
      if (importNode) items.push(importNode);
      i++;
      continue;
    }

    const typeTail = consumeTopKeyword(rest, 'type');
    if (typeTail !== undefined) {
      const parsedType = parseTypeDecl(
        typeTail,
        text,
        span(file, lineStartOffset, lineEndOffset),
        lineNo,
        i,
        {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
        },
      );
      if (!parsedType) {
        i++;
        continue;
      }
      items.push(parsedType.node);
      i = parsedType.nextIndex;
      continue;
    }

    const unionTail = consumeTopKeyword(rest, 'union');
    if (unionTail !== undefined) {
      const parsedUnion = parseUnionDecl(
        unionTail,
        text,
        span(file, lineStartOffset, lineEndOffset),
        lineNo,
        i,
        {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
        },
      );
      if (!parsedUnion) {
        i++;
        continue;
      }
      items.push(parsedUnion.node);
      i = parsedUnion.nextIndex;
      continue;
    }

    const storageHeader = rest.toLowerCase();
    if (storageHeader === 'var' || storageHeader === 'globals') {
      const parsedGlobals = parseGlobalsBlock(storageHeader, i, lineNo, {
        file,
        lineCount,
        diagnostics,
        modulePath,
        getRawLine,
        isReservedTopLevelName,
      });
      items.push(parsedGlobals.varBlock);
      i = parsedGlobals.nextIndex;
      continue;
    }

    const funcTail = consumeTopKeyword(rest, 'func');
    if (funcTail !== undefined) {
      const parsedFunc = parseTopLevelFuncDecl(
        funcTail,
        text,
        span(file, lineStartOffset, lineEndOffset),
        lineNo,
        i,
        hasExportPrefix,
        {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
          parseParamsFromText,
        },
      );
      if (parsedFunc.node) items.push(parsedFunc.node);
      i = parsedFunc.nextIndex;
      continue;
    }

    const opTail = consumeTopKeyword(rest, 'op');
    if (opTail !== undefined) {
      const parsedOp = parseTopLevelOpDecl(
        opTail,
        text,
        span(file, lineStartOffset, lineEndOffset),
        lineNo,
        i,
        hasExportPrefix,
        {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
          parseOpParamsFromText,
        },
      );
      if (!parsedOp) {
        i++;
        continue;
      }
      items.push(parsedOp.node);
      i = parsedOp.nextIndex;
      continue;
    }

    const externTail = consumeTopKeyword(rest, 'extern');
    if (externTail !== undefined) {
      const parsedExtern = parseTopLevelExternDecl(
        externTail,
        text,
        span(file, lineStartOffset, lineEndOffset),
        lineNo,
        i,
        {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
          parseParamsFromText,
        },
      );
      if (parsedExtern.node) items.push(parsedExtern.node);
      i = parsedExtern.nextIndex;
      continue;
    }

    const enumTail = consumeTopKeyword(rest, 'enum');
    if (enumTail !== undefined) {
      const enumNode = parseEnumDecl(enumTail, {
        diagnostics,
        modulePath,
        lineNo,
        text,
        span: span(file, lineStartOffset, lineEndOffset),
        isReservedTopLevelName,
      });
      if (enumNode) items.push(enumNode);
      i++;
      continue;
    }

    const sectionTail = consumeTopKeyword(rest, 'section');
    if (rest.toLowerCase() === 'section' || sectionTail !== undefined) {
      const dirSpan = span(file, lineStartOffset, lineEndOffset);
      const sectionNode = parseSectionDirectiveDecl(rest, sectionTail, {
        diagnostics,
        modulePath,
        lineNo,
        text,
        span: dirSpan,
        isReservedTopLevelName,
      });
      if (!sectionNode) {
        i++;
        continue;
      }
      items.push(sectionNode);
      i++;
      continue;
    }

    const alignTail = consumeTopKeyword(rest, 'align');
    if (rest.toLowerCase() === 'align' || alignTail !== undefined) {
      const dirSpan = span(file, lineStartOffset, lineEndOffset);
      const alignNode = parseAlignDirectiveDecl(rest, alignTail, {
        diagnostics,
        modulePath,
        lineNo,
        text,
        span: dirSpan,
        isReservedTopLevelName,
      });
      if (!alignNode) {
        i++;
        continue;
      }
      items.push(alignNode);
      i++;
      continue;
    }

    const constTail = consumeTopKeyword(rest, 'const');
    if (constTail !== undefined) {
      const exprSpan = span(file, lineStartOffset, lineEndOffset);
      const constNode = parseConstDecl(constTail, hasExportPrefix, {
        diagnostics,
        modulePath,
        lineNo,
        text,
        span: exprSpan,
        isReservedTopLevelName,
      });
      if (!constNode) {
        i++;
        continue;
      }
      items.push(constNode);
      i++;
      continue;
    }

    const binTail = consumeTopKeyword(rest, 'bin');
    if (binTail !== undefined) {
      const node = parseBinDecl(binTail, {
        diagnostics,
        modulePath,
        lineNo,
        text,
        span: span(file, lineStartOffset, lineEndOffset),
        isReservedTopLevelName,
      });
      if (!node) {
        i++;
        continue;
      }
      items.push(node);
      i++;
      continue;
    }

    const hexTail = consumeTopKeyword(rest, 'hex');
    if (hexTail !== undefined) {
      const node = parseHexDecl(hexTail, {
        diagnostics,
        modulePath,
        lineNo,
        text,
        span: span(file, lineStartOffset, lineEndOffset),
        isReservedTopLevelName,
      });
      if (!node) {
        i++;
        continue;
      }
      items.push(node);
      i++;
      continue;
    }

    if (rest.toLowerCase() === 'data') {
      const parsedData = parseDataBlock(i, {
        file,
        lineCount,
        diagnostics,
        modulePath,
        getRawLine,
      });
      items.push(parsedData.node);
      i = parsedData.nextIndex;
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
        diagInvalidHeaderLine(
          diagnostics,
          modulePath,
          expectation.kind,
          text,
          expectation.expected,
          lineNo,
        );
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
