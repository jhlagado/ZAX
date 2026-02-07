import type { SourcePosition, SourceSpan } from './ast.js';

export interface SourceFile {
  path: string;
  text: string;
  lineStarts: number[]; // offsets
}

export function makeSourceFile(path: string, text: string): SourceFile {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }
  return { path, text, lineStarts };
}

export function posAtOffset(file: SourceFile, offset: number): SourcePosition {
  const clamped = Math.max(0, Math.min(offset, file.text.length));
  let lo = 0;
  let hi = file.lineStarts.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const midStart = file.lineStarts[mid] ?? 0;
    if (midStart <= clamped) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const lineStart = file.lineStarts[lo] ?? 0;
  return { line: lo + 1, column: clamped - lineStart + 1, offset: clamped };
}

export function span(file: SourceFile, startOffset: number, endOffset: number): SourceSpan {
  return {
    file: file.path,
    start: posAtOffset(file, startOffset),
    end: posAtOffset(file, endOffset),
  };
}
