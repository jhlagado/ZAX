import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import {
  appendParsedAsmStatement,
  isRecoverOnlyControlFrame,
  parseAsmStatement,
  type AsmControlFrame,
} from '../src/frontend/parseAsmStatements.js';
import { makeSourceFile, span } from '../src/frontend/source.js';

describe('PR476 asm statement parsing extraction', () => {
  const file = makeSourceFile('pr476_parse_asm_statements_helpers.zax', '');
  const zeroSpan = span(file, 0, 0);

  it('keeps structured control parsing behavior intact', () => {
    const diagnostics: Diagnostic[] = [];
    const controlStack: AsmControlFrame[] = [];

    expect(
      parseAsmStatement(file.path, 'select a', zeroSpan, diagnostics, controlStack),
    ).toMatchObject({
      kind: 'Select',
      selector: { kind: 'Reg', name: 'A' },
    });
    expect(controlStack).toHaveLength(1);

    const parsed = parseAsmStatement(file.path, 'case 1, 2', zeroSpan, diagnostics, controlStack);
    const out: any[] = [];
    appendParsedAsmStatement(out, parsed);

    expect(out).toEqual([
      { kind: 'Case', span: zeroSpan, value: { kind: 'ImmLiteral', span: zeroSpan, value: 1 } },
      { kind: 'Case', span: zeroSpan, value: { kind: 'ImmLiteral', span: zeroSpan, value: 2 } },
    ]);
    expect(diagnostics).toEqual([]);
  });

  it('keeps recovery markers intact', () => {
    const diagnostics: Diagnostic[] = [];
    const controlStack: AsmControlFrame[] = [];

    const parsed = parseAsmStatement(
      file.path,
      'if nonsense extra',
      zeroSpan,
      diagnostics,
      controlStack,
    );
    expect(parsed).toMatchObject({ kind: 'If', cc: '__missing__' });
    expect(controlStack).toHaveLength(1);
    expect(isRecoverOnlyControlFrame(controlStack[0]!)).toBe(true);
    expect(diagnostics[0]?.message).toContain('"if" expects a condition code');
  });

  it('falls back to instruction parsing for plain asm lines', () => {
    const diagnostics: Diagnostic[] = [];
    const parsed = parseAsmStatement(file.path, 'ld a, $12', zeroSpan, diagnostics, []);

    expect(parsed).toEqual({
      kind: 'AsmInstruction',
      span: zeroSpan,
      head: 'ld',
      operands: [
        { kind: 'Reg', span: zeroSpan, name: 'A' },
        { kind: 'Imm', span: zeroSpan, expr: { kind: 'ImmLiteral', span: zeroSpan, value: 18 } },
      ],
    });
    expect(diagnostics).toEqual([]);
  });
});
