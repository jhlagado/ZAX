import type { OpMatcherNode, OpParamNode, ParamNode, SourceSpan, TypeExprNode } from './ast.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import { parseTypeExprFromText } from './parseImm.js';

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

export type ParseParamsContext = {
  isReservedTopLevelName: (name: string) => boolean;
};

export function parseParamsFromText(
  filePath: string,
  paramsText: string,
  paramsSpan: SourceSpan,
  diagnostics: Diagnostic[],
  ctx: ParseParamsContext,
): ParamNode[] | undefined {
  const trimmed = paramsText.trim();
  if (trimmed.length === 0) return [];

  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.some((p) => p.length === 0)) {
    diag(
      diagnostics,
      filePath,
      `Invalid parameter list: trailing or empty entries are not permitted.`,
      {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      },
    );
    return undefined;
  }
  const out: ParamNode[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(part);
    if (!m) {
      diag(diagnostics, filePath, `Invalid parameter declaration: expected <name>: <type>`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }

    const name = m[1]!;
    if (ctx.isReservedTopLevelName(name)) {
      diag(
        diagnostics,
        filePath,
        `Invalid parameter name "${name}": collides with a top-level keyword.`,
        {
          line: paramsSpan.start.line,
          column: paramsSpan.start.column,
        },
      );
      return undefined;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      diag(diagnostics, filePath, `Duplicate parameter name "${name}".`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }
    seen.add(lower);
    const typeText = m[2]!.trim();
    const typeExpr = parseTypeExprFromText(typeText, paramsSpan, {
      allowInferredArrayLength: true,
    });
    if (!typeExpr) {
      diag(diagnostics, filePath, `Invalid parameter type "${typeText}": expected <type>`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }
    if (typeExpr.kind === 'TypeName' && typeExpr.name === 'void') {
      diag(diagnostics, filePath, `Parameter "${name}" may not have type void`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }

    out.push({ kind: 'Param', span: paramsSpan, name, typeExpr });
  }
  return out;
}

function parseOpMatcherFromText(matcherText: string, matcherSpan: SourceSpan): OpMatcherNode {
  const t = matcherText.trim();
  const lower = t.toLowerCase();
  switch (lower) {
    case 'reg8':
      return { kind: 'MatcherReg8', span: matcherSpan };
    case 'reg16':
      return { kind: 'MatcherReg16', span: matcherSpan };
    case 'idx16':
      return { kind: 'MatcherIdx16', span: matcherSpan };
    case 'cc':
      return { kind: 'MatcherCc', span: matcherSpan };
    case 'imm8':
      return { kind: 'MatcherImm8', span: matcherSpan };
    case 'imm16':
      return { kind: 'MatcherImm16', span: matcherSpan };
    case 'ea':
      return { kind: 'MatcherEa', span: matcherSpan };
    case 'mem8':
      return { kind: 'MatcherMem8', span: matcherSpan };
    case 'mem16':
      return { kind: 'MatcherMem16', span: matcherSpan };
    default:
      return { kind: 'MatcherFixed', span: matcherSpan, token: t };
  }
}

export function parseOpParamsFromText(
  filePath: string,
  paramsText: string,
  paramsSpan: SourceSpan,
  diagnostics: Diagnostic[],
  ctx: ParseParamsContext,
): OpParamNode[] | undefined {
  const trimmed = paramsText.trim();
  if (trimmed.length === 0) return [];

  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.some((p) => p.length === 0)) {
    diag(
      diagnostics,
      filePath,
      `Invalid op parameter list: trailing or empty entries are not permitted.`,
      {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      },
    );
    return undefined;
  }
  const out: OpParamNode[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(part);
    if (!m) {
      diag(diagnostics, filePath, `Invalid op parameter declaration: expected <name>: <matcher>`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }

    const name = m[1]!;
    if (ctx.isReservedTopLevelName(name)) {
      diag(
        diagnostics,
        filePath,
        `Invalid op parameter name "${name}": collides with a top-level keyword.`,
        {
          line: paramsSpan.start.line,
          column: paramsSpan.start.column,
        },
      );
      return undefined;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      diag(diagnostics, filePath, `Duplicate op parameter name "${name}".`, {
        line: paramsSpan.start.line,
        column: paramsSpan.start.column,
      });
      return undefined;
    }
    seen.add(lower);
    const matcherText = m[2]!.trim();
    out.push({
      kind: 'OpParam',
      span: paramsSpan,
      name,
      matcher: parseOpMatcherFromText(matcherText, paramsSpan),
    });
  }
  return out;
}
