import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { parseProgram } from '../src/frontend/parser.js';

describe('PR572 named section parser scaffolding', () => {
  it('parses named sections with anchors and section-contained declarations', () => {
    const diagnostics: Diagnostic[] = [];
    const program = parseProgram(
      'pr572_named_sections.zax',
      [
        'section code boot at $1000 size $40',
        '  align $10',
        '  export func main(): HL',
        '    ret',
        '  end',
        '  data',
        '    message: byte[3] = "abc"',
        'end',
      ].join('\n'),
      diagnostics,
    );

    expect(diagnostics).toEqual([]);
    const section = program.files[0]?.items[0];
    expect(section).toMatchObject({
      kind: 'NamedSection',
      section: 'code',
      name: 'boot',
      anchor: {
        kind: 'SectionAnchor',
        at: { kind: 'ImmLiteral', value: 0x1000 },
        size: { kind: 'ImmLiteral', value: 0x40 },
      },
    });
    if (!section || section.kind !== 'NamedSection') {
      throw new Error('expected named section');
    }
    expect(section.items).toHaveLength(3);
    expect(section.items[0]).toMatchObject({ kind: 'Align' });
    expect(section.items[1]).toMatchObject({
      kind: 'FuncDecl',
      name: 'main',
      exported: true,
    });
    expect(section.items[2]).toMatchObject({ kind: 'DataBlock' });
  });

  it('keeps imports module-scoped and preserves legacy section directives', () => {
    const diagnostics: Diagnostic[] = [];
    const program = parseProgram(
      'pr572_section_scope.zax',
      [
        'section data buffers',
        '  import "dep.zax"',
        '  align $08',
        'end',
        'section data at $2000',
      ].join('\n'),
      diagnostics,
    );

    expect(program.files[0]?.items[0]).toMatchObject({
      kind: 'NamedSection',
      section: 'data',
      name: 'buffers',
    });
    expect(program.files[0]?.items[1]).toMatchObject({
      kind: 'Section',
      section: 'data',
      at: { kind: 'ImmLiteral', value: 0x2000 },
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      message: 'import is only permitted at module scope',
      line: 2,
      column: 1,
    });
  });

  it('applies top-level export target rules inside named sections', () => {
    const diagnostics: Diagnostic[] = [];
    parseProgram(
      'pr572_section_exports.zax',
      [
        'section data buffers',
        '  export bin blob in data from "blob.bin"',
        'end',
      ].join('\n'),
      diagnostics,
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      message: 'export not supported on bin declarations',
      line: 2,
      column: 1,
    });
  });
});
