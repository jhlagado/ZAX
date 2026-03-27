import type { RecordFieldNode, SourceSpan, TypeDeclNode, UnionDeclNode } from './ast.js';
import type { SourceFile } from './source.js';
import { span } from './source.js';
import type { Diagnostic } from '../diagnosticTypes.js';
import { parseDiag as diag } from './parseDiagnostics.js';
import { diagIfInferredArrayLengthNotAllowed, parseTypeExprFromText } from './parseImm.js';
import {
  diagInvalidBlockLine,
  diagInvalidHeaderLine,
  formatIdentifierToken,
  looksLikeKeywordBodyDeclLine,
  topLevelStartKeyword,
} from './parseModuleCommon.js';
import { stripLineComment as stripComment } from './parseParserShared.js';
import { parseRecordFieldDecl } from './parseRecordFieldDecl.js';

type RawLine = {
  raw: string;
  startOffset: number;
  endOffset: number;
  lineNo: number;
  filePath: string;
};

type ParseTypeContext = {
  file: SourceFile;
  lineCount: number;
  diagnostics: Diagnostic[];
  modulePath: string;
  getRawLine: (lineIndex: number) => RawLine;
  isReservedTopLevelName: (name: string) => boolean;
};

type ParsedTypeDecl = {
  node: TypeDeclNode;
  nextIndex: number;
};

type ParsedUnionDecl = {
  node: UnionDeclNode;
  nextIndex: number;
};

function parseRecordFields(
  name: string,
  allowFuncKeywordStart: boolean,
  startIndex: number,
  ctx: ParseTypeContext,
): {
  fields: RecordFieldNode[];
  nextIndex: number;
  terminated: boolean;
  endOffset: number;
  interruptedByKeyword?: string;
  interruptedByLine?: number;
  interruptedByFilePath?: string;
} {
  const { file, lineCount, diagnostics, modulePath, getRawLine, isReservedTopLevelName } = ctx;
  const fields: RecordFieldNode[] = [];
  const fieldNamesLower = new Set<string>();
  let terminated = false;
  let interruptedByKeyword: string | undefined;
  let interruptedByLine: number | undefined;
  let interruptedByFilePath: string | undefined;
  let endOffset = file.text.length;
  let index = startIndex;

  while (index < lineCount) {
    const fieldLine = getRawLine(index);
    const { endOffset: eo, lineNo: fieldLineNo, filePath: fieldFilePath } = fieldLine;
    const t = stripComment(fieldLine.raw).trim();
    const tLower = t.toLowerCase();
    if (t.length === 0) {
      index++;
      continue;
    }
    if (tLower === 'end') {
      terminated = true;
      endOffset = eo;
      index++;
      break;
    }
    const topKeyword = topLevelStartKeyword(t);
    if (topKeyword !== undefined) {
      if (allowFuncKeywordStart && topKeyword === 'func') {
        // func field forms are allowed inside unions in current parser behavior.
      } else {
        if (looksLikeKeywordBodyDeclLine(t)) {
          diagInvalidBlockLine(
            diagnostics,
            fieldFilePath,
            `${name} field declaration`,
            t,
            '<name>: <type>',
            fieldLineNo,
          );
          index++;
          continue;
        }
        interruptedByKeyword = topKeyword;
        interruptedByLine = fieldLineNo;
        interruptedByFilePath = fieldFilePath;
        break;
      }
    }

    const field = parseRecordFieldDecl(name, t, fieldLine, fieldNamesLower, {
      file,
      diagnostics,
      modulePath,
      isReservedTopLevelName,
    });
    if (field) fields.push(field);
    index++;
  }

  return {
    fields,
    nextIndex: index,
    terminated,
    endOffset,
    ...(interruptedByKeyword !== undefined ? { interruptedByKeyword } : {}),
    ...(interruptedByLine !== undefined ? { interruptedByLine } : {}),
    ...(interruptedByFilePath !== undefined ? { interruptedByFilePath } : {}),
  };
}

