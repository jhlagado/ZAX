import type {
  ModuleFileNode,
  ModuleItemNode,
  ProgramNode,
  SectionItemNode,
} from './ast.js';
import type { Diagnostic } from '../diagnosticTypes.js';
import { canonicalModuleId } from '../moduleIdentity.js';
import { buildLogicalLines, getLogicalLine, type LogicalLine } from './parseLogicalLines.js';
import {
  createModuleItemDispatchTable,
  type ParseItemContext,
  type ParseItemResult,
} from './parseModuleItemDispatch.js';
import { topLevelStartKeyword } from './parseModuleCommon.js';
import {
  parseExportModifier,
  recoverUnsupportedParserLine,
} from './parseParserRecovery.js';
import {
  looksLikeRawDataDirectiveStart,
  maybeCloseSection,
  parseSectionBodyItem,
  parseSectionItems as parseSectionItemsFromHelper,
} from './parseSectionBodies.js';
import { parseSectionHeader } from './parseSectionHeader.js';
import { parseOpParamsFromText, parseParamsFromText } from './parseParams.js';
import {
  isReservedTopLevelDeclName,
  stripLineComment as stripComment,
} from './parseParserShared.js';
import { makeSourceFile, span, type SourceFile } from './source.js';
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

  function parseSectionItems(startIndex: number, sectionKind: 'code' | 'data'): {
    items: SectionItemNode[];
    nextIndex: number;
    closed: boolean;
  } {
    return parseSectionItemsFromHelper({
      startIndex,
      lineCount,
      sectionKind,
      diagnostics,
      parseModuleItem: (index, ctx) => parseModuleItem(index, ctx),
    });
  }

  function isReservedTopLevelName(name: string): boolean {
    return isReservedTopLevelDeclName(name);
  }

  const moduleItemDispatchTable = createModuleItemDispatchTable({
    diagnostics,
    file,
    getRawLine,
    isReservedTopLevelName,
    lineCount,
    logicalLines,
    modulePath,
    parseSectionHeader: (sectionText, sectionSpan, lineNo, originalText, filePath) =>
      parseSectionHeader({
        sectionText,
        sectionSpan,
        lineNo,
        originalText,
        filePath,
        diagnostics,
        isReservedTopLevelName,
      }),
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

    if (text.length === 0) return { nextIndex: index + 1 };

    if (ctx.scope === 'section') {
      const sectionClose = maybeCloseSection(index, text, ctx, diagnostics);
      if (sectionClose) return sectionClose;
    }

    const exportParsed = parseExportModifier({
      text,
      lineNo,
      allowAsmSpecialCase: ctx.scope === 'module',
      filePath,
      diagnostics,
    });
    if (!exportParsed) return { nextIndex: index + 1 };

    const hasExportPrefix = exportParsed.exported;
    const rest = exportParsed.rest;
    const stmtSpan = span(file, lineStartOffset, lineEndOffset);

    if (ctx.scope === 'section') {
      const parsedSectionItem = parseSectionBodyItem({
        index,
        ctx,
        rest,
        lineNo,
        filePath,
        stmtSpan,
        diagnostics,
      });
      if (parsedSectionItem) return parsedSectionItem;
    } else if (looksLikeRawDataDirectiveStart(rest)) {
      diag(
        diagnostics,
        filePath,
        `Raw data directives are only permitted inside data sections.`,
        { line: lineNo, column: 1 },
      );
      return { nextIndex: index + 1 };
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

    return recoverUnsupportedParserLine({
      index,
      scope: ctx.scope,
      text,
      rest,
      hasExportPrefix,
      lineNo,
      filePath,
      diagnostics,
    });
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
