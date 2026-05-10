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
});
