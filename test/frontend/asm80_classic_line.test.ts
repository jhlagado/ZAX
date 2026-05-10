import { describe, expect, it } from 'vitest';

import { parseClassicLine } from '../../src/frontend/asm80/classicLine.js';

describe('classic ASM80 logical line parser', () => {
  it('parses labels, directives, raw data, and instructions', () => {
    const lines = [
      'boot:',
      'kCPI:   cpi',
      'KEYB:   .equ 00H',
      'MCB_RTC .equ 40H',
      '        .org BASE_ADDR+08H',
      '        .db "Enter ",0',
      '        .dw DATA_FROM',
      '        .binfrom 0C000H',
      '        .end',
    ].map((text, index) => parseClassicLine('/classic.z80', text, index + 1, 0));

    expect(lines).toEqual([
      { kind: 'label', name: 'boot' },
      { kind: 'instruction', label: 'kCPI', head: 'cpi', operandText: '' },
      { kind: 'equ', name: 'KEYB', exprText: '00H' },
      { kind: 'equ', name: 'MCB_RTC', exprText: '40H' },
      { kind: 'org', exprText: 'BASE_ADDR+08H' },
      { kind: 'rawData', directive: 'db', valuesText: '"Enter ",0' },
      { kind: 'rawData', directive: 'dw', valuesText: 'DATA_FROM' },
      { kind: 'binfrom', exprText: '0C000H' },
      { kind: 'end' },
    ]);
  });

  it('ignores semicolon comments outside quoted strings', () => {
    expect(parseClassicLine('/classic.z80', 'msg: .db "A;B",0 ; comment', 1, 0)).toEqual({
      kind: 'rawData',
      label: 'msg',
      directive: 'db',
      valuesText: '"A;B",0',
    });
  });

  it('preserves AF prime suffix while stripping trailing comments', () => {
    expect(parseClassicLine('/classic.z80', "ex af,af'           ;start saving registers", 1, 0)).toEqual({
      kind: 'instruction',
      head: 'ex',
      operandText: "af,af'",
    });
  });
});
