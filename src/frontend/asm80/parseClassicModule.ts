import type { Diagnostic } from '../../diagnosticTypes.js';

import type {
  AsmLabelNode,
  ClassicItemNode,
  ClassicModuleFileNode,
  ModuleFileNode,
} from '../ast.js';
import { parseAsmInstruction } from '../parseAsmInstruction.js';
import { parseImmExprFromText } from '../parseImm.js';
import { makeSourceFile, type SourceFile, span } from '../source.js';
import { parseClassicLine } from './classicLine.js';

function rawLineEndOffset(sourceText: string, startOffset: number): number {
  const newline = sourceText.indexOf('\n', startOffset);
  if (newline === -1) return sourceText.length;
  return newline > startOffset && sourceText[newline - 1] === '\r' ? newline - 1 : newline;
}

function parseClassicRawValues(
  path: string,
  valuesText: string,
  lineSpan: ReturnType<typeof span>,
  diagnostics: Diagnostic[],
  stringEquates: Map<string, string>,
): unknown[] {
  const out: unknown[] = [];
  const parts = splitTopLevelComma(valuesText)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  for (const part of parts) {
    const rawString = parseWholeQuotedString(part);
    if (rawString !== undefined) {
      if (part[0] === "'" && rawString.length === 1) {
        const expr = parseImmExprFromText(path, part, lineSpan, diagnostics);
        if (expr) {
          out.push(expr);
          continue;
        }
      }
      out.push({ kind: 'ClassicString', value: rawString });
      continue;
    }
    const stringEquate = /^[A-Za-z_][A-Za-z0-9_]*$/.exec(part)
      ? stringEquates.get(part.toLowerCase())
      : undefined;
    if (stringEquate !== undefined) {
      out.push({ kind: 'ClassicString', value: stringEquate });
      continue;
    }
    const expr = parseImmExprFromText(
      path,
      normalizeDoubleQuotedCharExpr(part),
      lineSpan,
      diagnostics,
    );
    if (expr) out.push(expr);
  }
  return out;
}

function parseWholeQuotedString(text: string): string | undefined {
  if (text.length < 2) return undefined;
  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) return undefined;

  let value = '';
  for (let i = 1; i < text.length - 1; i++) {
    const ch = text[i]!;
    if (ch === '\\') {
      if (i + 1 >= text.length - 1) return undefined;
      value += text[i + 1]!;
      i++;
      continue;
    }
    if (ch === quote) return undefined;
    value += ch;
  }
  return value;
}

function normalizeDoubleQuotedCharExpr(text: string): string {
  return text.replace(/"([^"\\])"/g, (_match, char: string) => `'${char}'`);
}

