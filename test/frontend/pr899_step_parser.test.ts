import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../../src/diagnosticTypes.js';
import { parseAsmInstruction } from '../../src/frontend/parseAsmInstruction.js';
import { makeSourceFile, span } from '../../src/frontend/source.js';
import { expectDiagnostic, expectNoDiagnostics } from '../helpers/diagnostics.js';

describe('PR899 step parser support', () => {
  const file = makeSourceFile('pr899_step_parser.zax', '');
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
    expectNoDiagnostics(parsed.diagnostics);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'step',
      operands: [{ kind: 'Ea', expr: { kind: 'EaName', name: 'count' } }],
    });

    parsed = parse('step rec.field, 3');
    expectNoDiagnostics(parsed.diagnostics);
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
    expectNoDiagnostics(parsed.diagnostics);
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
    expectNoDiagnostics(parsed.diagnostics);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'step',
      operands: [
        { kind: 'Ea', expr: { kind: 'EaName', name: 'total' } },
        { kind: 'Imm', expr: { kind: 'ImmUnary', op: '-', expr: { kind: 'ImmLiteral', value: 2 } } },
      ],
    });
  });

  it('rejects registers, indirect forms, address-of forms, and arity errors', () => {
    for (const text of ['step hl', 'step (hl)', 'step @path', 'step left, right, extra']) {
      const parsed = parse(text);
      expect(parsed.instr).toBeUndefined();
      expectDiagnostic(parsed.diagnostics, { messageIncludes: 'step' });
    }
  });
});
