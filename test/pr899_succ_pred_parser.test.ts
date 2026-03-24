import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { parseAsmInstruction } from '../src/frontend/parseAsmInstruction.js';
import { makeSourceFile, span } from '../src/frontend/source.js';

describe('PR899 succ/pred parser support', () => {
  const file = makeSourceFile('pr899_succ_pred_parser.zax', '');
  const zeroSpan = span(file, 0, 0);

  function parse(
    text: string,
  ): { instr: ReturnType<typeof parseAsmInstruction>; diagnostics: Diagnostic[] } {
    const diagnostics: Diagnostic[] = [];
    const instr = parseAsmInstruction(file.path, text, zeroSpan, diagnostics);
    return { instr, diagnostics };
  }

  it('parses typed-path forms', () => {
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

    parsed = parse('succ arr[idx]');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.instr).toMatchObject({
      kind: 'AsmInstruction',
      head: 'succ',
      operands: [
        {
          kind: 'Ea',
          expr: {
            kind: 'EaIndex',
            base: { kind: 'EaName', name: 'arr' },
          },
        },
      ],
    });
  });

  it('rejects registers, indirect forms, address-of forms, and arity errors', () => {
    for (const text of ['succ hl', 'pred (hl)', 'succ @path', 'pred left, right']) {
      const parsed = parse(text);
      expect(parsed.instr).toBeUndefined();
      expect(parsed.diagnostics.length).toBeGreaterThan(0);
      expect(parsed.diagnostics[0]?.message.toLowerCase()).toContain(text.startsWith('pred') ? 'pred' : 'succ');
    }
  });
});
