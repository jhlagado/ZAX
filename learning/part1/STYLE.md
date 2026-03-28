# ZAX Course Style Guide — Part 1

## Code listings

- All opcodes lowercase: `ld`, `cp`, `jr`, `djnz`, not `LD`, `CP`, `JR`, `DJNZ`
- All condition codes lowercase: `z`, `nz`, `c`, `nc`, `m`, `p`, `pe`, `po`
- All register names lowercase in listings: `a`, `b`, `hl`, `de`, `ix`, `sp`
- Hex literals in `$FF` form throughout — not `0xFF` or `0ffh`
- ZAX keywords lowercase: `func`, `op`, `section`, `var`, `local`, `end`, `if`, `while`, `select`, `case`, `break`, `continue`
- ZAX type names PascalCase: `Word`, `Byte`, etc. (the compiler treats them as types, not keywords)
- Label names: lowercase with underscores — `find_max_loop`, not `FindMaxLoop` or `FIND_MAX_LOOP`
- Constants: uppercase with underscores — `TABLE_LEN`, `MAX_VAL`

## Prose references

- Register names in prose: uppercase — "register A", "the HL register", "IX points to"
- Opcodes in prose: backtick-quoted, lowercase — `` `ld` ``, `` `djnz` ``, `` `cp` ``
- ZAX keywords in prose: backtick-quoted — `` `:=` ``, `` `func` ``, `` `while` ``
- Hex values in prose: `$FF` form — "the value `$80`", not "0x80"