function splitTopLevelComma(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let inString = false;
  let inChar = false;
  let escaped = false;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if ((inString || inChar) && ch === '\\') {
      escaped = true;
      continue;
    }
    if (!inChar && ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString && ch === "'") {
      inChar = !inChar;
      continue;
    }
    if (inString || inChar) continue;
    if (ch === '(') {
      parenDepth++;
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (ch === '[') {
      bracketDepth++;
      continue;
    }
    if (ch === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (ch === ',' && parenDepth === 0 && bracketDepth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

export function parseClassicModule(
  path: string,
  sourceText: string,
  _diagnostics: Diagnostic[],
  sourceFile?: SourceFile,
): ClassicModuleFileNode {
  const file = sourceFile ?? makeSourceFile(path, sourceText);
  const items: ClassicItemNode[] = [];
  let pendingRawLabel: AsmLabelNode | undefined;
  let ended = false;

  const lines = sourceText.split(/\r?\n/);
  const stringEquates = new Map<string, string>();
  for (let index = 0; index < lines.length; index++) {
    const parsed = parseClassicLine(path, lines[index]!, index + 1, file.lineStarts[index] ?? 0);
    if (parsed?.kind === 'end') break;
    if (parsed?.kind !== 'equ') continue;
    const rawString = parseWholeQuotedString(parsed.exprText);
    if (rawString !== undefined && rawString.length > 1) {
      stringEquates.set(parsed.name.toLowerCase(), rawString);
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index]!;
    const lineStart = file.lineStarts[index] ?? sourceText.length;
    const lineSpan = span(file, lineStart, rawLineEndOffset(sourceText, lineStart));
    const linePath = lineSpan.file;
    const parsed = parseClassicLine(path, raw, index + 1, lineStart);
    if (!parsed) continue;
    if (ended && parsed.kind !== 'binfrom' && parsed.kind !== 'binto') continue;

    switch (parsed.kind) {
      case 'label': {
        const label: AsmLabelNode = { kind: 'AsmLabel', span: lineSpan, name: parsed.name };
        items.push(label);
        pendingRawLabel = label;
        break;
      }
      case 'instruction': {
        if (parsed.label) {
          items.push({ kind: 'AsmLabel', span: lineSpan, name: parsed.label });
        }
        const instruction = parseAsmInstruction(
          linePath,
          parsed.operandText.length > 0 ? `${parsed.head} ${parsed.operandText}` : parsed.head,
          lineSpan,
          _diagnostics,
        );
        if (instruction) items.push({ ...instruction, operandText: parsed.operandText });
        pendingRawLabel = undefined;
        break;
      }
      case 'equ':
        items.push({
          kind: 'ClassicEqu',
          span: lineSpan,
          name: parsed.name,
          exprText: parsed.exprText,
          value: parseImmExprFromText(
            linePath,
            normalizeDoubleQuotedCharExpr(parsed.exprText),
            lineSpan,
            _diagnostics,
            !stringEquates.has(parsed.name.toLowerCase()),
          ),
        } as unknown as ClassicItemNode);
        pendingRawLabel = undefined;
        break;
      case 'org':
        items.push({
          kind: 'ClassicOrg',
          span: lineSpan,
          exprText: parsed.exprText,
          value: parseImmExprFromText(linePath, parsed.exprText, lineSpan, _diagnostics),
        } as ClassicItemNode);
        pendingRawLabel = undefined;
        break;
      case 'binfrom':
        items.push({
          kind: 'ClassicBinFrom',
          span: lineSpan,
          exprText: parsed.exprText,
          value: parseImmExprFromText(linePath, parsed.exprText, lineSpan, _diagnostics),
        } as ClassicItemNode);
        pendingRawLabel = undefined;
        break;
      case 'binto':
        items.push({
          kind: 'ClassicBinTo',
          span: lineSpan,
          exprText: parsed.exprText,
          value: parseImmExprFromText(linePath, parsed.exprText, lineSpan, _diagnostics),
        } as ClassicItemNode);
        pendingRawLabel = undefined;
        break;
      case 'align': {
        const value = parseImmExprFromText(linePath, parsed.exprText, lineSpan, _diagnostics);
        if (value) {
          items.push({ kind: 'ClassicAlign', span: lineSpan, value } as unknown as ClassicItemNode);
        }
        pendingRawLabel = undefined;
        break;
      }
      case 'rawData': {
        const name = parsed.label ?? pendingRawLabel?.name ?? '';
        const rawData: ClassicItemNode = {
          kind: 'ClassicRawData',
          span: lineSpan,
          name,
          directive: parsed.directive,
          values: parseClassicRawValues(
            linePath,
            parsed.valuesText,
            lineSpan,
            _diagnostics,
            stringEquates,
          ),
          valuesText: parsed.valuesText,
        } as unknown as ClassicItemNode;
        if (parsed.directive === 'ds') {
          const values = (rawData as unknown as { values?: unknown[] }).values;
          const rawDataWithSize = rawData as unknown as { size?: unknown; fill?: unknown };
          rawDataWithSize.size = values?.[0];
          if (values?.[1]) rawDataWithSize.fill = values[1];
        }
        if (parsed.label) {
          items.push({ kind: 'AsmLabel', span: lineSpan, name: parsed.label });
        } else if (pendingRawLabel) {
          items.pop();
        }
        items.push(rawData);
        pendingRawLabel = undefined;
        break;
      }
      case 'end':
        items.push({ kind: 'ClassicEnd', span: lineSpan });
        ended = true;
        pendingRawLabel = undefined;
        break;
    }
  }

  return { kind: 'ClassicModuleFile', span: span(file, 0, sourceText.length), path, items };
}

export function parseClassicModuleFile(
  path: string,
  sourceText: string,
  diagnostics: Diagnostic[],
  sourceFile?: SourceFile,
): ModuleFileNode {
  const parsed = parseClassicModule(path, sourceText, diagnostics, sourceFile);
  return {
    kind: 'ModuleFile',
    span: parsed.span,
    path,
    moduleId: path,
    items: parsed.items,
  };
}
