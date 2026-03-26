import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const grammarPath = resolve('docs/spec/zax-grammar.ebnf.md');
const GENERATED_START_MARKER = '<!-- BEGIN GENERATED: grammar-atoms -->';
const GENERATED_END_MARKER = '<!-- END GENERATED: grammar-atoms -->';

function readGrammar(): string {
  return readFileSync(grammarPath, 'utf8');
}

describe('PR808 grammar drift checks', () => {
  it('keeps the generated grammar atom block up to date', () => {
    const stdout = execFileSync('node', ['scripts/generate-grammar-atoms.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const grammar = readGrammar();

    expect(stdout).toContain('Grammar atoms already up to date');
    expect(grammar).toContain(GENERATED_START_MARKER);
    expect(grammar).toContain(GENERATED_END_MARKER);
  });

  it('documents the expected parser atom productions from grammarData.ts', () => {
    const grammar = readGrammar();

    expect(grammar).toContain('top_level_keyword');
    expect(grammar).toContain('asm_control_keyword');
    expect(grammar).toContain('condition_code');
    expect(grammar).toContain('return_reg');
    expect(grammar).toContain('assignment_reg');
    expect(grammar).toContain('move_reg_atom');
    expect(grammar).toContain('typed_reinterpret_base_reg');
    expect(grammar).toContain('matcher_type_symbolic');
    expect(grammar).toContain('imm_unary_op');
    expect(grammar).toContain('escape_simple');
  });

  it('keeps spec authority and parser-authority notes explicit', () => {
    const grammar = readGrammar();

    expect(grammar).toContain('`docs/spec/zax-spec.md` wins');
    expect(grammar).toContain('It documents parser-level atom syntax only; semantic restrictions still live');
    expect(grammar).toContain('Parser recovery behavior remains implementation-defined by the hand-written parser.');
  });

  it('keeps the semantic raw-data placement note in the hand-written section', () => {
    const grammar = readGrammar();

    expect(grammar).toMatch(/Raw data directives .* only valid inside `section data` blocks\./i);
  });
});
