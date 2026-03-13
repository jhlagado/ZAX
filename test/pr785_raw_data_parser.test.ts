import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import type { NamedSectionNode, RawDataDeclNode } from '../src/frontend/ast.js';
import { parseModuleFile } from '../src/frontend/parser.js';

function parse(source: string): { diagnostics: Diagnostic[]; module: ReturnType<typeof parseModuleFile> } {
  const diagnostics: Diagnostic[] = [];
  const module = parseModuleFile('pr785_raw_data_parser.zax', source, diagnostics);
  return { diagnostics, module };
}

function getFirstSection(module: ReturnType<typeof parseModuleFile>): NamedSectionNode {
  const section = module.items.find((item): item is NamedSectionNode => item.kind === 'NamedSection');
  if (!section) {
    throw new Error('Expected a named section in parsed module.');
  }
  return section;
}

describe('PR785 raw data parser', () => {
  it('parses labeled db/dw/ds directives inside data sections', () => {
    const { diagnostics, module } = parse(`
section data vars at $8000
  table:
  db 1, 2, 3
  jump_table:
  dw handler_a, handler_b
  scratch:
  ds 32
  count: byte = 0
end

func handler_a()
end

func handler_b()
end
    `);

    expect(diagnostics).toEqual([]);
    const section = getFirstSection(module);
    const rawItems = section.items.filter(
      (item): item is RawDataDeclNode => item.kind === 'RawDataDecl',
    );
    expect(rawItems).toHaveLength(3);
    const first = rawItems[0];
    const second = rawItems[1];
    const third = rawItems[2];
    if (!first || !second || !third) {
      throw new Error('Expected three raw data declarations.');
    }

    expect(first).toMatchObject({
      name: 'table',
      directive: 'db',
    });
    if (first.directive !== 'db') {
      throw new Error('Expected first raw item to be db.');
    }
    expect(first.values.map((value) => value.kind === 'ImmLiteral' && value.value)).toEqual([
      1, 2, 3,
    ]);

    expect(second).toMatchObject({
      name: 'jump_table',
      directive: 'dw',
    });
    if (second.directive !== 'dw') {
      throw new Error('Expected second raw item to be dw.');
    }
    expect(second.values).toMatchObject([
      { kind: 'ImmName', name: 'handler_a' },
      { kind: 'ImmName', name: 'handler_b' },
    ]);
    expect(third).toMatchObject({
      name: 'scratch',
      directive: 'ds',
      size: { kind: 'ImmLiteral', value: 32 },
    });

    const dataDecl = section.items.find((item) => item.kind === 'DataDecl');
    expect(dataDecl).toBeDefined();
  });

  it('rejects raw directives outside data sections', () => {
    const { diagnostics } = parse(`
db 1, 2, 3
    `);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]?.message).toContain('Raw data directives');
  });

  it('rejects raw directives inside code sections', () => {
    const { diagnostics } = parse(`
section code text at $0000
  table:
  db 1
end
    `);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.message.includes('Raw data'))).toBe(true);
  });

  it('rejects malformed db/dw/ds directives', () => {
    let parsed = parse(`
section data vars at $8000
  bad_db:
  db
end
    `);
    expect(parsed.diagnostics.length).toBeGreaterThan(0);

    parsed = parse(`
section data vars at $8000
  bad_dw:
  dw
end
    `);
    expect(parsed.diagnostics.length).toBeGreaterThan(0);

    parsed = parse(`
section data vars at $8000
  bad_ds:
  ds 1, 2
end
    `);
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  it('allows code labels inside code sections', () => {
    const { diagnostics } = parse(`
section code text at $0000
  loop:
  nop
end
    `);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]?.message).toContain('Unsupported section-contained construct');
  });
});
