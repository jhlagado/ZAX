import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { parseAsmInstruction } from '../src/frontend/parseAsmInstruction.js';
import { makeSourceFile, span } from '../src/frontend/source.js';

describe('PR899 step/succ/pred parser support', () => {
  const file = makeSourceFile('pr899_succ_pred_parser.zax', '');
  const zeroSpan = span(file, 0, 0);

  function parse(
    text: string,
  ): { instr: ReturnType<typeof parseAsmInstruction>; diagnostics: Diagnostic[] } {
    const diagnostics: Diagnostic[] = [];
    const instr = parseAsmInstruction(file.path, text, zeroSpan, diagnostics);
    return { instr, diagnostics };
  }

  it('parses step typed-path forms with optional amounts', () => {
    let parsed = parse('step count');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'step',
      operands: [{ kind: 'Ea', expr: { kind: 'EaName', name: 'count' } }],
    });

    parsed = parse('step rec.field, 3');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'step',
      operands: [
        {
          kind: 'Ea',
          expr: {
            kind: 'EaField',
            base: { kind: 'EaName', name: 'rec' },
            field: 'field',
          },
        },
        { kind: 'Imm', expr: { kind: 'ImmLiteral', value: 3 } },
      ],
    });

    parsed = parse('step arr[idx], INC');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'step',
      operands: [
        {
          kind: 'Ea',
          expr: {
            kind: 'EaIndex',
            base: { kind: 'EaName', name: 'arr' },
          },
        },
        { kind: 'Imm', expr: { kind: 'ImmName', name: 'INC' } },
      ],
    });

    parsed = parse('step total, -2');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'step',
      operands: [
        { kind: 'Ea', expr: { kind: 'EaName', name: 'total' } },
        { kind: 'Imm', expr: { kind: 'ImmUnary', op: '-', expr: { kind: 'ImmLiteral', value: 2 } } },
      ],
    });
  });

  it('parses succ/pred aliases as single-operand typed-path forms', () => {
    let parsed = parse('succ count');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'succ',
      operands: [{ kind: 'Ea', expr: { kind: 'EaName', name: 'count' } }],
    });

    parsed = parse('pred rec.field');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'pred',
      operands: [
        {
          kind: 'Ea',
          expr: {
            kind: 'EaField',
            base: { kind: 'EaName', name: 'rec' },
            field: 'field',
          },
        },
      ],
    });
  });

  it('rejects registers, indirect forms, address-of forms, and arity errors', () => {
    for (const text of ['step hl', 'step (hl)', 'step @path', 'step left, right, extra', 'pred left, right']) {
      const parsed = parse(text);
      expect(parsed.instr).toBeUndefined();
      expect(parsed.diagnostics.length).toBeGreaterThan(0);
      const expectedHead = text.startsWith('pred') ? 'pred' : 'step';
      expect(parsed.diagnostics[0]?.message.toLowerCase()).toContain(expectedHead);
    }
  });
});