export function parseTypeDecl(
  typeTail: string,
  stmtText: string,
  stmtSpan: SourceSpan,
  lineNo: number,
  startIndex: number,
  ctx: ParseTypeContext,
  exported = false,
): ParsedTypeDecl | undefined {
  const { file, diagnostics, modulePath, isReservedTopLevelName } = ctx;
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
      diagInvalidHeaderLine(
        diagnostics,
        modulePath,
        'type declaration',
        stmtText,
        '<name> [<typeExpr>]',
        lineNo,
      );
    }
    return undefined;
  }
  if (isReservedTopLevelName(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid type name "${name}": collides with a top-level keyword.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }

  if (tail.length > 0) {
    const typeExpr = parseTypeExprFromText(tail, stmtSpan, { allowInferredArrayLength: false });
    if (!typeExpr) {
      if (
        diagIfInferredArrayLengthNotAllowed(diagnostics, modulePath, tail, {
          line: lineNo,
          column: 1,
        })
      ) {
        return undefined;
      }
      diagInvalidHeaderLine(
        diagnostics,
        modulePath,
        'type declaration',
        stmtText,
        '<name> [<typeExpr>]',
        lineNo,
      );
      return undefined;
    }
    return {
      node: { kind: 'TypeDecl', span: stmtSpan, name, exported, typeExpr },
      nextIndex: startIndex + 1,
    };
  }

  const record = parseRecordFields('record', false, startIndex + 1, ctx);
  if (!record.terminated) {
    if (
      record.interruptedByKeyword !== undefined &&
      record.interruptedByLine !== undefined &&
      record.interruptedByFilePath !== undefined
    ) {
      diag(
        diagnostics,
        record.interruptedByFilePath,
        `Unterminated type "${name}": expected "end" before "${record.interruptedByKeyword}"`,
        { line: record.interruptedByLine, column: 1 },
      );
    } else {
      diag(diagnostics, modulePath, `Unterminated type "${name}": missing "end"`, {
        line: lineNo,
        column: 1,
      });
    }
  }

  if (record.fields.length === 0) {
    diag(diagnostics, modulePath, `Type "${name}" must contain at least one field`, {
      line: lineNo,
      column: 1,
    });
  }

  const typeEnd = record.terminated ? record.endOffset : file.text.length;
  const typeSpan = span(file, stmtSpan.start.offset, typeEnd);
  return {
    node: {
      kind: 'TypeDecl',
      span: typeSpan,
      name,
      exported,
      typeExpr: { kind: 'RecordType', span: typeSpan, fields: record.fields },
    },
    nextIndex: record.nextIndex,
  };
}

export function parseUnionDecl(
  unionTail: string,
  stmtText: string,
  stmtSpan: SourceSpan,
  lineNo: number,
  startIndex: number,
  ctx: ParseTypeContext,
  exported = false,
): ParsedUnionDecl | undefined {
  const { file, diagnostics, modulePath, isReservedTopLevelName } = ctx;
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
      diagInvalidHeaderLine(
        diagnostics,
        modulePath,
        'union declaration',
        stmtText,
        '<name>',
        lineNo,
      );
    }
    return undefined;
  }
  if (isReservedTopLevelName(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid union name "${name}": collides with a top-level keyword.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }

  const record = parseRecordFields('union', true, startIndex + 1, ctx);

  if (!record.terminated) {
    if (
      record.interruptedByKeyword !== undefined &&
      record.interruptedByLine !== undefined &&
      record.interruptedByFilePath !== undefined
    ) {
      diag(
        diagnostics,
        record.interruptedByFilePath,
        `Unterminated union "${name}": expected "end" before "${record.interruptedByKeyword}"`,
        { line: record.interruptedByLine, column: 1 },
      );
    } else {
      diag(diagnostics, modulePath, `Unterminated union "${name}": missing "end"`, {
        line: lineNo,
        column: 1,
      });
    }
  }

  if (record.fields.length === 0) {
    diag(diagnostics, modulePath, `Union "${name}" must contain at least one field`, {
      line: lineNo,
      column: 1,
    });
  }

  const unionEnd = record.terminated ? record.endOffset : file.text.length;
  return {
    node: {
      kind: 'UnionDecl',
      span: span(file, stmtSpan.start.offset, unionEnd),
      name,
      exported,
      fields: record.fields,
    },
    nextIndex: record.nextIndex,
  };
}
