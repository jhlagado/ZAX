import { describe, expect, it } from 'vitest';

import { parseClassicModule } from '../../src/frontend/asm80/parseClassicModule.js';
import type { ClassicItemNode } from '../../src/frontend/ast.js';

describe('classic ASM80 module parser', () => {
  it('maps classic lines into source-ordered AST items and stops at .end', () => {
    const diagnostics: unknown[] = [];
    const module = parseClassicModule(
      '/classic.z80',
      [
        'BASE: .equ 0C000H',
        '.org BASE',
        'start:',
        '  ld a, 0FFH',
        '  jp start',
        'table:',
        '  .db "OK",0',
        '  .dw start',
        '.end',
        'after: nop',
      ].join('\n'),
      diagnostics as never[],
    );

    expect(diagnostics).toEqual([]);
    expect(module.items.map((item: ClassicItemNode) => item.kind)).toEqual([
      'ClassicEqu',
      'ClassicOrg',
      'AsmLabel',
      'AsmInstruction',
      'AsmInstruction',
      'ClassicRawData',
      'ClassicRawData',
      'ClassicEnd',
    ]);
    expect(module.items.map((item: ClassicItemNode) => ('name' in item ? item.name : undefined))).toEqual([
      'BASE',
      undefined,
      'start',
      undefined,
      undefined,
      'table',
      '',
      undefined,
    ]);
    expect(module.items[3]).toMatchObject({ kind: 'AsmInstruction', head: 'ld', operandText: 'a, 0FFH' });
    expect(module.items[5]).toMatchObject({
      kind: 'ClassicRawData',
      name: 'table',
      directive: 'db',
      valuesText: '"OK",0',
    });
    expect(module.items[6]).toMatchObject({
      kind: 'ClassicRawData',
      name: '',
      directive: 'dw',
      valuesText: 'start',
    });
  });

  it('keeps commas inside quoted db strings', () => {
    const diagnostics: unknown[] = [];
    const module = parseClassicModule('/classic.z80', '.db "A,B",0\n', diagnostics as never[]);

    expect(diagnostics).toEqual([]);
    expect(module.items[0]).toMatchObject({
      kind: 'ClassicRawData',
      directive: 'db',
      valuesText: '"A,B",0',
      values: [{ kind: 'ClassicString', value: 'A,B' }, { kind: 'ImmLiteral', value: 0 }],
    });
  });

  it('parses single-quoted raw data characters as immediates', () => {
    const diagnostics: unknown[] = [];
    const module = parseClassicModule('/classic.z80', ".dw 'A'\n", diagnostics as never[]);

    expect(diagnostics).toEqual([]);
    expect(module.items[0]).toMatchObject({
      kind: 'ClassicRawData',
      directive: 'dw',
      valuesText: "'A'",
      values: [{ kind: 'ImmLiteral', value: 0x41 }],
    });
  });

  it('parses MON3 db string fragments without splitting quoted contents', () => {
    const diagnostics: unknown[] = [];
    const module = parseClassicModule(
      '/classic.z80',
      [
        '.db "Enter ",0',
        ".db '<_>?)!@#$%^&*( : +|'",
        '.db "2025.16"',
        '.db "A,B",0',
        '.db "a"-"A"',
      ].join('\n'),
      diagnostics as never[],
    );

    expect(diagnostics).toEqual([]);
    expect(module.items).toMatchObject([
      {
        kind: 'ClassicRawData',
        directive: 'db',
        valuesText: '"Enter ",0',
        values: [{ kind: 'ClassicString', value: 'Enter ' }, { kind: 'ImmLiteral', value: 0 }],
      },
      {
        kind: 'ClassicRawData',
        directive: 'db',
        valuesText: "'<_>?)!@#$%^&*( : +|'",
        values: [{ kind: 'ClassicString', value: '<_>?)!@#$%^&*( : +|' }],
      },
      {
        kind: 'ClassicRawData',
        directive: 'db',
        valuesText: '"2025.16"',
        values: [{ kind: 'ClassicString', value: '2025.16' }],
      },
      {
        kind: 'ClassicRawData',
        directive: 'db',
        valuesText: '"A,B",0',
        values: [{ kind: 'ClassicString', value: 'A,B' }, { kind: 'ImmLiteral', value: 0 }],
      },
      {
        kind: 'ClassicRawData',
        directive: 'db',
        valuesText: '"a"-"A"',
        values: [
          {
            kind: 'ImmBinary',
            op: '-',
            left: { kind: 'ImmLiteral', value: 97 },
            right: { kind: 'ImmLiteral', value: 65 },
          },
        ],
      },
    ]);
  });

  it('expands multi-character string equates in db values', () => {
    const diagnostics: unknown[] = [];
    const module = parseClassicModule(
      '/classic.z80',
      ['.db REL_TXT,0', 'REL_TXT: .equ "2025.16"'].join('\n'),
      diagnostics as never[],
    );

    expect(diagnostics).toEqual([]);
    expect(module.items).toMatchObject([
      {
        kind: 'ClassicRawData',
        directive: 'db',
        values: [{ kind: 'ClassicString', value: '2025.16' }, { kind: 'ImmLiteral', value: 0 }],
      },
      {
        kind: 'ClassicEqu',
        name: 'REL_TXT',
        exprText: '"2025.16"',
      },
    ]);
  });
});
