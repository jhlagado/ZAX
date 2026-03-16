# ZAX Grammar (EBNF Companion)

This file provides a single syntax-oriented grammar reference for ZAX.

Authority note:

- `docs/spec/zax-spec.md` remains the sole normative language authority.
- If this grammar and the spec ever diverge, `docs/spec/zax-spec.md` wins.

## 1. Lexical

```ebnf
identifier      = letter , { letter | digit | "_" } ;
letter          = "A".."Z" | "a".."z" | "_" ;
digit           = "0".."9" ;

int_dec         = [ "-" ] , digit , { digit } ;
int_hex         = "$" , hex_digit , { hex_digit } ;
hex_digit       = digit | "A".."F" | "a".."f" ;

string_lit      = '"' , { any_char_except_quote } , '"' ;
char_lit        = "'" , char_body , "'" ;
char_body       = any_char_except_quote | escape_seq ;
escape_seq      = "\\" , ( "n" | "r" | "t" | "'" | "\\" | "x" , hex_digit , hex_digit ) ;
newline         = "\n" ;
```

## 2. Module Structure

```ebnf
module          = { module_item } ;

module_item     = import_decl
                | named_section_decl
                | align_decl
                | const_decl
                | enum_decl
                | type_decl
                | union_decl
                | bin_decl
                | hex_decl
                | extern_block
                | func_decl
                | op_decl ;

import_decl     = "import" , ( identifier | string_lit ) ;
named_section_decl = "section" , section_kind , identifier ,
                     [ "at" , imm_expr , [ ( "size" , imm_expr ) | ( "end" , imm_expr ) ] ] ,
                     newline , { section_item } , "end" ;
section_item    = const_decl
                | enum_decl
                | type_decl
                | union_decl
                | data_section_block
                | data_decl
                | raw_data_decl
                | bin_decl
                | hex_decl
                | extern_block
                | func_decl
                | op_decl ;
section_kind    = "code" | "data" ;
align_decl      = "align" , imm_expr ;
```

## 3. Types and Declarations

```ebnf
const_decl      = [ "export" ] , "const" , identifier , "=" , imm_expr ;

enum_decl       = [ "export" ] , "enum" , identifier , enum_member , { "," , enum_member } ;
enum_member     = identifier ;

type_decl       = [ "export" ] , "type" , identifier , type_body ;
union_decl      = [ "export" ] , "union" , identifier , field_block ;

type_body       = type_expr
                | field_block ;

field_block     = newline , field_decl , { newline , field_decl } , newline , "end" ;
field_decl      = identifier , ":" , type_expr ;

type_expr       = scalar_type
                | type_name
                | type_expr , "[" , [ imm_expr ] , "]" ;

type_name       = identifier , { "." , identifier } ;

scalar_type     = "byte" | "word" | "addr" | "ptr" ;
```

## 4. Storage Declarations

```ebnf
data_section_block = "data" , newline , data_decl , { newline , data_decl } ;
data_decl          = identifier , ":" , type_expr , [ "=" , data_init_expr ] ;

raw_label       = identifier , ":" ;
raw_data_decl   = raw_label , [ newline ] , raw_directive ;
raw_directive   = "db" , raw_db_list
                | "dw" , raw_dw_list
                | "ds" , imm_expr ;
raw_db_list     = raw_db_item , { "," , raw_db_item } ;
raw_db_item     = imm_expr | string_lit ;
raw_dw_list     = imm_expr , { "," , imm_expr } ;

bin_decl        = "bin" , identifier , "in" , section_kind , "from" , string_lit ;
hex_decl        = "hex" , identifier , "from" , string_lit ;
```

## 5. Functions and Ops

```ebnf
func_decl       = [ "export" ] , "func" , identifier , "(" , [ param_list ] , ")" ,
                  [ ":" , ret_regs ] , newline , [ local_var_block ] , instr_stream , "end" ;

ret_regs        = reg_ret_item , { "," , reg_ret_item } ;
reg_ret_item    = "HL" | "DE" | "BC" | "AF" ;
param_list      = param , { "," , param } ;
param           = identifier , ":" , type_expr ;

local_var_block = "var" , newline , local_decl , { newline , local_decl } , newline , "end" ;

local_decl      = identifier , ":" , type_expr                              (* local scalar decl *)
                | identifier , ":" , type_expr , "=" , value_init_expr      (* local scalar value-init *)
                | identifier , "=" , rhs_alias_expr ;                        (* local alias-init *)

op_decl         = "op" , identifier , [ "(" , [ op_param_list ] , ")" ] ,
                  newline , instr_stream , "end" ;

op_param_list   = op_param , { "," , op_param } ;
op_param        = identifier , ":" , matcher_type ;

matcher_type    = "reg8" | "reg16"
                | "A" | "HL" | "DE" | "BC" | "SP"
                | "imm8" | "imm16"
                | "ea" | "mem8" | "mem16"
                | "idx16" | "cc" ;
```

## 6. Instruction Stream and Structured Control

