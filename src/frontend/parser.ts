import type {
  ModuleFileNode,
  ModuleItemNode,
  NamedSectionNode,
  ProgramNode,
  RawDataDeclNode,
  ImmExprNode,
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
import { parseDataBlock, parseDataDeclLine } from './parseData.js';
import { canonicalModuleId } from '../moduleIdentity.js';
import {
  isReservedTopLevelDeclName,
  stripLineComment as stripComment,
} from './parseParserShared.js';
import { parseDiag as diag } from './parseDiagnostics.js';

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

  type LogicalLine = {
    raw: string;
    startOffset: number;
    endOffset: number;
    lineNo: number;
    filePath: string;
  };

  const logicalLines: LogicalLine[] = [];

  for (let i = 0; i < file.lineStarts.length; i++) {
    const startOffset = file.lineStarts[i] ?? 0;
    const nextStart = file.lineStarts[i + 1] ?? file.text.length;
    let rawWithEol = file.text.slice(startOffset, nextStart);
    if (rawWithEol.endsWith('\n')) rawWithEol = rawWithEol.slice(0, -1);
    if (rawWithEol.endsWith('\r')) rawWithEol = rawWithEol.slice(0, -1);

    const raw = rawWithEol;
    const lineNo = file.lineBaseLines?.[i] ?? i + 1;
    const filePath = file.lineFiles?.[i] ?? modulePath;
    let segmentStart = 0;
    let inChar = false;
    let inString = false;
    let escaped = false;

    for (let j = 0; j < raw.length; j++) {
      const ch = raw[j]!;

      if (inChar || inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (inChar && ch === "'") {
          inChar = false;
          continue;
        }
        if (inString && ch === '"') {
          inString = false;
          continue;
        }
        continue;
      }

      if (ch === ';') {
        break;
      }

      if (ch === "'") {
        inChar = true;
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '\\') {
        const rest = raw.slice(j + 1);
        const hasWhitespace = rest.length > 0 && /[ \t]/.test(rest[0]!);
        if (!hasWhitespace && rest.length > 0) continue;

        const nonSpaceIndex = rest.search(/[^\s]/);
        const nextToken = nonSpaceIndex >= 0 ? rest[nonSpaceIndex] : '';
        if (nonSpaceIndex === -1 || nextToken === ';') {
          diag(diagnostics, filePath, 'Trailing backslash must be followed by another statement.', {
            line: lineNo,
            column: j + 1,
          });
          continue;
        }
        const segment = raw.slice(segmentStart, j);
        logicalLines.push({
          raw: segment,
          startOffset: startOffset + segmentStart,
          endOffset: startOffset + j,
          lineNo,
          filePath,
        });
        segmentStart = j + 1;
      }
    }

    logicalLines.push({
      raw: raw.slice(segmentStart),
      startOffset: startOffset + segmentStart,
      endOffset: startOffset + raw.length,
      lineNo,
      filePath,
    });
  }

  const lineCount = logicalLines.length;

  function getRawLine(lineIndex: number): {
    raw: string;
    startOffset: number;
    endOffset: number;
    lineNo: number;
    filePath: string;
  } {
    const logical = logicalLines[lineIndex] ?? {
      raw: '',
      startOffset: 0,
      endOffset: 0,
      lineNo: 1,
      filePath: modulePath,
    };
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

  type PendingRawLabel = {
    name: string;
    span: SourceSpan;
    lineNo: number;
    filePath: string;
  };

  type ParseItemContext =
    | { scope: 'module' }
    | {
        scope: 'section';
        sectionKind: 'code' | 'data';
        directDeclNamesLower: Set<string>;
        pendingRawLabel?: PendingRawLabel;
      };

  type ParseItemResult = {
    nextIndex: number;
    node?: ModuleItemNode | SectionItemNode;
    sectionClosed?: boolean;
  };

  type ParseModuleItemDispatchArgs = {
    index: number;
    lineNo: number;
    filePath: string;
    text: string;
    rest: string;
    stmtSpan: SourceSpan;
    lineStartOffset: number;
    hasExportPrefix: boolean;
    ctx: ParseItemContext;
  };

  type ParseModuleItemDispatchHandler = (
    args: ParseModuleItemDispatchArgs,
  ) => ParseItemResult | undefined;

  function parseImportItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    ctx,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const importTail = consumeTopKeyword(rest, 'import') ?? '';
    if (ctx.scope === 'module') {
      const importNode = parseImportDecl(importTail, {
        diagnostics,
        modulePath: filePath,
        lineNo,
        text,
        span: stmtSpan,
        isReservedTopLevelName,
      });
      return { nextIndex: index + 1, ...(importNode ? { node: importNode } : {}) };
    }
    diag(diagnostics, filePath, `import is only permitted at module scope`, {
      line: lineNo,
      column: 1,
    });
    return { nextIndex: index + 1 };
  }

  function parseTypeItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    hasExportPrefix,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const typeTail = consumeTopKeyword(rest, 'type') ?? '';
    const parsedType = parseTypeDecl(
      typeTail,
      text,
      stmtSpan,
      lineNo,
      index,
      {
        file,
        lineCount,
        diagnostics,
        modulePath: filePath,
        getRawLine,
        isReservedTopLevelName,
      },
      hasExportPrefix,
    );
    if (!parsedType) return { nextIndex: index + 1 };
    return { nextIndex: parsedType.nextIndex, node: parsedType.node };
  }

  function parseUnionItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    hasExportPrefix,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const unionTail = consumeTopKeyword(rest, 'union') ?? '';
    const parsedUnion = parseUnionDecl(
      unionTail,
      text,
      stmtSpan,
      lineNo,
      index,
      {
        file,
        lineCount,
        diagnostics,
        modulePath: filePath,
        getRawLine,
        isReservedTopLevelName,
      },
      hasExportPrefix,
    );
    if (!parsedUnion) return { nextIndex: index + 1 };
    return { nextIndex: parsedUnion.nextIndex, node: parsedUnion.node };
  }

  function parseGlobalsItem({
    index,
    lineNo,
    filePath,
    rest,
  }: ParseModuleItemDispatchArgs): ParseItemResult | undefined {
    const storageHeader = rest.toLowerCase();
    if (storageHeader !== 'var' && storageHeader !== 'globals') return undefined;
    const parsedGlobals = parseGlobalsBlock(storageHeader, index, lineNo, {
      file,
      lineCount,
      diagnostics,
      modulePath: filePath,
      getRawLine,
      isReservedTopLevelName,
    });
    return { nextIndex: parsedGlobals.nextIndex };
  }

  function parseFuncItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    hasExportPrefix,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const funcTail = consumeTopKeyword(rest, 'func') ?? '';
    const parsedFunc = parseTopLevelFuncDecl(
      funcTail,
      text,
      stmtSpan,
      lineNo,
      index,
      hasExportPrefix,
      {
        file,
        lineCount,
        diagnostics,
        modulePath: filePath,
        getRawLine,
        isReservedTopLevelName,
        parseParamsFromText,
      },
    );
    return { nextIndex: parsedFunc.nextIndex, ...(parsedFunc.node ? { node: parsedFunc.node } : {}) };
  }

  function parseOpItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    hasExportPrefix,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const opTail = consumeTopKeyword(rest, 'op') ?? '';
    const parsedOp = parseTopLevelOpDecl(
      opTail,
      text,
      stmtSpan,
      lineNo,
      index,
      hasExportPrefix,
      {
        file,
        lineCount,
        diagnostics,
        modulePath: filePath,
        getRawLine,
        isReservedTopLevelName,
        parseOpParamsFromText,
      },
    );
    if (!parsedOp) return { nextIndex: index + 1 };
    return { nextIndex: parsedOp.nextIndex, node: parsedOp.node };
  }

  function parseExternItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const externTail = consumeTopKeyword(rest, 'extern') ?? '';
    const parsedExtern = parseTopLevelExternDecl(
      externTail,
      text,
      stmtSpan,
      lineNo,
      index,
      {
        file,
        lineCount,
        diagnostics,
        modulePath: filePath,
        getRawLine,
        isReservedTopLevelName,
        parseParamsFromText,
      },
    );
    return { nextIndex: parsedExtern.nextIndex, ...(parsedExtern.node ? { node: parsedExtern.node } : {}) };
  }

  function parseEnumItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    hasExportPrefix,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const enumTail = consumeTopKeyword(rest, 'enum') ?? '';
    const enumNode = parseEnumDecl(
      enumTail,
      {
        diagnostics,
        modulePath: filePath,
        lineNo,
        text,
        span: stmtSpan,
        isReservedTopLevelName,
      },
      hasExportPrefix,
    );
    return { nextIndex: index + 1, ...(enumNode ? { node: enumNode } : {}) };
  }

  function parseSectionItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    lineStartOffset,
    ctx,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const sectionTail = consumeTopKeyword(rest, 'section') ?? '';
    if (ctx.scope === 'section') {
      diag(diagnostics, filePath, `nested section blocks are not supported`, {
        line: lineNo,
        column: 1,
      });
      return { nextIndex: index + 1 };
    }

    const sectionDecl = rest === 'section' ? '' : sectionTail;
    const namedTokens = sectionDecl.trim().split(/\s+/).filter((token) => token.length > 0);
    const namedPrefix =
      namedTokens.length >= 2 &&
      /^(code|data)$/i.test(namedTokens[0] ?? '') &&
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(namedTokens[1] ?? '') &&
      !/^(at|size|end)$/i.test(namedTokens[1] ?? '');
    if (namedPrefix) {
      const header = parseNamedSectionHeader(sectionDecl, stmtSpan, lineNo, text, filePath);
      if (!header) return { nextIndex: index + 1 };
      const parsedSection = parseSectionItems(index + 1, header.section);
      const sectionEndIndex = Math.max(parsedSection.nextIndex - 1, index);
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
        diag(diagnostics, filePath, `Missing end for section "${header.name}"`, {
          line: lineNo,
          column: 1,
        });
      }
      return { nextIndex: parsedSection.nextIndex, node: sectionNode };
    }

    parseSectionDirectiveDecl(rest, sectionTail, {
      diagnostics,
      modulePath: filePath,
      lineNo,
      text,
      span: stmtSpan,
      isReservedTopLevelName,
    });
    return { nextIndex: index + 1 };
  }

  function parseAlignItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const alignTail = consumeTopKeyword(rest, 'align') ?? '';
    const alignNode = parseAlignDirectiveDecl(rest, alignTail, {
      diagnostics,
      modulePath: filePath,
      lineNo,
      text,
      span: stmtSpan,
      isReservedTopLevelName,
    });
    return { nextIndex: index + 1, ...(alignNode ? { node: alignNode } : {}) };
  }

  function parseConstItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
    hasExportPrefix,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const constTail = consumeTopKeyword(rest, 'const') ?? '';
    const constNode = parseConstDecl(constTail, hasExportPrefix, {
      diagnostics,
      modulePath: filePath,
      lineNo,
      text,
      span: stmtSpan,
      isReservedTopLevelName,
    });
    return { nextIndex: index + 1, ...(constNode ? { node: constNode } : {}) };
  }

  function parseBinItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const binTail = consumeTopKeyword(rest, 'bin') ?? '';
    const node = parseBinDecl(binTail, {
      diagnostics,
      modulePath: filePath,
      lineNo,
      text,
      span: stmtSpan,
      isReservedTopLevelName,
    });
    return { nextIndex: index + 1, ...(node ? { node } : {}) };
  }

  function parseHexItem({
    index,
    lineNo,
    filePath,
    text,
    rest,
    stmtSpan,
  }: ParseModuleItemDispatchArgs): ParseItemResult {
    const hexTail = consumeTopKeyword(rest, 'hex') ?? '';
    const node = parseHexDecl(hexTail, {
      diagnostics,
      modulePath: filePath,
      lineNo,
      text,
      span: stmtSpan,
      isReservedTopLevelName,
    });
    return { nextIndex: index + 1, ...(node ? { node } : {}) };
  }

  function parseDataItem({
    index,
    lineNo,
    filePath,
    rest,
    ctx,
  }: ParseModuleItemDispatchArgs): ParseItemResult | undefined {
    if (rest.toLowerCase() !== 'data') return undefined;
    if (ctx.scope === 'module') {
      const parsedData = parseDataBlock(index, {
        file,
        lineCount,
        diagnostics,
        modulePath: filePath,
        getRawLine,
      });
      return { nextIndex: parsedData.nextIndex };
    }
    diag(
      diagnostics,
      filePath,
      `Bare "data" marker lines are removed; declare symbols directly inside named data sections.`,
      {
        line: lineNo,
        column: 1,
      },
    );
    return { nextIndex: index + 1 };
  }

  const moduleItemDispatchTable: Readonly<Partial<Record<string, ParseModuleItemDispatchHandler>>> = {
    import: parseImportItem,
    type: parseTypeItem,
    union: parseUnionItem,
    globals: parseGlobalsItem,
    var: parseGlobalsItem,
    func: parseFuncItem,
    op: parseOpItem,
    extern: parseExternItem,
    enum: parseEnumItem,
    section: parseSectionItem,
    align: parseAlignItem,
    const: parseConstItem,
    bin: parseBinItem,
    hex: parseHexItem,
    data: parseDataItem,
  };

  function parseRawDataValues(
    directive: 'db' | 'dw',
    valuesText: string,
    lineNo: number,
    lineSpan: SourceSpan,
    filePath: string,
  ): RawDataDeclNode | undefined {
    const parts = splitTopLevelComma(valuesText).map((part) => part.trim());
    if (parts.length === 0 || parts.every((part) => part.length === 0)) {
      diag(diagnostics, filePath, `"${directive}" expects one or more imm expressions`, {
        line: lineNo,
        column: 1,
      });
      return undefined;
    }
    const values: ImmExprNode[] = [];
    for (const part of parts) {
      if (part.length === 0) {
        diag(diagnostics, filePath, `"${directive}" expects one or more imm expressions`, {
          line: lineNo,
          column: 1,
        });
        return undefined;
      }
      const expr = parseImmExprFromText(filePath, part, lineSpan, diagnostics);
      if (!expr) return undefined;
      values.push(expr);
    }
    return { kind: 'RawDataDecl', span: lineSpan, name: '', directive, values };
  }

  function parseRawDataSize(
    sizeText: string,
    lineNo: number,
    lineSpan: SourceSpan,
    filePath: string,
  ): RawDataDeclNode | undefined {
    const parts = splitTopLevelComma(sizeText).map((part) => part.trim());
    if (parts.length !== 1 || parts[0]!.length === 0) {
      diag(diagnostics, filePath, `"ds" expects a single imm expression size`, {
        line: lineNo,
        column: 1,
      });
      return undefined;
    }
    const expr = parseImmExprFromText(filePath, parts[0]!, lineSpan, diagnostics);
    if (!expr) return undefined;
    return { kind: 'RawDataDecl', span: lineSpan, name: '', directive: 'ds', size: expr };
  }

  function parseRawDataDirective(
    label: PendingRawLabel,
    directiveText: string,
    lineNo: number,
    lineSpan: SourceSpan,
    filePath: string,
  ): RawDataDeclNode | undefined {
    const match = /^(db|dw|ds)\b(.*)$/i.exec(directiveText.trim());
    if (!match) return undefined;
    const directive = match[1]!.toLowerCase() as 'db' | 'dw' | 'ds';
    const payload = match[2]!.trim();
    const parsed =
      directive === 'ds'
        ? parseRawDataSize(payload, lineNo, lineSpan, filePath)
        : parseRawDataValues(directive, payload, lineNo, lineSpan, filePath);
    if (!parsed) return undefined;
    return { ...parsed, name: label.name, span: lineSpan };
  }

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
        const parsedRaw = parseRawDataDirective(ctx.pendingRawLabel, rest, lineNo, stmtSpan, filePath);
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
        const parsedRaw = parseRawDataDirective(label, inlineMatch[2]! + inlineMatch[3]!, lineNo, stmtSpan, filePath);
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
