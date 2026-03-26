import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnosticTypes.js';
import { parseAsmInstruction } from '../src/frontend/parseAsmInstruction.js';
import { makeSourceFile, span } from '../src/frontend/source.js';

describe('PR862 := assignment parser/AST support', () => {
  const file = makeSourceFile('pr862_assignment_parser.zax', '');
  const zeroSpan = span(file, 0, 0);

  function parse(
    text: string,
  ): { instr: ReturnType<typeof parseAsmInstruction>; diagnostics: Diagnostic[] } {
    const diagnostics: Diagnostic[] = [];
    const instr = parseAsmInstruction(file.path, text, zeroSpan, diagnostics);
    return { instr, diagnostics };
  }

  it('parses storage and register assignment forms', () => {
    let parsed = parse('x := a');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [
        { kind: 'Ea', expr: { kind: 'EaName', name: 'x' } },
        { kind: 'Reg', name: 'A' },
      ],
    });

    parsed = parse('a := x');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [
        { kind: 'Reg', name: 'A' },
        { kind: 'Ea', expr: { kind: 'EaName', name: 'x' } },
      ],
    });

    parsed = parse('words[idx] := hl');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [
        {
          kind: 'Ea',
          expr: {
            kind: 'EaIndex',
            base: { kind: 'EaName', name: 'words' },
          },
        },
        { kind: 'Reg', name: 'HL' },
      ],
    });
  });

  it('parses whole-register immediate and copy forms', () => {
    let parsed = parse('hl := 0');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [{ kind: 'Reg', name: 'HL' }, { kind: 'Imm' }],
    });

    parsed = parse('a := 1');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [{ kind: 'Reg', name: 'A' }, { kind: 'Imm' }],
    });

    parsed = parse('hl := de');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [{ kind: 'Reg', name: 'HL' }, { kind: 'Reg', name: 'DE' }],
    });

    parsed = parse('de := a');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [{ kind: 'Reg', name: 'DE' }, { kind: 'Reg', name: 'A' }],
    });

    parsed = parse('hl := @node.next');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: ':=',
      operands: [
        { kind: 'Reg', name: 'HL' },
        {
          kind: 'Ea',
          explicitAddressOf: true,
          expr: {
            kind: 'EaField',
            base: { kind: 'EaName', name: 'node' },
            field: 'next',
          },
        },
      ],
    });
  });

  it('rejects indirect and unsupported assignment forms', () => {
    for (const text of ['(hl) := a', 'a := (hl)']) {
      const parsed = parse(text);
      expect(parsed.instr).toBeUndefined();
      expect(parsed.diagnostics.length).toBeGreaterThan(0);
      expect(parsed.diagnostics[0]?.message).toContain(':=');
    }
  });

  it('rejects removed move syntax', () => {
    const parsed = parse('move x, a');
    expect(parsed.instr).toBeUndefined();
    expect(parsed.diagnostics.map((d) => d.message)).toContain('"move" has been removed; use ":=".');
  });
});