```ebnf
instr_stream    = { instr_line } ;

instr_line      = z80_instruction
                | assign_stmt
                | move_stmt
                | op_invoke
                | func_call
                | if_stmt
                | while_stmt
                | repeat_stmt
                | select_stmt
                | asm_label
                | local_jump ;

assign_stmt     = assign_target , ":=" , assign_source ;
assign_target   = assign_reg | ea_expr ;
assign_source   = assign_reg | ea_expr | assign_addr | imm_expr ;
assign_reg      = "A" | "B" | "C" | "D" | "E" | "H" | "L"
                | "IXH" | "IXL" | "IYH" | "IYL"
                | "BC" | "DE" | "HL" | "IX" | "IY" ;
assign_addr     = "@" , ea_expr ;  (* assign_addr is only valid as the source operand in v1 *)

if_stmt         = "if" , cc_expr , newline , instr_stream ,
                  [ "else" , newline , instr_stream ] , "end" ;

while_stmt      = "while" , cc_expr , newline , instr_stream , "end" ;

repeat_stmt     = "repeat" , newline , instr_stream , "until" , cc_expr ;

select_stmt     = "select" , select_expr , newline ,
                  case_clause , { case_clause } , [ else_clause ] , "end" ;

case_clause     = "case" , case_item , { "," , case_item } , newline , instr_stream ;
case_item       = imm_expr | imm_expr , ".." , imm_expr ;
else_clause     = "else" , newline , instr_stream ;

asm_label       = [ "." ] , identifier , ":" ;
local_jump      = ( "jp" | "jr" | "djnz" ) , "." , identifier ;
```

## 7. Expressions

```ebnf
imm_expr        = imm_or ;
imm_or          = imm_xor , { "|" , imm_xor } ;
imm_xor         = imm_and , { "^" , imm_and } ;
imm_and         = imm_shift , { "&" , imm_shift } ;
imm_shift       = imm_add , { ( "<<" | ">>" ) , imm_add } ;
imm_add         = imm_mul , { ( "+" | "-" ) , imm_mul } ;
imm_mul         = imm_unary , { ( "*" | "/" | "%" ) , imm_unary } ;
imm_unary       = [ "-" | "+" | "~" ] , imm_primary ;
imm_primary     = int_dec | int_hex | char_lit | imm_name | "(" , imm_expr , ")"
                | "sizeof" , "(" , type_expr , ")"
                | "offsetof" , "(" , type_expr , "," , field_path , ")" ;

imm_name        = identifier , { "." , identifier } ;

field_path      = identifier , { "." , identifier | "[" , imm_expr , "]" } ;

ea_expr         = ea_term , { ( "+" | "-" ) , imm_expr } ;
ea_term         = ea_base , { ea_segment }
                | typed_reinterpret_expr ;
ea_base         = identifier | "(" , ea_expr , ")" ;
ea_segment      = "." , identifier | "[" , ea_index , "]" ;
typed_reinterpret_expr = "<" , type_expr , ">" , reinterpret_base , ea_segment , { ea_segment } ;
reinterpret_base = reinterpret_reg
                 | reinterpret_name
                 | "(" , reinterpret_addr_expr , ")" ;
reinterpret_addr_expr = reinterpret_atom , ( "+" | "-" ) , imm_expr ;
reinterpret_atom = reinterpret_reg | reinterpret_name ;
reinterpret_reg  = "HL" | "DE" | "BC" | "IX" | "IY" ;
reinterpret_name = identifier ;
ea_index        = imm_expr | reg8 | reg16 | "(" , reg16 , ")" ;

value_init_expr = imm_expr | "0" ;
rhs_alias_expr  = ea_expr ;
data_init_expr  = string_lit | aggregate_init | imm_expr ;
aggregate_init  = "{" , [ init_item , { "," , init_item } ] , "}" ;
init_item       = imm_expr | aggregate_init ;

reg8            = "A" | "B" | "C" | "D" | "E" | "H" | "L"
                | "IXH" | "IXL" | "IYH" | "IYL" ;
reg16           = "HL" | "DE" | "BC" | "SP" | "IX" | "IY" ;
```

## 8. Known Current Constraints (Semantic)

These are semantic constraints enforced beyond pure grammar:

- Typed alias form is invalid in function-local `var`:
  - `name: Type = rhsAlias`
- `import` remains module-scope only. It is not valid inside a named section.
- Variable declarations inside a `code` named section are a compile error.
- Local non-scalar value-init declarations are invalid.
- Local non-scalar declarations are alias-only (`name = rhs`).
- `@path` is not a general expression operator. In v1 it is accepted only on the source side of `rr := @path`.
- Raw data directives (`db`/`dw`/`ds`) and `raw_label` are only valid inside `section data` blocks.
- A `raw_label` must be followed by a raw directive; it cannot stand alone.
- Typed reinterpretation requires at least one tail segment after the cast head.
- `reinterpret_name` is limited semantically to scalar names of type `word` or `addr`.
- Bare aggregate storage names are not valid reinterpret bases.

## 9. Maintenance Rule

When parser grammar changes land:

1. Update this file in the same PR.
2. Update `docs/spec/zax-spec.md` if behavior changed.
3. Include at least one positive and one negative parser/semantic test for the changed production.
