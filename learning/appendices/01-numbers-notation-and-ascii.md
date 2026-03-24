# Appendix 1 — Numbers, Notation, and ASCII

This appendix collects the number and character tables you reach for often in
Z80 work.

---

## Number Prefixes Used In This Course

| Form | Meaning | Example |
|------|---------|---------|
| `42` | decimal | `42` |
| `$2A` | hexadecimal | `$2A` |
| `%00101010` | binary | `%00101010` |
| `0b00101010` | binary (alternate form accepted by ZAX) | `0b00101010` |

---

## Hex Digit Table

| Hex | Binary | Decimal |
|:---:|:------:|---:|
| `0` | `0000` | 0 |
| `1` | `0001` | 1 |
| `2` | `0010` | 2 |
| `3` | `0011` | 3 |
| `4` | `0100` | 4 |
| `5` | `0101` | 5 |
| `6` | `0110` | 6 |
| `7` | `0111` | 7 |
| `8` | `1000` | 8 |
| `9` | `1001` | 9 |
| `A` | `1010` | 10 |
| `B` | `1011` | 11 |
| `C` | `1100` | 12 |
| `D` | `1101` | 13 |
| `E` | `1110` | 14 |
| `F` | `1111` | 15 |

---

## Common Hex Landmarks

| Value | Decimal | Why it matters |
|------:|--------:|----------------|
| `$00` | 0 | zero byte |
| `$0F` | 15 | low nibble all set |
| `$10` | 16 | one hex digit boundary |
| `$1F` | 31 | 5-bit max unsigned |
| `$20` | 32 | ASCII space |
| `$7F` | 127 | 7-bit signed max / ASCII top |
| `$80` | 128 | sign bit set |
| `$FF` | 255 | byte all set / `-1` in two's complement |
| `$0100` | 256 | common code base in this course |
| `$7FFF` | 32767 | signed 16-bit positive max |
| `$8000` | 32768 | high bit set in a word / common RAM base in examples |
| `$FFFF` | 65535 | word all set / `-1` as 16-bit two's complement |

---

## 7-bit ASCII (0–127)

| Dec | Hex | Character | Meaning |
|---:|:---:|:---:|---|
| 0 | $00 | NUL | control code |
| 1 | $01 | SOH | control code |
| 2 | $02 | STX | control code |
| 3 | $03 | ETX | control code |
| 4 | $04 | EOT | control code |
| 5 | $05 | ENQ | control code |
| 6 | $06 | ACK | control code |
| 7 | $07 | BEL | control code |
| 8 | $08 | BS | control code |
| 9 | $09 | TAB | control code |
| 10 | $0A | LF | control code |
| 11 | $0B | VT | control code |
| 12 | $0C | FF | control code |
| 13 | $0D | CR | control code |
| 14 | $0E | SO | control code |
| 15 | $0F | SI | control code |
| 16 | $10 | DLE | control code |
| 17 | $11 | DC1 | control code |
| 18 | $12 | DC2 | control code |
| 19 | $13 | DC3 | control code |
| 20 | $14 | DC4 | control code |
| 21 | $15 | NAK | control code |
| 22 | $16 | SYN | control code |
| 23 | $17 | ETB | control code |
| 24 | $18 | CAN | control code |
| 25 | $19 | EM | control code |
| 26 | $1A | SUB | control code |
| 27 | $1B | ESC | control code |
| 28 | $1C | FS | control code |
| 29 | $1D | GS | control code |
| 30 | $1E | RS | control code |
| 31 | $1F | US | control code |
| 32 | $20 | `space` | printable |
| 33 | $21 | `!` | printable |
| 34 | $22 | `"` | printable |
| 35 | $23 | `#` | printable |
| 36 | $24 | `$` | printable |
| 37 | $25 | `%` | printable |
| 38 | $26 | `&` | printable |
| 39 | $27 | `'` | printable |
| 40 | $28 | `(` | printable |
| 41 | $29 | `)` | printable |
| 42 | $2A | `*` | printable |
| 43 | $2B | `+` | printable |
| 44 | $2C | `,` | printable |
| 45 | $2D | `-` | printable |
| 46 | $2E | `.` | printable |
| 47 | $2F | `/` | printable |
| 48 | $30 | `0` | printable |
| 49 | $31 | `1` | printable |
| 50 | $32 | `2` | printable |
| 51 | $33 | `3` | printable |
| 52 | $34 | `4` | printable |
| 53 | $35 | `5` | printable |
| 54 | $36 | `6` | printable |
| 55 | $37 | `7` | printable |
| 56 | $38 | `8` | printable |
| 57 | $39 | `9` | printable |
| 58 | $3A | `:` | printable |
| 59 | $3B | `;` | printable |
| 60 | $3C | `<` | printable |
| 61 | $3D | `=` | printable |
| 62 | $3E | `>` | printable |
| 63 | $3F | `?` | printable |
| 64 | $40 | `@` | printable |
| 65 | $41 | `A` | printable |
| 66 | $42 | `B` | printable |
| 67 | $43 | `C` | printable |
| 68 | $44 | `D` | printable |
| 69 | $45 | `E` | printable |
| 70 | $46 | `F` | printable |
| 71 | $47 | `G` | printable |
| 72 | $48 | `H` | printable |
| 73 | $49 | `I` | printable |
| 74 | $4A | `J` | printable |
| 75 | $4B | `K` | printable |
| 76 | $4C | `L` | printable |
| 77 | $4D | `M` | printable |
| 78 | $4E | `N` | printable |
| 79 | $4F | `O` | printable |
| 80 | $50 | `P` | printable |
| 81 | $51 | `Q` | printable |
| 82 | $52 | `R` | printable |
| 83 | $53 | `S` | printable |
| 84 | $54 | `T` | printable |
| 85 | $55 | `U` | printable |
| 86 | $56 | `V` | printable |
| 87 | $57 | `W` | printable |
| 88 | $58 | `X` | printable |
| 89 | $59 | `Y` | printable |
| 90 | $5A | `Z` | printable |
| 91 | $5B | `[` | printable |
| 92 | $5C | `\\` | printable |
| 93 | $5D | `]` | printable |
| 94 | $5E | `^` | printable |
| 95 | $5F | `_` | printable |
| 96 | $60 | `` ` `` | printable |
| 97 | $61 | `a` | printable |
| 98 | $62 | `b` | printable |
| 99 | $63 | `c` | printable |
| 100 | $64 | `d` | printable |
| 101 | $65 | `e` | printable |
| 102 | $66 | `f` | printable |
| 103 | $67 | `g` | printable |
| 104 | $68 | `h` | printable |
| 105 | $69 | `i` | printable |
| 106 | $6A | `j` | printable |
| 107 | $6B | `k` | printable |
| 108 | $6C | `l` | printable |
| 109 | $6D | `m` | printable |
| 110 | $6E | `n` | printable |
| 111 | $6F | `o` | printable |
| 112 | $70 | `p` | printable |
| 113 | $71 | `q` | printable |
| 114 | $72 | `r` | printable |
| 115 | $73 | `s` | printable |
| 116 | $74 | `t` | printable |
| 117 | $75 | `u` | printable |
| 118 | $76 | `v` | printable |
| 119 | $77 | `w` | printable |
| 120 | $78 | `x` | printable |
| 121 | $79 | `y` | printable |
| 122 | $7A | `z` | printable |
| 123 | $7B | `{` | printable |
| 124 | $7C | `\|` | printable |
| 125 | $7D | `}` | printable |
| 126 | $7E | `~` | printable |
| 127 | $7F | DEL | control code |
