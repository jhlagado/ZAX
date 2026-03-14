import { describe, expect, it } from 'vitest';

import { parseProgram } from '../src/frontend/parser.js';

const parse = (text: string) => {
  const diagnostics: Array<{ message: string }> = [];
  const program = parseProgram('pr798_addr_expr.zax', text, diagnostics as any);
  return { program, diagnostics };
};

describe('PR798 address-of storage path parser', () => {
  it('accepts move rr, @path forms', () => {
    const { diagnostics, program } = parse(`
section code text at $0000
export func main()
  move hl, @x
  move de, @array[i]
  move bc, @record.field
  move hl, @<Sprite>ix.flags
  ret
end
end
    `);
    expect(diagnostics).toEqual([]);

    const section = program.files[0]?.items.find((i: any) => i.kind === 'NamedSection');
    expect(section).toBeDefined();
  });

  it('rejects destination-side @path', () => {
    const { diagnostics } = parse(`
section code text at $0000
export func main()
  move @x, hl
  ret
end
end
    `);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]?.message).toContain('source side');
  });

  it('rejects nested or parenthesized @ forms', () => {
    const { diagnostics } = parse(`
section code text at $0000
export func main()
  move hl, @@x
  move hl, @(@x)
  move hl, @(array[i])
  move hl, array[@i]
  ret
end
end
    `);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.message.includes('address-of'))).toBe(true);
  });

  it('rejects ld with @path', () => {
    const { diagnostics } = parse(`
section code text at $0000
export func main()
  ld hl, @x
  ret
end
end
    `);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it('still accepts move rr, path', () => {
    const { diagnostics } = parse(`
section code text at $0000
export func main()
  move hl, x
  ret
end
end
    `);
    expect(diagnostics).toEqual([]);
  });
});
