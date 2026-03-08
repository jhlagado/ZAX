import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { parseProgram } from '../src/frontend/parser.js';
import { parseAsmStatement } from '../src/frontend/parseAsmStatements.js';
import { makeSourceFile, span } from '../src/frontend/source.js';

describe('#730 addr parser scaffolding', () => {
  const file = makeSourceFile('pr730_addr_parser.zax', '');
  const zeroSpan = span(file, 0, 0);

  it('parses addr hl, ea_expr into an explicit AST node', () => {
    const diagnostics: Diagnostic[] = [];
    const program = parseProgram(
      'pr730_addr_parser.zax',
      ['func main()', 'addr hl, sprites[idx].flags + 2', 'end', ''].join('\n'),
      diagnostics,
    );

    expect(diagnostics).toEqual([]);
    expect(program.files[0]?.items[0]).toMatchObject({
      kind: 'FuncDecl',
      asm: {
        kind: 'AsmBlock',
        items: [
          {
            kind: 'AsmAddr',
            dst: 'HL',
            expr: {
              kind: 'EaAdd',
              base: {
                kind: 'EaField',
                field: 'flags',
                base: {
                  kind: 'EaIndex',
                  base: { kind: 'EaName', name: 'sprites' },
                  index: {
                    kind: 'IndexImm',
                    value: { kind: 'ImmName', name: 'idx' },
                  },
                },
              },
              offset: { kind: 'ImmLiteral', value: 2 },
            },
          },
        ],
      },
    });
  });

  it('rejects non-HL destinations in this slice', () => {
    const diagnostics: Diagnostic[] = [];
    const parsed = parseAsmStatement(file.path, 'addr de, table[idx]', zeroSpan, diagnostics, []);

    expect(parsed).toBeUndefined();
    expect(diagnostics.some((d) => d.message.includes('destination register HL'))).toBe(true);
  });

  it('accepts representative indexed-and-fielded ea expressions', () => {
    const diagnostics: Diagnostic[] = [];
    const parsed = parseAsmStatement(file.path, 'addr hl, table[idx].field + 4', zeroSpan, diagnostics, []);

    expect(parsed).toMatchObject({
      kind: 'AsmAddr',
      dst: 'HL',
      expr: {
        kind: 'EaAdd',
        base: {
          kind: 'EaField',
          field: 'field',
          base: {
            kind: 'EaIndex',
            base: { kind: 'EaName', name: 'table' },
            index: {
              kind: 'IndexImm',
              value: { kind: 'ImmName', name: 'idx' },
            },
          },
        },
        offset: { kind: 'ImmLiteral', value: 4 },
      },
    });
    expect(diagnostics).toEqual([]);
  });
});
