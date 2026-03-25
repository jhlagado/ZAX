import type {
  ModuleFileNode,
  ModuleItemNode,
  NamedSectionNode,
  ProgramNode,
  SectionAnchorNode,
  SourceSpan,
  SectionItemNode,
} from './ast.js';
import { makeSourceFile, span, type SourceFile } from './source.js';
import type { Diagnostic } from '../diagnostics/types.js';
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
import { parseImmExprFromText } from './parseImm.js';
import { parseTopLevelOpDecl } from './parseOp.js';
import { buildLogicalLines, getLogicalLine, type LogicalLine } from './parseLogicalLines.js';
import { parseOpParamsFromText, parseParamsFromText } from './parseParams.js';
import {
  parseRawDataDirective,
  type PendingRawLabel,
} from './parseRawDataDirectives.js';
import {
  createModuleItemDispatchTable,
  type ParseItemContext,
  type ParseItemResult,
} from './parseModuleItemDispatch.js';
import { parseTypeDecl, parseUnionDecl } from './parseTypes.js';
import {
  parseAlignDirectiveDecl,
  parseBinDecl,
  parseConstDecl,
  parseHexDecl,
  parseImportDecl,
  parseSectionDirectiveDecl,
} from './parseTopLevelSimple.js';
import { parseDataBlock, parseDataDeclLine } from './parseData.js';
import { canonicalModuleId } from '../moduleIdentity.js';
import {
  isReservedTopLevelDeclName,
  stripLineComment as stripComment,
} from './parseParserShared.js';
import { parseDiag as diag } from './parseDiagnostics.js';

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
  sourceFileOverride?: SourceFile,
): ModuleFileNode {
  const file = sourceFileOverride ?? makeSourceFile(modulePath, sourceText);
  const logicalLines: LogicalLine[] = buildLogicalLines(file, modulePath, diagnostics);

  const lineCount = logicalLines.length;

  function getRawLine(lineIndex: number): {
    raw: string;
    startOffset: number;
    endOffset: number;
    lineNo: number;
    filePath: string;
  } {
    const logical = getLogicalLine(logicalLines, lineIndex, modulePath);
    return {
      raw: logical.raw,
      startOffset: logical.startOffset,
      endOffset: logical.endOffset,
      lineNo: logical.lineNo,
      filePath: logical.filePath,
    };
  }

  const items: ModuleItemNode[] = [];

  function parseExportModifier(
    text: string,
    lineNo: number,
    allowAsmSpecialCase: boolean,
    filePath: string,
  ): { rest: string; exported: boolean } | undefined {
    const exportTail = consumeKeywordPrefix(text, 'export');
    if (exportTail === undefined) return { rest: text, exported: false };

    const rest = exportTail;
    if (rest.length === 0) {
      diag(diagnostics, filePath, `Invalid export statement`, { line: lineNo, column: 1 });
      return undefined;
    }

    const allowed =
      consumeKeywordPrefix(rest, 'const') !== undefined ||
      consumeKeywordPrefix(rest, 'type') !== undefined ||
      consumeKeywordPrefix(rest, 'union') !== undefined ||
      consumeKeywordPrefix(rest, 'enum') !== undefined ||
      consumeKeywordPrefix(rest, 'func') !== undefined ||
      consumeKeywordPrefix(rest, 'op') !== undefined;
    if (allowed) return { rest, exported: true };

    if (allowAsmSpecialCase) {
      const exportAsmTail = consumeKeywordPrefix(rest, 'asm');
      if (exportAsmTail !== undefined) {
        diag(
          diagnostics,
          filePath,
          `"asm" is not a top-level construct (function and op bodies are implicit instruction streams)`,
          {
            line: lineNo,
            column: 1,
          },
        );
        return undefined;
      }
    }

    const targetKeyword = topLevelStartKeyword(rest);
    if (targetKeyword !== undefined) {
      const targetKind = unsupportedExportTargetKind[targetKeyword];
      if (targetKind !== undefined) {
        diag(diagnostics, filePath, `export not supported on ${targetKind}`, {
          line: lineNo,
          column: 1,
        });
      } else {
        diag(
          diagnostics,
          filePath,
          `export is only permitted on const/type/union/enum/func/op declarations`,
          {
            line: lineNo,
            column: 1,
          },
        );
      }
    } else {
      diag(
        diagnostics,
        filePath,
        `export is only permitted on const/type/union/enum/func/op declarations`,
        {
          line: lineNo,
          column: 1,
        },
      );
    }
    return undefined;
  }

  function parseNamedSectionHeader(
    sectionText: string,
    sectionSpan: NamedSectionNode['span'],
    lineNo: number,
    originalText: string,
    filePath: string,
  ): { section: 'code' | 'data'; name: string; anchor?: SectionAnchorNode } | undefined {
    const m = /^(code|data)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+at\s+(.+?)(?:\s+(size|end)\s+(.+))?)?$/i.exec(
      sectionText.trim(),
    );
    if (!m) {
      diagInvalidHeaderLine(
        diagnostics,
        filePath,
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
      const at = parseImmExprFromText(filePath, atText, sectionSpan, diagnostics);
      if (!at) return undefined;
      let bound: SectionAnchorNode['bound'] = { kind: 'none' };
      anchor = {
        kind: 'SectionAnchor',
        span: sectionSpan,
        at,
        bound,
      };
      if (rangeKeyword && rangeExprText) {
        const rangeExpr = parseAlignDirectiveDecl(
          `align ${rangeExprText}`,
          rangeExprText,
          {
            diagnostics,
            modulePath: filePath,
            lineNo,
            text: originalText,
            span: sectionSpan,
            isReservedTopLevelName,
          },
        )?.value;
        if (!rangeExpr) return undefined;
        bound = rangeKeyword === 'size' ? { kind: 'size', size: rangeExpr } : { kind: 'end', end: rangeExpr };
        anchor.bound = bound;
      }
    }

    return { section, name, ...(anchor ? { anchor } : {}) };
  }

  type ParseItemContext =
    | { scope: 'module' }
    | {
        scope: 'section';
        sectionKind: 'code' | 'data';
        directDeclNamesLower: Set<string>;
        pendingRawLabel?: PendingRawLabel;
      };

  const moduleItemDispatchTable = createModuleItemDispatchTable({
    diagnostics,
    file,
    getRawLine,
    isReservedTopLevelName,
    lineCount,
    logicalLines,
    modulePath,
    parseNamedSectionHeader,
    parseOpParamsFromText,
    parseParamsFromText,
    parseSectionItems,
    span,
  });

  function parseModuleItem(index: number, ctx: ParseItemContext): ParseItemResult {
    const { raw, startOffset: lineStartOffset, endOffset: lineEndOffset } = getRawLine(index);
    const text = stripComment(raw).trim();
    const lineNo = logicalLines[index]?.lineNo ?? index + 1;
    const filePath = logicalLines[index]?.filePath ?? modulePath;
    if (text.length === 0) {
      if (ctx.scope === 'section') {
        return { nextIndex: index + 1 };
      }
      return { nextIndex: index + 1 };
    }
    if (ctx.scope === 'section' && text.toLowerCase() === 'end') {
      if (ctx.pendingRawLabel) {
        diag(diagnostics, ctx.pendingRawLabel.filePath, `Raw data label "${ctx.pendingRawLabel.name}" is missing a directive`, {
          line: ctx.pendingRawLabel.lineNo,
          column: 1,
        });
        delete ctx.pendingRawLabel;
      }
      return { nextIndex: index + 1, sectionClosed: true };
    }

    const exportParsed = parseExportModifier(text, lineNo, ctx.scope === 'module', filePath);
    if (!exportParsed) {
      return { nextIndex: index + 1 };
    }
    const hasExportPrefix = exportParsed.exported;
    const rest = exportParsed.rest;
    const stmtSpan = span(file, lineStartOffset, lineEndOffset);

    if (ctx.scope === 'section' && ctx.sectionKind === 'data') {
      if (ctx.pendingRawLabel) {
        const parsedRaw = parseRawDataDirective(
          ctx.pendingRawLabel,
          rest,
          lineNo,
          stmtSpan,
          filePath,
          diagnostics,
        );
        if (parsedRaw) {
          ctx.directDeclNamesLower.add(ctx.pendingRawLabel.name.toLowerCase());
          delete ctx.pendingRawLabel;
          if (ctx.sectionKind !== 'data') {
            diag(
              diagnostics,
              filePath,
              `Raw data declarations are only permitted inside data sections.`,
              { line: lineNo, column: 1 },
            );
            return { nextIndex: index + 1 };
          }
          return { nextIndex: index + 1, node: parsedRaw };
        }
        diag(diagnostics, ctx.pendingRawLabel.filePath, `Raw data label "${ctx.pendingRawLabel.name}" is missing a directive`, {
          line: ctx.pendingRawLabel.lineNo,
          column: 1,
        });
        delete ctx.pendingRawLabel;
      }
      const inlineMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(db|dw|ds)\b(.*)$/i.exec(rest);
      if (inlineMatch) {
        const labelName = inlineMatch[1]!;
        const labelLower = labelName.toLowerCase();
        if (ctx.directDeclNamesLower.has(labelLower)) {
          diag(diagnostics, filePath, `Duplicate data declaration name "${labelName}".`, {
            line: lineNo,
            column: 1,
          });
          return { nextIndex: index + 1 };
        }
        const label: PendingRawLabel = { name: labelName, span: stmtSpan, lineNo, filePath };
        const parsedRaw = parseRawDataDirective(
          label,
          inlineMatch[2]! + inlineMatch[3]!,
          lineNo,
          stmtSpan,
          filePath,
          diagnostics,
        );
        if (!parsedRaw) return { nextIndex: index + 1 };
        ctx.directDeclNamesLower.add(labelLower);
        if (ctx.sectionKind !== 'data') {
          diag(
            diagnostics,
            filePath,
            `Raw data declarations are only permitted inside data sections.`,
            { line: lineNo, column: 1 },
          );
          return { nextIndex: index + 1 };
        }
        return { nextIndex: index + 1, node: parsedRaw };
      }
      const labelMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*$/.exec(rest);
      if (labelMatch) {
        const labelName = labelMatch[1]!;
        const labelLower = labelName.toLowerCase();
        if (ctx.directDeclNamesLower.has(labelLower)) {
          diag(diagnostics, filePath, `Duplicate data declaration name "${labelName}".`, {
            line: lineNo,
            column: 1,
          });
          return { nextIndex: index + 1 };
        }
        if (ctx.sectionKind !== 'data') {
          diag(
            diagnostics,
            filePath,
            `Raw data labels are only permitted inside data sections.`,
            { line: lineNo, column: 1 },
          );
          return { nextIndex: index + 1 };
        }
        ctx.pendingRawLabel = { name: labelName, span: stmtSpan, lineNo, filePath };
        return { nextIndex: index + 1 };
      }
    } else if (ctx.scope === 'section' && ctx.sectionKind === 'code') {
      if (/^(db|dw|ds)\b/i.test(rest) || /^[A-Za-z_][A-Za-z0-9_]*\s*:\s*(db|dw|ds)\b/i.test(rest)) {
        diag(
          diagnostics,
          filePath,
          `Raw data directives are only permitted inside data sections.`,
          { line: lineNo, column: 1 },
        );
        return { nextIndex: index + 1 };
      }
    } else if (ctx.scope === 'module') {
      if (/^(db|dw|ds)\b/i.test(rest) || /^[A-Za-z_][A-Za-z0-9_]*\s*:\s*(db|dw|ds)\b/i.test(rest)) {
        diag(
          diagnostics,
          filePath,
          `Raw data directives are only permitted inside data sections.`,
          { line: lineNo, column: 1 },
        );
        return { nextIndex: index + 1 };
      }
    }
    const dispatchKeyword = topLevelStartKeyword(rest);
    const dispatchHandler =
      dispatchKeyword === undefined ? undefined : moduleItemDispatchTable[dispatchKeyword];
    if (dispatchHandler) {
      const parsed = dispatchHandler({
        index,
        lineNo,
        filePath,
        text,
        rest,
        stmtSpan,
        lineStartOffset,
        hasExportPrefix,
        ctx,
      });
      if (parsed) return parsed;
    }

    const labelOnly = /^[A-Za-z_][A-Za-z0-9_]*\s*:\s*$/.test(rest);
    if (ctx.scope === 'section' && /^[A-Za-z_][A-Za-z0-9_]*\s*:/.test(rest) && !(ctx.sectionKind === 'code' && labelOnly)) {
      const sectionDataDecl = parseDataDeclLine({
        allowOmittedInitializer: true,
        allowInferredArrayLength: false,
        modulePath: filePath,
        diagnostics,
        lineNo,
        text: rest,
        span: stmtSpan,
        seenNames: ctx.directDeclNamesLower,
      });
      if (!sectionDataDecl) return { nextIndex: index + 1 };
      if (ctx.sectionKind !== 'data') {
        diag(diagnostics, filePath, `Data declarations are only permitted inside data sections.`, {
          line: lineNo,
          column: 1,
        });
        return { nextIndex: index + 1 };
      }
      return { nextIndex: index + 1, node: sectionDataDecl };
    }

    const asmTail = consumeKeywordPrefix(text, 'asm');
    const asmAfterExportTail = hasExportPrefix ? consumeKeywordPrefix(rest, 'asm') : undefined;
    if (asmTail !== undefined || asmAfterExportTail !== undefined) {
      diag(
        diagnostics,
        filePath,
        `"asm" is not a top-level construct (function and op bodies are implicit instruction streams)`,
        {
          line: lineNo,
          column: 1,
        },
      );
      return { nextIndex: index + 1 };
    }

    if (ctx.scope === 'module') {
      const hasTopKeyword = (kw: string): boolean => new RegExp(`^${kw}\\b`, 'i').test(rest);
      for (const expectation of malformedTopLevelHeaderExpectations) {
        if (hasTopKeyword(expectation.keyword)) {
          diagInvalidHeaderLine(
            diagnostics,
            filePath,
            expectation.kind,
            text,
            expectation.expected,
            lineNo,
          );
          return { nextIndex: index + 1 };
        }
      }

      diag(diagnostics, filePath, `Unsupported top-level construct: ${text}`, {
        line: lineNo,
        column: 1,
      });
      return { nextIndex: index + 1 };
    }

    diag(diagnostics, filePath, `Unsupported section-contained construct: ${text}`, {
      line: lineNo,
      column: 1,
    });
    return { nextIndex: index + 1 };
  }

  function parseSectionItems(startIndex: number, sectionKind: 'code' | 'data'): {
    items: SectionItemNode[];
    nextIndex: number;
    closed: boolean;
  } {
    const sectionItems: SectionItemNode[] = [];
    const directDeclNamesLower = new Set<string>();
    const ctx: Extract<ParseItemContext, { scope: 'section' }> = {
      scope: 'section',
      sectionKind,
      directDeclNamesLower,
    };
    let index = startIndex;

    while (index < lineCount) {
      const parsed = parseModuleItem(index, ctx);
      if (parsed.sectionClosed) {
        delete ctx.pendingRawLabel;
        return { items: sectionItems, nextIndex: parsed.nextIndex, closed: true };
      }
      if (parsed.node) sectionItems.push(parsed.node as SectionItemNode);
      index = parsed.nextIndex;
    }

    if (ctx.pendingRawLabel) {
      diag(diagnostics, ctx.pendingRawLabel.filePath, `Raw data label "${ctx.pendingRawLabel.name}" is missing a directive`, {
        line: ctx.pendingRawLabel.lineNo,
        column: 1,
      });
      delete ctx.pendingRawLabel;
    }

    return { items: sectionItems, nextIndex: index, closed: false };
  }

  function isReservedTopLevelName(name: string): boolean {
    return isReservedTopLevelDeclName(name);
  }

  let i = 0;
  while (i < lineCount) {
    const parsed = parseModuleItem(i, { scope: 'module' });
    if (parsed.node) items.push(parsed.node as ModuleItemNode);
    i = parsed.nextIndex;
  }

  const moduleSpan = span(file, 0, sourceText.length);
  const moduleFile: ModuleFileNode = {
    kind: 'ModuleFile',
    span: moduleSpan,
    path: modulePath,
    moduleId: canonicalModuleId(modulePath),
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
