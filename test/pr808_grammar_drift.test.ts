import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const grammarPath = resolve('docs/spec/zax-grammar.ebnf.md');
const grammar = readFileSync(grammarPath, 'utf8');

function expectLine(line: string): void {
  expect(grammar).toContain(line);
}

function expectRegex(pattern: RegExp, label: string): void {
  expect(pattern.test(grammar), label).toBe(true);
}

describe('PR808 grammar drift checks', () => {
  it('documents assignment grammar with the active register set', () => {
    expectLine('assign_stmt     = assign_target , ":=" , assign_source ;');
    expectLine('assign_reg      = "A" | "B" | "C" | "D" | "E" | "H" | "L"');
    expectLine('                | "IXH" | "IXL" | "IYH" | "IYL"');
    expectLine('                | "BC" | "DE" | "HL" | "IX" | "IY" ;');
  });

  it('documents move grammar with restricted register/source forms', () => {
    expectLine('move_stmt       = "move" , move_reg , "," , move_src');
    expectLine('                | "move" , move_path , "," , move_reg ;');
    expectLine('move_src        = move_addr | move_path ;');
    expectLine('move_addr       = "@" , ea_expr ;  (* move_addr is only valid as the source operand in v1 *)');
  });

  it('documents raw data directives and raw labels', () => {
    expectLine('raw_label       = identifier , ":" ;');
    expectLine('raw_data_decl   = raw_label , [ newline ] , raw_directive ;');
    expectLine('raw_directive   = "db" , raw_db_list');
    expectLine('                | "dw" , raw_dw_list');
    expectLine('                | "ds" , imm_expr ;');
  });

  it('documents char literals and qualified imm names in immediate expressions', () => {
    expectLine('char_lit        = "\'" , char_body , "\'" ;');
    expectLine('imm_primary     = int_dec | int_hex | char_lit | imm_name | "(" , imm_expr , ")"');
    expectLine('imm_name        = identifier , { "." , identifier } ;');
  });

  it('states @path is move-only in v1', () => {
    expectRegex(/@path\b[^\n]*move rr, @path/i, 'missing move-only @path note');
  });

  it('states raw data directives are section-data-only', () => {
    expectRegex(/Raw data directives .* only valid inside `section data` blocks\./i, 'missing raw data placement note');
  });
});
