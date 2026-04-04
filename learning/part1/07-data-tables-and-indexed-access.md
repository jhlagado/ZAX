[← Counting Loops and DJNZ](06-counting-loops-and-djnz.md) | [Part 1](README.md) | [Stack and Subroutines →](08-stack-and-subroutines.md)

# Chapter 7 — Data Tables and Indexed Access

Once your data lives in a table, you need two things: a way to process every
entry in order, and a way to reach one specific entry directly. HL handles the
first — load the base, read, advance, repeat. IX handles the second — load the
base once and name any entry by its offset from there.

---

## Declaring a byte table in a data section

A data section in ZAX can hold an array of bytes. The syntax is:

```zax
section data rom at $8000
  scores: byte[6] = { 10, 20, 30, 40, 50, 60 }
end
```

This declares six bytes of initialized storage starting at address `$8000`.
The assembler lays them out in memory in the order listed: `$8000` holds 10,
`$8001` holds 20, `$8002` holds 30, and so on.

The name `scores` refers to the address of the first byte in the array — the
address `$8000`. It is not the value 10. This is the difference between a table
address and a table value: `scores` is the address where the table begins;
`(scores)` is the first byte stored there.

Word tables work the same way, with two bytes per entry in little-endian order:

```zax
section data rom at $8010
  widths: word[4] = { 100, 200, 300, 400 }
end
```

`$8010` and `$8011` together hold 100 (low byte `$64` at `$8010`, high byte
`$00` at `$8011`). Each subsequent word occupies the next two bytes.

---

## HL-based sequential access

HL holds an address. `ld a, (hl)` reads the byte at that address. `inc hl`
advances HL to the next byte. Repeating those two operations steps through a
byte table one entry at a time.

A DJNZ loop over a byte table looks like this:

```zax
ld hl, scores      ; HL = address of first entry
ld b, 6            ; B = number of entries
loop_top:
  ld a, (hl)       ; A = current entry
  ; ... process A ...
  inc hl           ; advance to next entry
  djnz loop_top    ; repeat for all entries
```

After the loop, HL points one byte past the last entry. The order matters: read
the entry first (`ld a, (hl)`), process it, then advance (`inc hl`). If you
advance before reading, you skip the first entry.

Word entries are two bytes wide, so advance HL by two between them:

```zax
ld hl, widths
ld b, 4
word_loop:
  ld e, (hl)       ; low byte of current word
  inc hl
  ld d, (hl)       ; high byte of current word
  inc hl           ; now HL points to next word
  ; DE holds current word value
  djnz word_loop
```

---

## The address vs value distinction

