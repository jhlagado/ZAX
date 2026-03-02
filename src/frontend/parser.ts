import type {
  AlignDirectiveNode,
  ImportNode,
  AsmBlockNode,
  AsmItemNode,
  AsmLabelNode,
  BinDeclNode,
  ConstDeclNode,
  DataBlockNode,
  DataDeclNode,
  DataRecordFieldInitNode,
  EnumDeclNode,
  ExternDeclNode,
  ExternFuncNode,
  FuncDeclNode,
  HexDeclNode,
  ImmExprNode,
  ModuleFileNode,
  ModuleItemNode,
  OpDeclNode,
  OpMatcherNode,
  OpParamNode,
  OffsetofPathNode,
  ParamNode,
  ProgramNode,
  SectionDirectiveNode,
  SourceSpan,
  TypeDeclNode,
  TypeExprNode,
  VarBlockNode,
  VarDeclNode,
  VarDeclInitializerNode,
} from './ast.js';
import { makeSourceFile, span } from './source.js';
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import {
  diagIfInferredArrayLengthNotAllowed,
  parseImmExprFromText,
  parseTypeExprFromText,
} from './parseImm.js';
import { parseEaExprFromText } from './parseOperands.js';
import {
  appendParsedAsmStatement,
  isRecoverOnlyControlFrame,
  parseAsmStatement,
  type AsmControlFrame,
  type ParsedAsmStatement,
} from './parseAsmStatements.js';
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
  parseReturnRegsFromText,
  parseVarDeclLine,
  topLevelStartKeyword,
  unsupportedExportTargetKind,
} from './parseModuleCommon.js';
import { parseExternFuncFromTail } from './parseExtern.js';
import { parseEnumDecl } from './parseEnum.js';
import { parseGlobalsBlock } from './parseGlobals.js';
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

