import type { Diagnostic } from '../../diagnosticTypes.js';

import type { AsmLabelNode, ClassicItemNode, ClassicModuleFileNode, ModuleFileNode } from '../ast.js';
import { parseAsmInstruction } from '../parseAsmInstruction.js';
import { parseImmExprFromText } from '../parseImm.js';
import { makeSourceFile, span } from '../source.js';
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
): unknown[] {
  const out: unknown[] = [];
  const parts = splitTopLevelComma(valuesText).map((part) => part.trim()).filter((part) => part.length > 0);
  for (const part of parts) {
    const stringMatch = /^"([^"]*)"$/.exec(part);
    if (stringMatch) {
      out.push({ kind: 'ClassicString', value: stringMatch[1] ?? '' });
      continue;
    }
    const expr = parseImmExprFromText(path, part, lineSpan, diagnostics);
    if (expr) out.push(expr);
  }
  return out;
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
): ClassicModuleFileNode {
  const file = makeSourceFile(path, sourceText);
  const items: ClassicItemNode[] = [];
  let pendingRawLabel: AsmLabelNode | undefined;

  const lines = sourceText.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index]!;
    const lineStart = file.lineStarts[index] ?? sourceText.length;
    const lineSpan = span(file, lineStart, rawLineEndOffset(sourceText, lineStart));
    const parsed = parseClassicLine(path, raw, index + 1, lineStart);
    if (!parsed) continue;

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
          path,
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
          value: parseImmExprFromText(path, parsed.exprText, lineSpan, _diagnostics),
        } as unknown as ClassicItemNode);
        pendingRawLabel = undefined;
        break;
      case 'org':
        items.push({
          kind: 'ClassicOrg',
          span: lineSpan,
          exprText: parsed.exprText,
          value: parseImmExprFromText(path, parsed.exprText, lineSpan, _diagnostics),
        } as ClassicItemNode);
        pendingRawLabel = undefined;
        break;
      case 'binfrom':
        items.push({
          kind: 'ClassicBinFrom',
          span: lineSpan,
          exprText: parsed.exprText,
          value: parseImmExprFromText(path, parsed.exprText, lineSpan, _diagnostics),
        } as ClassicItemNode);
        pendingRawLabel = undefined;
        break;
      case 'align': {
        const value = parseImmExprFromText(path, parsed.exprText, lineSpan, _diagnostics);
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
          values: parseClassicRawValues(path, parsed.valuesText, lineSpan, _diagnostics),
          valuesText: parsed.valuesText,
        } as unknown as ClassicItemNode;
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
        return { kind: 'ClassicModuleFile', span: span(file, 0, sourceText.length), path, items };
    }
  }

  return { kind: 'ClassicModuleFile', span: span(file, 0, sourceText.length), path, items };
}

export function parseClassicModuleFile(
  path: string,
  sourceText: string,
  diagnostics: Diagnostic[],
): ModuleFileNode {
  const parsed = parseClassicModule(path, sourceText, diagnostics);
  return {
    kind: 'ModuleFile',
    span: parsed.span,
    path,
    moduleId: path,
    items: parsed.items,
  };
}
