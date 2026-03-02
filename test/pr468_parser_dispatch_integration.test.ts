import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { parseProgram } from '../src/frontend/parser.js';

describe('PR468 parser dispatcher integration coverage', () => {
  it('keeps the split top-level dispatcher wired across extracted declaration families', () => {
    const diagnostics: Diagnostic[] = [];
    const program = parseProgram(
      'pr468_parser_dispatch_integration.zax',
      [
        'import "mod.zax"',
        'export const FOO = 1',
        'section data at $1000',
        'align $10',
        'enum Mode A',
        'globals',
        '  gword: word',
        'type Pair',
        '  left: word',
        '  right: word',
        'end',
        'union Value',
        '  w: word',
        'end',
        'data',
        '  blob: byte[2] = [1, 2]',
        'extern',
        '  func ext(v: word): HL at $1234',
        'end',
        'func main()',
        '  nop',
        'end',
        'op nopwrap()',
        '  nop',
        'end',
      ].join('\n'),
      diagnostics,
    );

    expect(diagnostics).toEqual([]);
    expect(program.files).toHaveLength(1);
    expect(program.files[0]?.items.map((item) => item.kind)).toEqual([
      'Import',
      'ConstDecl',
      'Section',
      'Align',
      'EnumDecl',
      'VarBlock',
      'TypeDecl',
      'UnionDecl',
      'DataBlock',
      'ExternDecl',
      'FuncDecl',
      'OpDecl',
    ]);
  });
});
