import type {
  AlignDirectiveNode,
  BinDeclNode,
  ConstDeclNode,
  HexDeclNode,
  ImportNode,
  SectionDirectiveNode,
  SourceSpan,
} from './ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import { parseImmExprFromText } from './parseImm.js';
import { diagInvalidHeaderLine, formatIdentifierToken } from './parseModuleCommon.js';

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

type SimpleTopLevelContext = {
  diagnostics: Diagnostic[];
  modulePath: string;
  lineNo: number;
  text: string;
  span: SourceSpan;
  isReservedTopLevelName: (name: string) => boolean;
};

export function parseImportDecl(
  importTail: string,
  ctx: SimpleTopLevelContext,
): ImportNode | undefined {
  const { diagnostics, modulePath, lineNo, text, span } = ctx;
  const spec = importTail.trim();
  if (spec.startsWith('"') && spec.endsWith('"') && spec.length >= 2) {
    return {
      kind: 'Import',
      span,
      specifier: spec.slice(1, -1),
      form: 'path',
    };
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(spec)) {
    return {
      kind: 'Import',
      span,
      specifier: spec,
      form: 'moduleId',
    };
  }
  diagInvalidHeaderLine(
    diagnostics,
    modulePath,
    'import statement',
    text,
    '"<path>.zax" or <moduleId>',
    lineNo,
  );
  return undefined;
}

export function parseSectionDirectiveDecl(
  rest: string,
  sectionTail: string | undefined,
  ctx: SimpleTopLevelContext,
): SectionDirectiveNode | undefined {
  const { diagnostics, modulePath, lineNo, text, span } = ctx;
  const decl = rest === 'section' ? '' : (sectionTail ?? '');
  const m = /^(code|data|var)(?:\s+at\s+(.+))?$/.exec(decl);
  if (!m) {
    diagInvalidHeaderLine(
      diagnostics,
      modulePath,
      'section directive',
      text,
      '<code|data|var> [at <imm16>]',
      lineNo,
    );
    return undefined;
  }

  const section = m[1]! as SectionDirectiveNode['section'];
  const atText = m[2]?.trim();
  const at = atText ? parseImmExprFromText(modulePath, atText, span, diagnostics) : undefined;

  return {
    kind: 'Section',
    span,
    section,
    ...(at ? { at } : {}),
  };
}

export function parseAlignDirectiveDecl(
  rest: string,
  alignTail: string | undefined,
  ctx: SimpleTopLevelContext,
): AlignDirectiveNode | undefined {
  const { diagnostics, modulePath, lineNo, text, span } = ctx;
  const exprText = rest === 'align' ? '' : (alignTail ?? '');
  if (exprText.length === 0) {
    diagInvalidHeaderLine(diagnostics, modulePath, 'align directive', text, '<imm16>', lineNo);
    return undefined;
  }
  const value = parseImmExprFromText(modulePath, exprText, span, diagnostics);
  if (!value) return undefined;
  return { kind: 'Align', span, value };
}

export function parseConstDecl(
  constTail: string,
  exported: boolean,
  ctx: SimpleTopLevelContext,
): ConstDeclNode | undefined {
  const { diagnostics, modulePath, lineNo, text, span, isReservedTopLevelName } = ctx;
  const eq = constTail.indexOf('=');
  if (eq < 0) {
    diagInvalidHeaderLine(
      diagnostics,
      modulePath,
      'const declaration',
      text,
      '<name> = <imm>',
      lineNo,
    );
    return undefined;
  }

  const name = constTail.slice(0, eq).trim();
  const rhs = constTail.slice(eq + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid const name ${formatIdentifierToken(name)}: expected <identifier>.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }
  if (isReservedTopLevelName(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid const name "${name}": collides with a top-level keyword.`,
      {
        line: lineNo,
        column: 1,
      },
    );
    return undefined;
  }
  if (rhs.length === 0) {
    diag(diagnostics, modulePath, `Invalid const declaration: missing initializer`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }

  const expr = parseImmExprFromText(modulePath, rhs, span, diagnostics);
  if (!expr) return undefined;

  return {
    kind: 'ConstDecl',
    span,
    name,
    exported,
    value: expr,
  };
}

export function parseBinDecl(binTail: string, ctx: SimpleTopLevelContext): BinDeclNode | undefined {
  const { diagnostics, modulePath, lineNo, text, span, isReservedTopLevelName } = ctx;
  const m = /^(\S+)\s+in\s+(\S+)\s+from\s+(.+)$/.exec(binTail.trim());
  if (!m) {
    diagInvalidHeaderLine(
      diagnostics,
      modulePath,
      'bin declaration',
      text,
      '<name> in <code|data> from "<path>"',
      lineNo,
    );
    return undefined;
  }
  const name = m[1]!;
  const sectionText = m[2]!.toLowerCase();
  const pathText = m[3]!.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid bin name ${formatIdentifierToken(name)}: expected <identifier>.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }
  if (sectionText === 'var') {
    diag(diagnostics, modulePath, `bin declarations cannot target section "var"`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }
  if (sectionText !== 'code' && sectionText !== 'data') {
    diag(diagnostics, modulePath, `Invalid bin section "${m[2]!}": expected "code" or "data".`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }
  if (isReservedTopLevelName(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid bin name "${name}": collides with a top-level keyword.`,
      {
        line: lineNo,
        column: 1,
      },
    );
    return undefined;
  }
  if (!(pathText.startsWith('"') && pathText.endsWith('"') && pathText.length >= 2)) {
    diag(diagnostics, modulePath, `Invalid bin declaration: expected quoted source path`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }
  return {
    kind: 'BinDecl',
    span,
    name,
    section: sectionText as BinDeclNode['section'],
    fromPath: pathText.slice(1, -1),
  };
}

export function parseHexDecl(hexTail: string, ctx: SimpleTopLevelContext): HexDeclNode | undefined {
  const { diagnostics, modulePath, lineNo, text, span, isReservedTopLevelName } = ctx;
  const m = /^(\S+)\s+from\s+(.+)$/.exec(hexTail.trim());
  if (!m) {
    diagInvalidHeaderLine(
      diagnostics,
      modulePath,
      'hex declaration',
      text,
      '<name> from "<path>"',
      lineNo,
    );
    return undefined;
  }
  const name = m[1]!;
  const pathText = m[2]!.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid hex name ${formatIdentifierToken(name)}: expected <identifier>.`,
      { line: lineNo, column: 1 },
    );
    return undefined;
  }
  if (isReservedTopLevelName(name)) {
    diag(
      diagnostics,
      modulePath,
      `Invalid hex name "${name}": collides with a top-level keyword.`,
      {
        line: lineNo,
        column: 1,
      },
    );
    return undefined;
  }
  if (!(pathText.startsWith('"') && pathText.endsWith('"') && pathText.length >= 2)) {
    diag(diagnostics, modulePath, `Invalid hex declaration: expected quoted source path`, {
      line: lineNo,
      column: 1,
    });
    return undefined;
  }
  return {
    kind: 'HexDecl',
    span,
    name,
    fromPath: pathText.slice(1, -1),
  };
}
