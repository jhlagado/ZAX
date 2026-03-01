import { describe, expect, it } from 'vitest';

import {
  parseImmExprFromText,
  parseNumberLiteral,
  parseTypeExprFromText,
} from '../src/frontend/parseImm.js';
import { makeSourceFile, span } from '../src/frontend/source.js';
import type { Diagnostic } from '../src/diagnostics/types.js';

describe('PR476 immediate-expression parsing extraction', () => {
  const file = makeSourceFile('pr476_parse_imm_helpers.zax', '');
  const zeroSpan = span(file, 0, 0);

  it('keeps literal parsing behavior intact', () => {
    expect(parseNumberLiteral('$2A')).toBe(42);
    expect(parseNumberLiteral('%1010')).toBe(10);
    expect(parseNumberLiteral('0b111')).toBe(7);
    expect(parseNumberLiteral('123')).toBe(123);
    expect(parseNumberLiteral('garbage')).toBeUndefined();
  });

  it('keeps type parsing behavior intact', () => {
    expect(parseTypeExprFromText('word[2]', zeroSpan, { allowInferredArrayLength: false })).toEqual(
      {
        kind: 'ArrayType',
        span: zeroSpan,
        element: { kind: 'TypeName', span: zeroSpan, name: 'word' },
        length: 2,
      },
    );
    expect(
      parseTypeExprFromText('byte[]', zeroSpan, { allowInferredArrayLength: false }),
    ).toBeUndefined();
  });

  it('keeps imm parsing behavior intact', () => {
    const diagnostics: Diagnostic[] = [];
    const expr = parseImmExprFromText(
      file.path,
      "sizeof(word[2]) + offsetof(Foo, bar[1]) - ~'A'",
      zeroSpan,
      diagnostics,
    );

    expect(diagnostics).toEqual([]);
    expect(expr).toMatchObject({
      kind: 'ImmBinary',
      op: '-',
      left: {
        kind: 'ImmBinary',
        op: '+',
        left: {
          kind: 'ImmSizeof',
          typeExpr: {
            kind: 'ArrayType',
            element: { kind: 'TypeName', name: 'word' },
            length: 2,
          },
        },
        right: {
          kind: 'ImmOffsetof',
          typeExpr: { kind: 'TypeName', name: 'Foo' },
          path: {
            base: 'bar',
            steps: [{ kind: 'OffsetofIndex', expr: { kind: 'ImmLiteral', value: 1 } }],
          },
        },
      },
      right: {
        kind: 'ImmUnary',
        op: '~',
        expr: { kind: 'ImmLiteral', value: 65 },
      },
    });
  });
});
