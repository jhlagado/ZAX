import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { compile } from '../../src/compile.js';
import { writeBin } from '../../src/formats/writeBin.js';
import { parseClassicModuleFile } from '../../src/frontend/asm80/parseClassicModule.js';
import type { ImmExprNode, ProgramNode, SourceSpan } from '../../src/frontend/ast.js';
import { emitProgram } from '../../src/lowering/emit.js';
import { buildEnv } from '../../src/semantics/env.js';
import type { Diagnostic } from '../../src/diagnosticTypes.js';
import { defaultFormatWriters } from '../../src/formats/index.js';
import type { BinArtifact } from '../../src/formats/types.js';

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

function current(line = 1): ImmExprNode {
  return { kind: 'ImmCurrentLocation', span: span(line) };
}

function binary(op: Extract<ImmExprNode, { kind: 'ImmBinary' }>['op'], left: ImmExprNode, right: ImmExprNode, line = 1): ImmExprNode {
  return { kind: 'ImmBinary', span: span(line), op, left, right };
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
  it('compiles EX AF,AF prime with a trailing comment', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zax-asm80-af-prime-'));
    const entry = join(dir, 'af-prime.z80');
    writeFileSync(entry, [".org 0100H", "ex af,af'           ;start saving registers"].join('\n'), 'utf8');

    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    if (!bin) throw new Error('missing bin artifact');
    expect([...bin.bytes]).toEqual([0x08]);
  });

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

  it('resolves ASM80 current-location expressions in relative branches and raw words', () => {
    const { bytes, diagnostics } = emitBytes([
      { kind: 'ClassicOrg', span: span(1), value: lit(0x0100, 1) },
      {
        kind: 'AsmInstruction',
        span: span(2),
        head: 'jr',
        operands: [
          { kind: 'Imm', span: span(2), expr: name('z', 2) },
          { kind: 'Imm', span: span(2), expr: binary('+', current(2), lit(5, 2), 2) },
        ],
      },
      {
        kind: 'AsmInstruction',
        span: span(3),
        head: 'djnz',
        operands: [{ kind: 'Imm', span: span(3), expr: current(3) }],
      },
      {
        kind: 'ClassicRawData',
        span: span(4),
        directive: 'dw',
        values: [current(4)],
      },
      { kind: 'ClassicBinFrom', span: span(5), value: lit(0x0100, 5) },
    ]);

    expect(diagnostics).toEqual([]);
    expect(bytes).toEqual([0x28, 0x03, 0x10, 0xfe, 0x04, 0x01]);
  });

  it('compiles classic source current-location expressions in branches and raw words', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zax-asm80-current-location-'));
    const entry = join(dir, 'current-location.z80');
    writeFileSync(
      entry,
      ['.org 0100H', 'jr z,$+5', 'djnz $', '.dw $', '.binfrom 0100H', '.end'].join('\n'),
      'utf8',
    );

    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    if (!bin) throw new Error('missing bin artifact');
    expect([...bin.bytes]).toEqual([0x28, 0x03, 0x10, 0xfe, 0x04, 0x01]);
  });

  it('compiles single-quoted character literals in raw words', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zax-asm80-word-char-'));
    const entry = join(dir, 'word-char.z80');
    writeFileSync(entry, ['.org 0100H', ".dw 'A'", '.binfrom 0100H', '.end'].join('\n'), 'utf8');

    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    if (!bin) throw new Error('missing bin artifact');
    expect([...bin.bytes]).toEqual([0x41, 0x00]);
  });

  it('resolves classic equates used as absolute memory operands', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zax-asm80-equ-abs-mem-'));
    const entry = join(dir, 'equ-abs-mem.z80');
    writeFileSync(
      entry,
      ['.org 0100H', 'BUF: .equ 0900H', 'ld hl,(BUF)', '.binfrom 0100H', '.end'].join('\n'),
      'utf8',
    );

    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    if (!bin) throw new Error('missing bin artifact');
    expect([...bin.bytes]).toEqual([0x2a, 0x00, 0x09]);
  });

  it('compiles classic IX/IY indexed memory operands', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zax-asm80-ixiy-indexed-'));
    const entry = join(dir, 'ixiy-indexed.z80');
    writeFileSync(
      entry,
      ['.org 0100H', 'ld a,(ix+0)', 'ld a,(iy+12)', '.binfrom 0100H', '.end'].join('\n'),
      'utf8',
    );

    const res = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    if (!bin) throw new Error('missing bin artifact');
    expect([...bin.bytes]).toEqual([0xdd, 0x7e, 0x00, 0xfd, 0x7e, 0x0c]);
  });

  it('emits parsed db string fragments and string-character expressions', () => {
    const diagnostics: Diagnostic[] = [];
    const module = parseClassicModuleFile(
      file,
      [
        '.org 0100H',
        '.db "Enter ",0',
        ".db '<_>?)!@#$%^&*( : +|'",
        '.db "2025.16"',
        '.db "A,B",0',
        '.db "a"-"A"',
        '.binfrom 0100H',
        '.end',
      ].join('\n'),
      diagnostics,
    );
    const ast: ProgramNode = {
      kind: 'Program',
      span: span(1),
      entryFile: file,
      files: [module],
    };
    const env = buildEnv(ast, diagnostics);
    const emitted = emitProgram(ast, env, diagnostics);
    const bin = writeBin(emitted.map, emitted.symbols);

    expect(diagnostics).toEqual([]);
    expect([...bin.bytes]).toEqual([
      ...Buffer.from('Enter ', 'ascii'),
      0,
      ...Buffer.from('<_>?)!@#$%^&*( : +|', 'ascii'),
      ...Buffer.from('2025.16', 'ascii'),
      ...Buffer.from('A,B', 'ascii'),
      0,
      0x20,
    ]);
  });
});
