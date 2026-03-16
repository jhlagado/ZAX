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
    expectLine('assign_source   = assign_reg | ea_expr | assign_addr | imm_expr ;');
    expectLine('assign_reg      = "A" | "B" | "C" | "D" | "E" | "H" | "L"');
    expectLine('                | "IXH" | "IXL" | "IYH" | "IYL"');
    expectLine('                | "BC" | "DE" | "HL" | "IX" | "IY" ;');
    expectLine('assign_addr     = "@" , ea_expr ;  (* assign_addr is only valid as the source operand in v1 *)');
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

  it('states @path is assignment-only in v1', () => {
    expectRegex(/@path\b[^\n]*rr := @path/i, 'missing assignment-only @path note');
  });

  it('states raw data directives are section-data-only', () => {
    expectRegex(/Raw data directives .* only valid inside `section data` blocks\./i, 'missing raw data placement note');
  });
});