function canonicalConditionToken(token: string): string {
  return token.toLowerCase();
}

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

  function consumeInvalidExternBlock(startIndex: number): number {
    let previewIndex = startIndex + 1;
    while (previewIndex < lineCount) {
      const { raw } = getRawLine(previewIndex);
      const t = stripComment(raw).trim();
      if (t.length === 0) {
        previewIndex++;
        continue;
      }
      const looksLikeBodyStart =
        t.toLowerCase() === 'end' ||
        consumeKeywordPrefix(t, 'func') !== undefined ||
        looksLikeKeywordBodyDeclLine(t);
      if (!looksLikeBodyStart) return startIndex + 1;
      break;
    }
    if (previewIndex >= lineCount) return startIndex + 1;

    let index = previewIndex;
    while (index < lineCount) {
      const { raw } = getRawLine(index);
      const t = stripComment(raw).trim();
      const tLower = t.toLowerCase();
      if (t.length === 0) {
        index++;
        continue;
      }
      if (tLower === 'end') return index + 1;
      const topKeyword = topLevelStartKeyword(t);
      if (
        topKeyword !== undefined &&
        consumeKeywordPrefix(t, 'func') === undefined &&
        !looksLikeKeywordBodyDeclLine(t)
      ) {
        return index;
      }
      index++;
    }
    return lineCount;
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
      const exported = hasExportPrefix;
      const header = funcTail;
      const openParen = header.indexOf('(');
      const closeParen = header.lastIndexOf(')');
      if (openParen < 0 || closeParen < openParen) {
        diagInvalidHeaderLine(
          diagnostics,
          modulePath,
          'func header',
          text,
          '<name>(...): <retType>',
          lineNo,
        );
        i++;
        continue;
      }

      const name = header.slice(0, openParen).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid func name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid func name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }

      const funcStartOffset = lineStartOffset;
      const headerSpan = span(file, lineStartOffset, lineEndOffset);
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
          i++;
          continue;
        }
        const parsedRegs = parseReturnRegsFromText(
          retMatch[1]!.trim(),
          headerSpan,
          lineNo,
          diagnostics,
          modulePath,
        );
        if (!parsedRegs) {
          i++;
          continue;
        }
        returnRegs = parsedRegs.regs;
      }

      const paramsText = header.slice(openParen + 1, closeParen);
      const params = parseParamsFromText(modulePath, paramsText, headerSpan, diagnostics, {
        isReservedTopLevelName,
      });
      if (!params) {
        i++;
        continue;
      }

      i++;

      // Optional function-local `var` block; function instruction body is parsed
      // as an implicit instruction stream.
      let locals: VarBlockNode | undefined;
      let asmStartOffset: number | undefined;
      let interruptedBeforeBodyKeyword: string | undefined;
      let interruptedBeforeBodyLine: number | undefined;
      while (i < lineCount) {
        const { raw: raw2, startOffset: so2 } = getRawLine(i);
        const t2 = stripComment(raw2).trim();
        const t2Lower = t2.toLowerCase();
        if (t2.length === 0) {
          i++;
          continue;
        }
        const t2TopKeyword = topLevelStartKeyword(t2);
        if (t2TopKeyword !== undefined && t2Lower !== 'var') {
          interruptedBeforeBodyKeyword = t2TopKeyword;
          interruptedBeforeBodyLine = i + 1;
          break;
        }

        if (t2Lower === 'var') {
          const varStart = so2;
          i++;
          const decls: VarDeclNode[] = [];
          const declNamesLower = new Set<string>();
          let varTerminated = false;

          while (i < lineCount) {
            const { raw: rawDecl, startOffset: soDecl, endOffset: eoDecl } = getRawLine(i);
            const tDecl = stripComment(rawDecl).trim();
            const tDeclLower = tDecl.toLowerCase();
            if (tDecl.length === 0) {
              i++;
              continue;
            }
            if (tDeclLower === 'end') {
              locals = {
                kind: 'VarBlock',
                span: span(file, varStart, eoDecl),
                scope: 'function',
                decls,
              };
              i++; // consume var-terminating end
              varTerminated = true;
              break;
            }
            if (tDeclLower === 'asm') {
              diag(
                diagnostics,
                modulePath,
                `Function-local var block must end with "end" before function body`,
                { line: i + 1, column: 1 },
              );
              locals = {
                kind: 'VarBlock',
                span: span(file, varStart, soDecl),
                scope: 'function',
                decls,
              };
              i++; // consume asm so body parsing can continue
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
                  i + 1,
                );
                i++;
                continue;
              }
              interruptedBeforeBodyKeyword = tDeclTopKeyword;
              interruptedBeforeBodyLine = i + 1;
              locals = {
                kind: 'VarBlock',
                span: span(file, varStart, soDecl),
                scope: 'function',
                decls,
              };
              break;
            }

            const declSpan = span(file, soDecl, eoDecl);
            const parsed = parseVarDeclLine(tDecl, declSpan, i + 1, 'var', {
              diagnostics,
              modulePath,
              isReservedTopLevelName,
            });
            if (!parsed) {
              i++;
              continue;
            }
            const localNameLower = parsed.name.toLowerCase();
            if (declNamesLower.has(localNameLower)) {
              diag(diagnostics, modulePath, `Duplicate var declaration name "${parsed.name}".`, {
                line: i + 1,
                column: 1,
              });
              i++;
              continue;
            }
            declNamesLower.add(localNameLower);
            decls.push(parsed);
            i++;
          }
          if (interruptedBeforeBodyKeyword !== undefined) break;
          if (!varTerminated) {
            diag(
              diagnostics,
              modulePath,
              `Unterminated func "${name}": expected "end" to terminate var block`,
              { line: lineNo, column: 1 },
            );
            break;
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
          continue;
        }
        diag(diagnostics, modulePath, `Unterminated func "${name}": expected function body`, {
          line: lineNo,
          column: 1,
        });
        break;
      }

      const asmItems: AsmItemNode[] = [];
      const asmControlStack: AsmControlFrame[] = [];
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      while (i < lineCount) {
        const { raw: rawLine, startOffset: lineOffset, endOffset } = getRawLine(i);
        const withoutComment = stripComment(rawLine);
        const content = withoutComment.trim();
        const contentLower = content.toLowerCase();
        if (content.length === 0) {
          i++;
          continue;
        }
        if (contentLower === 'asm' && asmControlStack.length === 0 && asmItems.length === 0) {
          diag(
            diagnostics,
            modulePath,
            `Unexpected "asm" in function body (function bodies are implicit)`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }

        if (contentLower === 'end' && asmControlStack.length === 0) {
          terminated = true;
          const funcEndOffset = endOffset;
          const funcSpan = span(file, funcStartOffset, funcEndOffset);
          const asmSpan = span(file, asmStartOffset, funcEndOffset);
          const asm: AsmBlockNode = { kind: 'AsmBlock', span: asmSpan, items: asmItems };

          const funcNode: FuncDeclNode = {
            kind: 'FuncDecl',
            span: funcSpan,
            name,
            exported,
            params,
            ...(returnRegs ? { returnRegs } : {}),
            ...(locals ? { locals } : {}),
            asm,
          };
          items.push(funcNode);
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(content);
        if (topKeyword !== undefined) {
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const fullSpan = span(file, lineOffset, endOffset);
        const contentStart = withoutComment.indexOf(content);
        const contentSpan =
          contentStart >= 0
            ? span(file, lineOffset + contentStart, lineOffset + withoutComment.length)
            : fullSpan;

        /* label: */
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
          i++;
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
        i++;
      }

      if (!terminated) {
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
          continue;
        }
        for (const frame of asmControlStack) {
          if (isRecoverOnlyControlFrame(frame)) continue;
          const span = frame.openSpan;
          const msg =
            frame.kind === 'Repeat'
              ? `"repeat" without matching "until <cc>"`
              : `"${frame.kind.toLowerCase()}" without matching "end"`;
          diag(diagnostics, modulePath, msg, { line: span.start.line, column: span.start.column });
        }
        diag(diagnostics, modulePath, `Unterminated func "${name}": missing "end"`, {
          line: lineNo,
          column: 1,
        });
        break;
      }

      continue;
    }

    const opTail = consumeTopKeyword(rest, 'op');
    if (opTail !== undefined) {
      const exported = hasExportPrefix;
      const header = opTail;
      const openParen = header.indexOf('(');
      const closeParen = header.lastIndexOf(')');
      if (openParen < 0 || closeParen < openParen) {
        diagInvalidHeaderLine(diagnostics, modulePath, 'op header', text, '<name>(...)', lineNo);
        i++;
        continue;
      }

      const name = header.slice(0, openParen).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid op name ${formatIdentifierToken(name)}: expected <identifier>.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }
      if (isReservedTopLevelName(name)) {
        diag(
          diagnostics,
          modulePath,
          `Invalid op name "${name}": collides with a top-level keyword.`,
          { line: lineNo, column: 1 },
        );
        i++;
        continue;
      }

      const trailing = header.slice(closeParen + 1).trim();
      if (trailing.length > 0) {
        diag(diagnostics, modulePath, `Invalid op header: unexpected trailing tokens`, {
          line: lineNo,
          column: 1,
        });
        i++;
        continue;
      }

      const opStartOffset = lineStartOffset;
      const headerSpan = span(file, lineStartOffset, lineEndOffset);
      const paramsText = header.slice(openParen + 1, closeParen);
      const params = parseOpParamsFromText(modulePath, paramsText, headerSpan, diagnostics, {
        isReservedTopLevelName,
      });
      if (!params) {
        i++;
        continue;
      }
      i++;

      const bodyItems: AsmItemNode[] = [];
      const controlStack: AsmControlFrame[] = [];
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      let opEndOffset = file.text.length;
      while (i < lineCount) {
        const { raw: rawLine, startOffset: so, endOffset: eo } = getRawLine(i);
        const content = stripComment(rawLine).trim();
        const contentLower = content.toLowerCase();
        if (content.length === 0) {
          i++;
          continue;
        }
        if (bodyItems.length === 0 && controlStack.length === 0 && contentLower === 'asm') {
          diag(diagnostics, modulePath, `Unexpected "asm" in op body (op bodies are implicit)`, {
            line: i + 1,
            column: 1,
          });
          i++;
          continue;
        }
        if (contentLower === 'end' && controlStack.length === 0) {
          terminated = true;
          opEndOffset = eo;
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(content);
        if (topKeyword !== undefined) {
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const fullSpan = span(file, so, eo);
        const contentStart = stripComment(rawLine).indexOf(content);
        const contentSpan =
          contentStart >= 0
            ? span(file, so + contentStart, so + stripComment(rawLine).length)
            : fullSpan;
        const labelMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(content);
        if (labelMatch) {
          const label = labelMatch[1]!;
          const remainder = labelMatch[2] ?? '';
          bodyItems.push({ kind: 'AsmLabel', span: fullSpan, name: label });
          if (remainder.trim().length > 0) {
            const stmt = parseAsmStatement(
              modulePath,
              remainder,
              contentSpan,
              diagnostics,
              controlStack,
            );
            appendParsedAsmStatement(bodyItems, stmt);
          }
          i++;
          continue;
        }

        const stmt = parseAsmStatement(modulePath, content, contentSpan, diagnostics, controlStack);
        appendParsedAsmStatement(bodyItems, stmt);
        i++;
      }

      if (!terminated) {
        if (interruptedByKeyword !== undefined && interruptedByLine !== undefined) {
          for (const frame of controlStack) {
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
            `Unterminated op "${name}": expected "end" before "${interruptedByKeyword}"`,
            { line: interruptedByLine, column: 1 },
          );
          continue;
        }
        for (const frame of controlStack) {
          if (isRecoverOnlyControlFrame(frame)) continue;
          const span = frame.openSpan;
          const msg =
            frame.kind === 'Repeat'
              ? `"repeat" without matching "until <cc>"`
              : `"${frame.kind.toLowerCase()}" without matching "end"`;
          diag(diagnostics, modulePath, msg, { line: span.start.line, column: span.start.column });
        }
        diag(diagnostics, modulePath, `Unterminated op "${name}": missing "end"`, {
          line: lineNo,
          column: 1,
        });
      }

      items.push({
        kind: 'OpDecl',
        span: span(file, opStartOffset, opEndOffset),
        name,
        exported,
        params,
        body: { kind: 'AsmBlock', span: span(file, opStartOffset, opEndOffset), items: bodyItems },
      } as OpDeclNode);
      continue;
    }

    const externTail = consumeTopKeyword(rest, 'extern');
    if (externTail !== undefined) {
      const decl = externTail.trim();
      const stmtSpan = span(file, lineStartOffset, lineEndOffset);
      const externFuncTail = consumeKeywordPrefix(decl, 'func');
      if (externFuncTail !== undefined) {
        const externFunc = parseExternFuncFromTail(externFuncTail, stmtSpan, lineNo, {
          diagnostics,
          modulePath,
          isReservedTopLevelName,
          parseParamsFromText,
        });
        if (externFunc) {
          const externDecl: ExternDeclNode = {
            kind: 'ExternDecl',
            span: stmtSpan,
            funcs: [externFunc],
          };
          items.push(externDecl);
        }
        i++;
        continue;
      }

      if (decl.length > 0) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(decl)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid extern base name ${formatIdentifierToken(decl)}: expected <identifier>.`,
            { line: lineNo, column: 1 },
          );
          i = consumeInvalidExternBlock(i);
          continue;
        }
        if (isReservedTopLevelName(decl)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid extern base name "${decl}": collides with a top-level keyword.`,
            { line: lineNo, column: 1 },
          );
          i = consumeInvalidExternBlock(i);
          continue;
        }
      }

      // Block form:
      // extern [baseName]
      //   func ...
      // end
      //
      // To avoid swallowing unrelated malformed top-level declarations, require that
      // the first non-empty line after `extern` looks like `func ...` or `end`.
      let preview = i + 1;
      let previewText: string | undefined;
      while (preview < lineCount) {
        const { raw: rawPreview } = getRawLine(preview);
        const t = stripComment(rawPreview).trim();
        if (t.length === 0) {
          preview++;
          continue;
        }
        previewText = t;
        break;
      }
      const previewKeyword = previewText ? topLevelStartKeyword(previewText) : undefined;
      const previewLooksLikeExternBodyDecl =
        previewText !== undefined &&
        previewKeyword !== undefined &&
        looksLikeKeywordBodyDeclLine(previewText);
      if (
        previewText === undefined ||
        (previewText.toLowerCase() !== 'end' &&
          consumeKeywordPrefix(previewText, 'func') === undefined &&
          !previewLooksLikeExternBodyDecl)
      ) {
        diagInvalidHeaderLine(
          diagnostics,
          modulePath,
          'extern declaration',
          text,
          '[<baseName>] or func <name>(...): <retType> at <imm16>',
          lineNo,
        );
        i++;
        continue;
      }

      const blockStart = lineStartOffset;
      const funcs: ExternFuncNode[] = [];
      const base = decl.length > 0 ? decl : undefined;
      let terminated = false;
      let interruptedByKeyword: string | undefined;
      let interruptedByLine: number | undefined;
      let blockEndOffset = file.text.length;
      i++;

      while (i < lineCount) {
        const { raw: rawDecl, startOffset: so, endOffset: eo } = getRawLine(i);
        const t = stripComment(rawDecl).trim();
        const tLower = t.toLowerCase();
        if (t.length === 0) {
          i++;
          continue;
        }
        if (tLower === 'end') {
          terminated = true;
          blockEndOffset = eo;
          i++;
          break;
        }
        const topKeyword = topLevelStartKeyword(t);
        if (topKeyword !== undefined && consumeKeywordPrefix(t, 'func') === undefined) {
          if (looksLikeKeywordBodyDeclLine(t)) {
            diagInvalidBlockLine(
              diagnostics,
              modulePath,
              'extern func declaration',
              t,
              'func <name>(...): <retType> at <imm16>',
              i + 1,
            );
            i++;
            continue;
          }
          interruptedByKeyword = topKeyword;
          interruptedByLine = i + 1;
          break;
        }

        const funcTail = consumeKeywordPrefix(t, 'func');
        if (funcTail === undefined) {
          diagInvalidBlockLine(
            diagnostics,
            modulePath,
            'extern func declaration',
            t,
            'func <name>(...): <retType> at <imm16>',
            i + 1,
          );
          i++;
          continue;
        }

        const fn = parseExternFuncFromTail(funcTail, span(file, so, eo), i + 1, {
          diagnostics,
          modulePath,
          isReservedTopLevelName,
          parseParamsFromText,
        });
        if (fn) funcs.push(fn);
        i++;
      }

      if (!terminated) {
        const namePart = base ? ` "${base}"` : '';
        if (interruptedByKeyword !== undefined && interruptedByLine !== undefined) {
          diag(
            diagnostics,
            modulePath,
            `Unterminated extern${namePart}: expected "end" before "${interruptedByKeyword}"`,
            { line: interruptedByLine, column: 1 },
          );
        } else {
          diag(diagnostics, modulePath, `Unterminated extern${namePart}: missing "end"`, {
            line: lineNo,
            column: 1,
          });
        }
      }
      if (funcs.length === 0) {
        diag(diagnostics, modulePath, `extern block must contain at least one func declaration`, {
          line: lineNo,
          column: 1,
        });
      }

      items.push({
        kind: 'ExternDecl',
        span: span(file, blockStart, terminated ? blockEndOffset : file.text.length),
        ...(base ? { base } : {}),
        funcs,
      });
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
      const blockStart = lineStartOffset;
      i++;
      const decls: DataDeclNode[] = [];
      const declNamesLower = new Set<string>();

      while (i < lineCount) {
        const { raw: rawDecl, startOffset: so, endOffset: eo } = getRawLine(i);
        const t = stripComment(rawDecl).trim();
        if (t.length === 0) {
          i++;
          continue;
        }
        if (isTopLevelStart(t)) {
          const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^=]+?)\s*=\s*(.+)$/.exec(t);
          if (m && TOP_LEVEL_KEYWORDS.has(m[1]!.toLowerCase())) {
            diag(
              diagnostics,
              modulePath,
              `Invalid data declaration name "${m[1]!}": collides with a top-level keyword.`,
              { line: i + 1, column: 1 },
            );
            i++;
            continue;
          }
          if (looksLikeKeywordBodyDeclLine(t)) {
            diagInvalidBlockLine(
              diagnostics,
              modulePath,
              'data declaration',
              t,
              '<name>: <type> = <initializer>',
              i + 1,
            );
            i++;
            continue;
          }
          break;
        }

        const m = /^([^:]+)\s*:\s*([^=]+?)\s*=\s*(.+)$/.exec(t);
        if (!m) {
          diagInvalidBlockLine(
            diagnostics,
            modulePath,
            'data declaration',
            t,
            '<name>: <type> = <initializer>',
            i + 1,
          );
          i++;
          continue;
        }

        const name = m[1]!.trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
          diag(
            diagnostics,
            modulePath,
            `Invalid data declaration name ${formatIdentifierToken(name)}: expected <identifier>.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        if (TOP_LEVEL_KEYWORDS.has(name.toLowerCase())) {
          diag(
            diagnostics,
            modulePath,
            `Invalid data declaration name "${name}": collides with a top-level keyword.`,
            { line: i + 1, column: 1 },
          );
          i++;
          continue;
        }
        const nameLower = name.toLowerCase();
        if (declNamesLower.has(nameLower)) {
          diag(diagnostics, modulePath, `Duplicate data declaration name "${name}".`, {
            line: i + 1,
            column: 1,
          });
          i++;
          continue;
        }
        declNamesLower.add(nameLower);
        const typeText = m[2]!.trim();
        const initText = m[3]!.trim();

        const lineSpan = span(file, so, eo);
        const typeExpr = parseTypeExprFromText(typeText, lineSpan, {
          allowInferredArrayLength: true,
        });

        if (!typeExpr) {
          diagInvalidBlockLine(
            diagnostics,
            modulePath,
            'data declaration',
            t,
            '<name>: <type> = <initializer>',
            i + 1,
          );
          i++;
          continue;
        }

        let initializer: DataDeclNode['initializer'] | undefined;
        if (initText.startsWith('"') && initText.endsWith('"') && initText.length >= 2) {
          initializer = { kind: 'InitString', span: lineSpan, value: initText.slice(1, -1) };
        } else if (initText.startsWith('{') && initText.endsWith('}')) {
          const inner = initText.slice(1, -1).trim();
          const parts = inner.length === 0 ? [] : splitTopLevelComma(inner).map((p) => p.trim());
          const namedFields: DataRecordFieldInitNode[] = [];
          const positionalElements: ImmExprNode[] = [];
          let sawNamed = false;
          let sawPositional = false;
          let parseFailed = false;

          for (const part of parts) {
            if (part.length === 0) {
              parseFailed = true;
              break;
            }
            const namedMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(part);
            if (namedMatch) {
              sawNamed = true;
              const value = parseImmExprFromText(
                modulePath,
                namedMatch[2]!.trim(),
                lineSpan,
                diagnostics,
              );
              if (!value) {
                parseFailed = true;
                continue;
              }
              namedFields.push({
                kind: 'DataRecordFieldInit',
                span: lineSpan,
                name: namedMatch[1]!,
                value,
              });
              continue;
            }
            sawPositional = true;
            const e = parseImmExprFromText(modulePath, part, lineSpan, diagnostics);
            if (!e) {
              parseFailed = true;
              continue;
            }
            positionalElements.push(e);
          }

          if (sawNamed && sawPositional) {
            diag(
              diagnostics,
              modulePath,
              `Mixed positional and named aggregate initializer entries are not allowed for "${name}".`,
              { line: i + 1, column: 1 },
            );
            parseFailed = true;
          }

          if (!parseFailed) {
            initializer = sawNamed
              ? { kind: 'InitRecordNamed', span: lineSpan, fields: namedFields }
              : { kind: 'InitArray', span: lineSpan, elements: positionalElements };
          }
        } else if (initText.startsWith('[') && initText.endsWith(']')) {
          const inner = initText.slice(1, -1).trim();
          const parts = inner.length === 0 ? [] : splitTopLevelComma(inner).map((p) => p.trim());
          const elements: ImmExprNode[] = [];
          for (const part of parts) {
            const e = parseImmExprFromText(modulePath, part, lineSpan, diagnostics);
            if (e) elements.push(e);
          }
          initializer = { kind: 'InitArray', span: lineSpan, elements };
        } else {
          const e = parseImmExprFromText(modulePath, initText, lineSpan, diagnostics);
          if (e) initializer = { kind: 'InitArray', span: lineSpan, elements: [e] };
        }

        if (!initializer) {
          i++;
          continue;
        }

        const declNode: DataDeclNode = {
          kind: 'DataDecl',
          span: lineSpan,
          name,
          typeExpr,
          initializer,
        };
        decls.push(declNode);
        i++;
      }

      const blockEnd = i < lineCount ? (getRawLine(i).startOffset ?? blockStart) : file.text.length;
      const dataBlock: DataBlockNode = {
        kind: 'DataBlock',
        span: span(file, blockStart, blockEnd),
        decls,
      };
      items.push(dataBlock);
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
