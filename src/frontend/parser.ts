import type {
  ModuleFileNode,
  ModuleItemNode,
  NamedSectionNode,
  ProgramNode,
  SectionAnchorNode,
  SectionItemNode,
} from './ast.js';
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

  function parseNamedSectionHeader(
    sectionText: string,
    sectionSpan: NamedSectionNode['span'],
    lineNo: number,
    originalText: string,
  ): { section: 'code' | 'data'; name: string; anchor?: SectionAnchorNode } | undefined {
    const m = /^(code|data)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+at\s+(.+?)(?:\s+(size|end)\s+(.+))?)?$/i.exec(
      sectionText.trim(),
    );
    if (!m) {
      diagInvalidHeaderLine(
        diagnostics,
        modulePath,
        'named section declaration',
        originalText,
        '<code|data> <name> [at <imm16> [size <n> | end <addr>]]',
        lineNo,
      );
      return undefined;
    }

    const section = m[1]!.toLowerCase() as 'code' | 'data';
    const name = m[2]!;
    const atText = m[3]?.trim();
    const rangeKeyword = m[4]?.toLowerCase();
    const rangeExprText = m[5]?.trim();
    let anchor: SectionAnchorNode | undefined;
    if (atText) {
      const at = parseSectionDirectiveDecl(
        `section ${section} at ${atText}`,
        `${section} at ${atText}`,
        {
          diagnostics,
          modulePath,
          lineNo,
          text: originalText,
          span: sectionSpan,
          isReservedTopLevelName,
        },
      )?.at;
      if (!at) return undefined;
      anchor = {
        kind: 'SectionAnchor',
        span: sectionSpan,
        at,
      };
      if (rangeKeyword && rangeExprText) {
        const rangeExpr = parseAlignDirectiveDecl(
          `align ${rangeExprText}`,
          rangeExprText,
          {
            diagnostics,
            modulePath,
            lineNo,
            text: originalText,
            span: sectionSpan,
            isReservedTopLevelName,
          },
        )?.value;
        if (!rangeExpr) return undefined;
        if (rangeKeyword === 'size') anchor.size = rangeExpr;
        else anchor.end = rangeExpr;
      }
    }

    return { section, name, ...(anchor ? { anchor } : {}) };
  }

  function parseSectionItems(startIndex: number): {
    items: SectionItemNode[];
    nextIndex: number;
    closed: boolean;
  } {
    const sectionItems: SectionItemNode[] = [];
    let index = startIndex;

    while (index < lineCount) {
      const { raw, startOffset, endOffset } = getRawLine(index);
      const text = stripComment(raw).trim();
      const lineNo = index + 1;
      if (text.length === 0) {
        index++;
        continue;
      }
      if (text.toLowerCase() === 'end') {
        return { items: sectionItems, nextIndex: index + 1, closed: true };
      }

      const exportTail = consumeKeywordPrefix(text, 'export');
      const hasExportPrefix = exportTail !== undefined;
      const rest = hasExportPrefix ? exportTail : text;
      const sectionSpan = span(file, startOffset, endOffset);

      if (hasExportPrefix && rest.length === 0) {
        diag(diagnostics, modulePath, `Invalid export statement`, { line: lineNo, column: 1 });
        index++;
        continue;
      }

      if (hasExportPrefix) {
        const allowed =
          consumeKeywordPrefix(rest, 'const') !== undefined ||
          consumeKeywordPrefix(rest, 'func') !== undefined ||
          consumeKeywordPrefix(rest, 'op') !== undefined;
        if (!allowed) {
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
          index++;
          continue;
        }
      }

      if (consumeTopKeyword(rest, 'import') !== undefined) {
        diag(diagnostics, modulePath, `import is only permitted at module scope`, {
          line: lineNo,
          column: 1,
        });
        index++;
        continue;
      }

      const typeTail = consumeTopKeyword(rest, 'type');
      if (typeTail !== undefined) {
        const parsedType = parseTypeDecl(typeTail, text, sectionSpan, lineNo, index, {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
        });
        if (parsedType) {
          sectionItems.push(parsedType.node);
          index = parsedType.nextIndex;
          continue;
        }
        index++;
        continue;
      }

      const unionTail = consumeTopKeyword(rest, 'union');
      if (unionTail !== undefined) {
        const parsedUnion = parseUnionDecl(unionTail, text, sectionSpan, lineNo, index, {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
        });
        if (parsedUnion) {
          sectionItems.push(parsedUnion.node);
          index = parsedUnion.nextIndex;
          continue;
        }
        index++;
        continue;
      }

      const storageHeader = rest.toLowerCase();
      if (storageHeader === 'var' || storageHeader === 'globals') {
        const parsedGlobals = parseGlobalsBlock(storageHeader, index, lineNo, {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          isReservedTopLevelName,
        });
        sectionItems.push(parsedGlobals.varBlock);
        index = parsedGlobals.nextIndex;
        continue;
      }

      const funcTail = consumeTopKeyword(rest, 'func');
      if (funcTail !== undefined) {
        const parsedFunc = parseTopLevelFuncDecl(
          funcTail,
          text,
          sectionSpan,
          lineNo,
          index,
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
        if (parsedFunc.node) sectionItems.push(parsedFunc.node);
        index = parsedFunc.nextIndex;
        continue;
      }

      const opTail = consumeTopKeyword(rest, 'op');
      if (opTail !== undefined) {
        const parsedOp = parseTopLevelOpDecl(
          opTail,
          text,
          sectionSpan,
          lineNo,
          index,
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
        if (parsedOp) {
          sectionItems.push(parsedOp.node);
          index = parsedOp.nextIndex;
          continue;
        }
        index++;
        continue;
      }

      const externTail = consumeTopKeyword(rest, 'extern');
      if (externTail !== undefined) {
        const parsedExtern = parseTopLevelExternDecl(
          externTail,
          text,
          sectionSpan,
          lineNo,
          index,
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
        if (parsedExtern.node) sectionItems.push(parsedExtern.node);
        index = parsedExtern.nextIndex;
        continue;
      }

      const enumTail = consumeTopKeyword(rest, 'enum');
      if (enumTail !== undefined) {
        const enumNode = parseEnumDecl(enumTail, {
          diagnostics,
          modulePath,
          lineNo,
          text,
          span: sectionSpan,
          isReservedTopLevelName,
        });
        if (enumNode) sectionItems.push(enumNode);
        index++;
        continue;
      }

      const sectionTail = consumeTopKeyword(rest, 'section');
      if (rest.toLowerCase() === 'section' || sectionTail !== undefined) {
        diag(diagnostics, modulePath, `nested section blocks are not supported`, {
          line: lineNo,
          column: 1,
        });
        index++;
        continue;
      }

      const alignTail = consumeTopKeyword(rest, 'align');
      if (rest.toLowerCase() === 'align' || alignTail !== undefined) {
        const alignNode = parseAlignDirectiveDecl(rest, alignTail, {
          diagnostics,
          modulePath,
          lineNo,
          text,
          span: sectionSpan,
          isReservedTopLevelName,
        });
        if (alignNode) sectionItems.push(alignNode);
        index++;
        continue;
      }

      const constTail = consumeTopKeyword(rest, 'const');
      if (constTail !== undefined) {
        const constNode = parseConstDecl(constTail, hasExportPrefix, {
          diagnostics,
          modulePath,
          lineNo,
          text,
          span: sectionSpan,
          isReservedTopLevelName,
        });
        if (constNode) sectionItems.push(constNode);
        index++;
        continue;
      }

      const binTail = consumeTopKeyword(rest, 'bin');
      if (binTail !== undefined) {
        const node = parseBinDecl(binTail, {
          diagnostics,
          modulePath,
          lineNo,
          text,
          span: sectionSpan,
          isReservedTopLevelName,
        });
        if (node) sectionItems.push(node);
        index++;
        continue;
      }

      const hexTail = consumeTopKeyword(rest, 'hex');
      if (hexTail !== undefined) {
        const node = parseHexDecl(hexTail, {
          diagnostics,
          modulePath,
          lineNo,
          text,
          span: sectionSpan,
          isReservedTopLevelName,
        });
        if (node) sectionItems.push(node);
        index++;
        continue;
      }

      if (rest.toLowerCase() === 'data') {
        const parsedData = parseDataBlock(index, {
          file,
          lineCount,
          diagnostics,
          modulePath,
          getRawLine,
          stopOnEnd: true,
        });
        sectionItems.push(parsedData.node);
        index = parsedData.nextIndex;
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
        index++;
        continue;
      }

      diag(diagnostics, modulePath, `Unsupported section-contained construct: ${text}`, {
        line: lineNo,
        column: 1,
      });
      index++;
    }

    return { items: sectionItems, nextIndex: index, closed: false };
  }

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
      const sectionDecl = rest === 'section' ? '' : (sectionTail ?? '');
      const namedTokens = sectionDecl.trim().split(/\s+/).filter((token) => token.length > 0);
      const namedPrefix =
        namedTokens.length >= 2 &&
        /^(code|data)$/i.test(namedTokens[0] ?? '') &&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(namedTokens[1] ?? '') &&
        !/^(at|size|end)$/i.test(namedTokens[1] ?? '');
      if (namedPrefix) {
        const header = parseNamedSectionHeader(sectionDecl, dirSpan, lineNo, text);
        if (!header) {
          i++;
          continue;
        }
        const parsedSection = parseSectionItems(i + 1);
        const sectionEndIndex = Math.max(parsedSection.nextIndex - 1, i);
        const sectionEnd = getRawLine(sectionEndIndex);
        const sectionNode: NamedSectionNode = {
          kind: 'NamedSection',
          span: span(file, lineStartOffset, sectionEnd.endOffset),
          section: header.section,
          name: header.name,
          items: parsedSection.items,
          ...(header.anchor ? { anchor: header.anchor } : {}),
        };
        if (!parsedSection.closed) {
          diag(
            diagnostics,
            modulePath,
            `Missing end for section "${header.name}"`,
            { line: lineNo, column: 1 },
          );
        }
        items.push(sectionNode);
        i = parsedSection.nextIndex;
        continue;
      }

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
