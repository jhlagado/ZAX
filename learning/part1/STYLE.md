# ZAX Course Style Guide — Part 1

## Code listings

- All opcodes lowercase: `ld`, `cp`, `jr`, `djnz`, not `LD`, `CP`, `JR`, `DJNZ`
- All condition codes lowercase: `z`, `nz`, `c`, `nc`, `m`, `p`, `pe`, `po`
- All register names lowercase in listings: `a`, `b`, `hl`, `de`, `ix`, `sp`
- Hex literals in `$FF` form throughout — not `0xFF` or `0ffh`
- ZAX keywords lowercase: `func`, `op`, `section`, `var`, `local`, `end`, `if`, `while`, `select`, `case`, `break`, `continue`
- Built-in scalar types lowercase: `byte`, `word`, `addr` — the type names used in `var` and parameter declarations
- User-defined record types PascalCase: `Point`, `Header`, etc.
- Typed pointer form `@TypeName` for any pointer with a known element type — use `left: @TreeNode`, `var cur: @ListNode`, `func f(node: @TreeNode)` in preference to `left: addr` followed by `<TreeNode>` casts at each access site
- Label names: lowercase with underscores — `find_max_loop`, not `FindMaxLoop` or `FIND_MAX_LOOP`
- Constants: uppercase with underscores — `TABLE_LEN`, `MAX_VAL`

## Prose references

- Register names in prose: uppercase — "register A", "the HL register", "IX points to"
- Opcodes in prose: backtick-quoted, lowercase — `` `ld` ``, `` `djnz` ``, `` `cp` ``
- ZAX keywords in prose: backtick-quoted — `` `:=` ``, `` `func` ``, `` `while` ``
- Hex values in prose: `$FF` form — "the value `$80`", not "0x80"
