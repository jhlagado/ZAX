# Chapter 05 — Data Tables and Indexed Access

This chapter shows how to lay out a byte or word table in memory, and how to
read entries from it using HL as a sequential pointer and IX as a displaced-
access pointer. After reading it you will be able to define a small table,
load its base address into HL or IX, and read elements either sequentially in
a loop or by fixed offset.

Prerequisites: Chapters 00–04 (registers, `ld` modes, labels, DJNZ loops).

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

The standard pattern for reading a table with a DJNZ loop:

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

For word tables, `inc hl` is not enough between entries — each word is two bytes
wide. Use `inc hl / inc hl` to advance by two:

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
function receives the address (loaded into HL or another pair by the caller) and
uses `(hl)` to reach the values. The address is the handle; the values are what
the memory at that address contains.

---

## IX-based displaced access

IX is a 16-bit index register. Unlike HL, IX is not used for arithmetic or as a
general register pair in most instructions. Its specific capability is the
`(ix+d)` addressing mode, where `d` is a signed 8-bit displacement — any value
from -128 to +127.

`ld a, (ix+0)` reads the byte at the address in IX. `ld a, (ix+1)` reads the
byte one position after IX. `ld a, (ix+2)` reads two bytes after IX.

This mode is useful when you want to access several fields at fixed offsets from
a base address, without changing the base pointer between accesses:

```zax
; A three-byte record: offset 0 = id, offset 1 = high byte, offset 2 = low byte
ld ix, record_base   ; IX = base of the record
ld a, (ix+0)         ; A = id field
ld b, (ix+1)         ; B = high byte field
ld c, (ix+2)         ; C = low byte field
; IX is unchanged throughout — all three fields read from one base address
```

With HL you would need to load the address and then increment between fields.
With IX+d you load the base once and name each field by its offset.

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

## The example: `examples/intro/05_data_tables.zax`

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

**Part 1 — sequential HL loop, accumulating a sum.**

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

**Part 2 — sequential HL loop, finding the maximum.**

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
compares A with C using `cp c`. The rule from Chapter 03: after `cp c`, carry is
set if A is less than C. `jr nc` skips the update when A is already greater than
or equal to C. `ld a, c` runs only when a new maximum is found. After six
entries, `max_score` holds 60 (`$3C`).

**Part 3 — IX+d access on a packed record table.**

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

## What This Chapter Teaches

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

## What Comes Next

Chapter 06 introduces `call` and `ret`, explains how the hardware stack works,
and shows how to write reusable subroutines that receive values in registers and
return results to the caller.
