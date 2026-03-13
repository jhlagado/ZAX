import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { makeSourceFile, span } from '../src/frontend/source.js';
import { parseAsmInstruction } from '../src/frontend/parseOperands.js';

describe('PR779 move parser/AST support', () => {
  const file = makeSourceFile('pr779_move_parser.zax', '');
  const zeroSpan = span(file, 0, 0);

  function parse(text: string): { instr: ReturnType<typeof parseAsmInstruction>; diagnostics: Diagnostic[] } {
    const diagnostics: Diagnostic[] = [];
    const instr = parseAsmInstruction(file.path, text, zeroSpan, diagnostics);
    return { instr, diagnostics };
  }

  it('parses register-to-storage move forms', () => {
    let parsed = parse('move a, x');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'move',
      operands: [
        { kind: 'Reg', name: 'A' },
        { kind: 'Ea', expr: { kind: 'EaName', name: 'x' } },
      ],
    });

    parsed = parse('move x, a');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'move',
      operands: [
        { kind: 'Ea', expr: { kind: 'EaName', name: 'x' } },
        { kind: 'Reg', name: 'A' },
      ],
    });
  });

  it('parses indexed storage paths with move', () => {
    const parsed = parse('move hl, words[idx]');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'move',
      operands: [
        { kind: 'Reg', name: 'HL' },
        {
          kind: 'Ea',
          expr: {
            kind: 'EaIndex',
            base: { kind: 'EaName', name: 'words' },
          },
        },
      ],
    });
  });

  it('rejects register-only and storage-only move forms', () => {
    let parsed = parse('move a, b');
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    expect(parsed.diagnostics[0]?.message).toContain('move');

    parsed = parse('move x, y');
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    expect(parsed.diagnostics[0]?.message).toContain('move');
  });

  it('rejects address-of operands', () => {
    const parsed = parse('move a, @x');
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    expect(parsed.diagnostics[0]?.message).toContain('move');
  });

});
