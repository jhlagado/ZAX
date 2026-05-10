import { describe, expect, it } from 'vitest';

import { writeBin } from '../../src/formats/writeBin.js';
import type { ImmExprNode, ProgramNode, SourceSpan } from '../../src/frontend/ast.js';
import { emitProgram } from '../../src/lowering/emit.js';
import { buildEnv } from '../../src/semantics/env.js';
import type { Diagnostic } from '../../src/diagnosticTypes.js';

const file = '/fixtures/asm80/directives.z80';

function span(line: number): SourceSpan {
  return {
    file,
    start: { line, column: 1, offset: line - 1 },
    end: { line, column: 1, offset: line - 1 },
  };
}

function lit(value: number, line = 1): ImmExprNode {
  return { kind: 'ImmLiteral', span: span(line), value };
}

function name(value: string, line = 1): ImmExprNode {
  return { kind: 'ImmName', span: span(line), name: value };
}

function program(items: unknown[]): ProgramNode {
  return {
    kind: 'Program',
    span: span(1),
    entryFile: file,
    files: [
      {
        kind: 'ModuleFile',
        span: span(1),
        path: file,
        moduleId: 'directives',
        items: items as ProgramNode['files'][number]['items'],
      },
    ],
  };
}

function emitBytes(items: unknown[]): { bytes: number[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const ast = program(items);
  const env = buildEnv(ast, diagnostics);
  const emitted = emitProgram(ast, env, diagnostics);
  const bin = writeBin(emitted.map, emitted.symbols);
  return { bytes: [...bin.bytes], diagnostics };
}

describe('asm80 directive lowering integration', () => {
  it('lowers equ, org, db strings, dw labels, and binfrom into a flat binary', () => {
    const { bytes, diagnostics } = emitBytes([
      { kind: 'ClassicEqu', span: span(1), name: 'BASE', value: lit(0x0100, 1) },
      { kind: 'ClassicOrg', span: span(2), value: name('base', 2) },
      { kind: 'AsmLabel', span: span(3), name: 'start' },
      {
        kind: 'AsmInstruction',
        span: span(4),
        head: 'jp',
        operands: [{ kind: 'Imm', span: span(4), expr: name('start', 4) }],
      },
      { kind: 'AsmLabel', span: span(5), name: 'msg' },
      {
        kind: 'ClassicRawData',
        span: span(6),
        directive: 'db',
        values: [{ kind: 'ClassicString', value: 'A' }, lit(0, 6)],
      },
      { kind: 'AsmLabel', span: span(7), name: 'ptr' },
      {
        kind: 'ClassicRawData',
        span: span(8),
        directive: 'dw',
        values: [name('start', 8)],
      },
      { kind: 'ClassicBinFrom', span: span(9), value: name('BASE', 9) },
      { kind: 'ClassicEnd', span: span(10) },
    ]);

    expect(diagnostics).toEqual([]);
    expect(bytes).toEqual([0xc3, 0x00, 0x01, 0x41, 0x00, 0x00, 0x01]);
  });

  it('honors post-end binfrom while ignoring ordinary post-end data', () => {
    const { bytes, diagnostics } = emitBytes([
      { kind: 'ClassicOrg', span: span(1), value: lit(0x0082, 1) },
      {
        kind: 'ClassicRawData',
        span: span(2),
        directive: 'db',
        values: [lit(0x7e, 2)],
      },
      { kind: 'ClassicEnd', span: span(3) },
      {
        kind: 'ClassicRawData',
        span: span(4),
        directive: 'db',
        values: [lit(0xff, 4)],
      },
      { kind: 'ClassicBinFrom', span: span(5), value: lit(0x0080, 5) },
    ]);

    expect(diagnostics).toEqual([]);
    expect(bytes).toEqual([0x00, 0x00, 0x7e]);
  });
});
