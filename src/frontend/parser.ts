import type {
  AlignDirectiveNode,
  ImportNode,
  AsmBlockNode,
  AsmItemNode,
  AsmLabelNode,
  BinDeclNode,
  ConstDeclNode,
  EnumDeclNode,
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
import { parseTopLevelExternDecl } from './parseExternBlock.js';
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

function canonicalConditionToken(token: string): string {
  return token.toLowerCase();
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
