import type { RecordFieldNode } from './ast.js';
import type { Diagnostic } from '../diagnosticTypes.js';
import type { SourceFile } from './source.js';
import { span } from './source.js';
import { parseDiag as diag } from './parseDiagnostics.js';
import { diagIfInferredArrayLengthNotAllowed, parseTypeExprFromText } from './parseImm.js';
import { diagInvalidBlockLine, formatIdentifierToken } from './parseModuleCommon.js';

export type RecordFieldLine = {
  raw: string;
  startOffset: number;
  endOffset: number;
  lineNo: number;
  filePath: string;
};

export type RecordFieldValidationContext = {
  file: SourceFile;
  diagnostics: Diagnostic[];
  modulePath: string;
  isReservedTopLevelName: (name: string) => boolean;
};

export function parseRecordFieldDecl(
  kindName: string,
  fieldText: string,
  line: RecordFieldLine,
  fieldNamesLower: Set<string>,
  ctx: RecordFieldValidationContext,
): RecordFieldNode | undefined {
  const { file, diagnostics, modulePath, isReservedTopLevelName } = ctx;
  const { startOffset, endOffset, lineNo, filePath } = line;
  const match = /^([^:]+)\s*:\s*(.+)$/.exec(fieldText);
  if (!match) {
    diagInvalidBlockLine(
      diagnostics,
      filePath,
      `${kindName} field declaration`,
      fieldText,
      '<name>: <type>',
      lineNo,
    );
    return undefined;
  }

  const fieldName = match[1]!.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldName)) {
    diag(
      diagnostics,
      filePath,
      `Invalid ${kindName} field name ${formatIdentifierToken(fieldName)}: expected <identifier>.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }
  if (isReservedTopLevelName(fieldName)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid ${kindName} field name "${fieldName}": collides with a top-level keyword.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }

  const fieldNameLower = fieldName.toLowerCase();
  if (fieldNamesLower.has(fieldNameLower)) {
    diag(diagnostics, filePath, `Duplicate ${kindName} field name "${fieldName}".`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }

  const typeText = match[2]!.trim();
  const fieldSpan = span(file, startOffset, endOffset);
  const typeExpr = parseTypeExprFromText(typeText, fieldSpan, {
    allowInferredArrayLength: false,
  });
  if (!typeExpr) {
    if (
      diagIfInferredArrayLengthNotAllowed(diagnostics, filePath, typeText, {
        line: lineNo,
        column: 1,
      })
    ) {
      return undefined;
    }
    diagInvalidBlockLine(
      diagnostics,
      filePath,
      `${kindName} field declaration`,
      fieldText,
      '<name>: <type>',
      lineNo,
    );
    return undefined;
  }

  fieldNamesLower.add(fieldNameLower);
  return {
    kind: 'RecordField',
    span: fieldSpan,
    name: fieldName,
    typeExpr,
  };
}