`ld hl, scores` loads the address of the table into HL. HL now holds `$8000`,
the memory location where the table begins. HL does not hold 10 (the first
element's value).

`ld a, (hl)` reads the byte at the address in HL. Only this instruction
produces the value stored in the table.

This distinction matters most when a function receives a table to process. The
function receives the address — loaded into HL or another pair by the caller —
and uses `(hl)` to reach the values.

---

## Labels, variables, and code share the same memory

Assembly makes no distinction between a label that names a variable and one
that marks a point in code. Both are memory addresses — plain 16-bit numbers. `scores` is the address where the
table starts. `loop_top` is the address where the loop body starts. To the CPU,
both are just numbers. You could load data from a code address, and you could
jump to a data address. The CPU would blindly obey, attempting to execute your
data bytes as instructions (almost certainly crashing) or overwriting your
instructions with data values.

This is one reason why testing on an emulator before running on hardware is
sensible practice. A stray pointer that writes into the code region can corrupt
instructions in ways that are difficult to diagnose. The Z80 has no hardware
separation between code and data — everything is bytes in the same 64K address
space, and it is your job to keep them organised.

---

## IX-based displaced access

With HL you would increment between each read. With IX you load the base once
and name each field by its offset.

IX is a 16-bit index register. Its specific capability is the `(ix+d)`
addressing mode: `d` is a signed byte offset, any value from -128 to +127, and
`ld a, (ix+d)` reads the byte at address IX + d without touching IX itself.

Load IX to the base of a record once, and you can name every field by its
offset — no incrementing between reads:

```zax
; A three-byte record: offset 0 = id, offset 1 = high byte, offset 2 = low byte
ld ix, record_base   ; IX = base of the record
ld a, (ix+0)         ; A = id field
ld b, (ix+1)         ; B = high byte field
ld c, (ix+2)         ; C = low byte field
; IX is unchanged throughout — all three fields read from one base address
```

The displacement `d` is a byte-sized signed offset. Offsets larger than 127 or
smaller than -128 are not encodable and will cause an assembler error.

---

## Accessing a specific table entry by index

To reach entry `n` in a byte table, you need the address `table_base + n`. For
small, known-at-compile-time indices, you can write the offset directly:

```zax
ld ix, scores        ; IX = base of scores table
ld a, (ix+0)         ; entry 0: value 10
ld a, (ix+3)         ; entry 3: value 40
```

For a runtime index, the general approach is to add the index to HL:

```zax
ld hl, scores        ; HL = base
ld de, 3             ; DE = index (entry 3)
add hl, de           ; HL = scores + 3
ld a, (hl)           ; A = entry 3 = 40
```

`add hl, de` adds the 16-bit value in DE to HL. After the add, `(hl)` points
to entry 3. This form does not check bounds; if the index exceeds the table
length, the read will access whatever bytes follow the table in memory.

---

## The example: `learning/part1/examples/05_data_tables.zax`

```zax
const TableLen  = 6
const RecSize   = 3

section data rom at $8000
  scores: byte[6] = { 10, 20, 30, 40, 50, 60 }
  records: byte[9] = { $01, $01, $A0,
                        $02, $02, $B0,
                        $03, $03, $C0 }
end

section data vars at $8020
  sum:       byte = 0
  max_score: byte = 0
  rec1_id:   byte = 0
  rec1_lo:   byte = 0
end
```

**Section A — sequential HL loop, accumulating a sum.**

```zax
ld hl, scores
ld b, TableLen
ld a, 0
hl_loop:
  add a, (hl)
  inc hl
  djnz hl_loop
ld (sum), a
```

HL walks the six score bytes. Each `add a, (hl)` adds the current byte to A.
After six iterations, A = 10 + 20 + 30 + 40 + 50 + 60 = 210 (`$D2`), which is
stored in `sum`.

**Section B — sequential HL loop, finding the maximum.**

```zax
ld hl, scores
ld b, TableLen
ld a, 0
max_loop:
  ld c, (hl)
  cp c
  jr nc, no_new_max
  ld a, c
no_new_max:
  inc hl
  djnz max_loop
ld (max_score), a
```

A holds the running maximum. Each iteration loads the current byte into C and
compares A with C using `cp c`. Apply the flag-before-branch check: `cp c` is
the instruction that sets the flag; `jr nc` reads it immediately after with
nothing in between; carry being clear means A ≥ C, so `jr nc` skips the update
and the running maximum is unchanged. `ld a, c` runs only when `cp c` found A
less than C — a new maximum. After six entries, `max_score` holds 60 (`$3C`).

**Section C — IX+d access on a packed record table.**

```zax
ld ix, records + RecSize    ; IX = base of record 1
ld a, (ix+0)                ; A = id field
ld (rec1_id), a
ld a, (ix+2)                ; A = lo field
ld (rec1_lo), a
```

`records + RecSize` is a compile-time address arithmetic expression: the
assembler computes `address_of_records + 3` before emitting any code. IX is
loaded with that address in a single `ld ix, imm16` instruction.

Once IX holds the base of record 1, `(ix+0)` is the id field and `(ix+2)` is
the lo field. No `inc` instructions appear between reads: the displacement
encodes the offset directly. `rec1_id` receives `$02` (the id byte of record 1)
and `rec1_lo` receives `$B0`.

---

## Block operations: LDIR and friends

The Z80 has hardware instructions for copying or scanning ranges of memory. The
most useful is `ldir`.

`ldir` copies BC bytes from the address in HL to the address in DE. After each
byte is copied, HL and DE are both incremented and BC is decremented. The
instruction repeats until BC reaches zero. One `ldir` replaces an entire copy
loop.

Compare the two forms for copying 4 bytes:

```zax
; Without ldir: a manual copy loop
ld hl, source     ; HL = source address
ld de, dest       ; DE = destination address
ld b, 4           ; B = byte count
copy_loop:
  ld a, (hl)      ; A = byte from source
  ld (de), a      ; write to destination
  inc hl
  inc de
  djnz copy_loop

; With ldir: one instruction
ld hl, source     ; HL = source address
ld de, dest       ; DE = destination address
ld bc, 4          ; BC = byte count (note: BC, not just B)
ldir              ; copy 4 bytes, HL and DE advance, BC reaches 0
```

Both forms copy 4 bytes from `source` to `dest`. After `ldir`, HL points one
byte past the last source byte, DE points one byte past the last destination
byte, and BC holds zero.

`ldir` uses BC as a 16-bit counter, so it can copy up to 65535 bytes in one
instruction. The loop form above used B (8-bit), which would need a different
structure for counts larger than 255.

Three related instructions exist. `lddr` copies in the decrementing direction —
HL and DE are decremented after each byte rather than incremented. This is
useful when source and destination overlap and copying forward would overwrite
source bytes before they are read.

`cpir` scans memory for a byte value. It reads bytes from (HL), compares each
to A, and stops when it finds a match or exhausts BC bytes. After `cpir`, Z is
set if a match was found, and HL points one past the matching byte. `cpdr` is
the same scan in the decrementing direction.

`ldir`, `lddr`, `cpir`, and `cpdr` are raw Z80 mnemonics used directly in ZAX,
exactly like `djnz` — the assembler emits them as-is.

When both HL and DE are live pointers — as they are during any `ldir` sequence — you sometimes need to exchange them. After a copy, the destination you wrote may become the source for the next pass, or you need to hand that address to a routine that expects it in HL. Without a swap instruction, exchanging the two pairs takes six instructions and clobbers A. `ex de, hl` does it in one: afterward, DE holds what HL had and HL holds what DE had, and nothing else changes.

```zax
ld hl, source
ld de, dest
ld bc, 64
ldir              ; copy 64 bytes; HL and DE now point past the copied region
ex de, hl         ; HL now points past dest; DE points past source
```

`ldir` and `ex de, hl` are tools for when you need to move data in bulk. For element-by-element work on a single table, the DJNZ-over-HL pattern from the first section is usually clearer.

---

## Summary

- A `byte[n]` or `word[n]` declaration in a `section data` block lays out n
  bytes or words of initialized storage at the section's base address.
- The table name refers to the address of the first element, not to its value.
  Use `(hl)` or `(ix+d)` to read the values stored there.
- `ld a, (hl)` reads the byte at the current address; `inc hl` advances to the
  next byte. Together they step through a table entry by entry.
- For word tables, advance HL by two between entries.
- IX+d addressed access (`ld a, (ix+d)`) reads a byte at a fixed byte offset
  from the base in IX. The displacement must fit in a signed byte (-128 to 127).
- IX+d is useful for record-like access: load IX to the record base once, then
  name each field by its offset without moving IX.
- To reach entry `n` at runtime, either load `table_base + n` into IX using
  compile-time arithmetic, or add the index to HL with `add hl, de`.
- When you need to emit raw bytes without a named type — byte tables from
  existing data, word address vectors, or space reservations — use the raw data
  directives `db`, `dw`, and `ds` inside a `section data` or `section code`
  block. These directives are fully specified in the language spec (Section 6.6).

---

## Exercises

**1. Post-loop pointer value.** The HL sum loop in the chapter starts with `ld hl, scores` where `scores` is at address `$8000` and contains six entries. After the loop completes all six iterations, what address does HL hold? What byte would `ld a, (hl)` read at that point? Is that byte part of `scores`?

**2. Address versus value.** Explain the difference in effect between these two instructions:

```zax
ld hl, scores      ; (a)
ld a, (scores)     ; (b)
```

Which instruction loads the number 10 (the first element of the table) into a register? Which loads the memory address where 10 is stored?

**3. IX record access.** You have three three-byte records packed in memory, each with the layout: `id` at offset 0, `hi` at offset 1, `lo` at offset 2. The table starts at address `$8010`. Write the IX loads to read all three fields of the **third** record (index 2) into registers A, B, and C respectively. Start by computing the address you need to load into IX.

**4. Find the bug.** The following loop is meant to find the maximum score in the `scores` table, but it has a subtle error. Identify what goes wrong and explain what value `max_score` will hold at the end:

```zax
ld hl, scores
ld b, TableLen
ld a, 0
max_loop:
  cp (hl)
  jr nc, no_new_max
  ld a, (hl)
no_new_max:
  djnz max_loop
ld (max_score), a
```

*(Hint: `inc hl` is missing somewhere. Where? And what does HL read on every iteration as a result?)*

---

[← Counting Loops and DJNZ](06-counting-loops-and-djnz.md) | [Part 1](README.md) | [Stack and Subroutines →](08-stack-and-subroutines.md)
