[← Flags, Comparisons, Jumps](04-flags-comparisons-jumps.md) | [Part 1](README.md) | [Data Tables and Indexed Access →](06-data-tables-and-indexed-access.md)

# Chapter 5 — Counting Loops and DJNZ

The `dec b / jp nz` loop from Chapter 4 uses two instructions to do one
conceptual thing: decrement-the-counter-and-loop-if-not-done. The Z80 has a
single instruction that fuses them.

This chapter introduces `djnz` and the three loop forms that cover most of what
you will write: counted, sentinel, and flag-exit.

---

## Chapter 4 left a two-instruction pattern

Chapter 4 ended with this loop shape:

```zax
ld b, Limit
loop_top:
  ; ... body ...
  dec b
  jp nz, loop_top
```

`dec b` decrements B and sets the Z flag when B reaches zero. `jp nz` branches
back while B is non-zero. The pattern works, but it takes two instructions to
perform one conceptual operation: decrement-the-counter-and-loop-if-not-done.

The Z80 has a single instruction that fuses those two operations.

---

## DJNZ: decrement B and jump if not zero

`djnz label` does exactly what its name says:

1. Decrement B by one.
2. If B is now non-zero, jump to `label`.
3. If B is now zero, fall through to the next instruction.

The single instruction replaces `dec b / jp nz, label`. It is one byte smaller
than the `dec b / jr nz` form (2 bytes vs 3) and two bytes smaller than
`dec b / jp nz` (2 bytes vs 4). On a tight Z80, that matters.

`djnz` is a relative jump, like `jr`. Its target must be within approximately
128 bytes backward or 127 bytes forward. If the loop body is too long for that
range, the assembler reports an error and you must use `dec b / jp nz` instead.

---

## The loop structure with explicit labels

Every DJNZ loop has the same three parts:

1. **Init**: load B with the iteration count before the loop.
2. **Body**: the instructions that run each iteration.
3. **Branch-back**: `djnz` at the end of the body, targeting the body label.

```zax
ld b, 5           ; init: B = iteration count
loop_top:
  ; body
  djnz loop_top   ; branch-back: B--; if B != 0, go to loop_top
```

The label `loop_top` sits at the first instruction of the body, not before the
`ld b` initializer. B's starting value is yours to set — `djnz` reads whatever B holds when it
first runs. Forget the `ld b` init and the loop runs for an unpredictable
number of iterations.

---

## The zero-count hardware semantic

`djnz` uses B as an 8-bit counter. When you write `ld b, 5`, the loop runs
exactly 5 times. But what happens if you write `ld b, 0`?

On the Z80, DJNZ decrements B before testing. If B starts at 0, the decrement
wraps to 255 (`$FF`), the result is non-zero, and the jump is taken. The loop
continues from B = 255 and runs a further 255 times before B reaches zero again.
Total: 256 iterations.

`ld b, 0` before `djnz` is valid Z80 — it gives 256 iterations, and some
programs use it deliberately for exactly that reason. The danger is
unintentional: expecting zero iterations and getting 256.

The consequence for you as a programmer: **never call a DJNZ loop with B = 0
when you intend zero iterations.** If the iteration count can be zero, test for
it before the loop:

```zax
ld a, count_value
or a               ; test whether count_value is zero
jr z, skip_loop    ; skip the entire loop if count is zero
ld b, a
loop_top:
  ; body
  djnz loop_top
skip_loop:
```

If you know at write-time that the count is always between 1 and 255, no
pre-test is needed.

---

## What the registers hold after a loop

After a loop exits, all three registers it touched have changed. Consider the
counted loop from Section A of the example below, which sums the five bytes
`{ 3, 7, 2, 8, 5 }`:

```zax
ld hl, addends
ld b, TableLen      ; B = 5
ld a, 0
djnz_loop:
  add a, (hl)
  inc hl
  djnz djnz_loop
ld (total), a
```

When the loop exits: **B is zero** (that was the exit condition). **A holds 25**
(the accumulated sum). **HL points one byte past the last element** — it was
incremented after reading each entry, so after five elements it has advanced
five positions beyond the base.

That last point matters. If another variable is stored immediately after the
table, HL now points at it. A stray `ld (hl), a` at this point would silently
overwrite that variable. The Z80 has no array bounds, no memory protection, no
runtime error. Write past the end of a table and you corrupt whatever is there. The price of assembly's freedom is
responsibility — you must track where your pointers end up.

---

## Sentinel loops

A sentinel loop tests each element against a known value. The data tells it
when to stop; there is no count to set in advance.

The structure uses `cp` and `jr z` instead of DJNZ as the exit mechanism:

```zax
ld hl, table_base
sentinel_loop:
  ld a, (hl)
  cp sentinel_value
  jr z, found        ; exit when the sentinel value is seen
  inc hl
  jr sentinel_loop   ; keep going (no bound check here)
found:
```

This form has no automatic bound: if the sentinel value never appears, the loop
runs past the end of the table. A safe sentinel loop pairs the value test with a
DJNZ bound:

```zax
ld hl, table_base
ld b, TableLen       ; guard against overrun
sentinel_loop:
  ld a, (hl)
  cp sentinel_value
  jr z, found
  inc hl
  djnz sentinel_loop ; DJNZ as the overrun guard
  jr not_found       ; fell through without a match
found:
```

Now the loop exits when the sentinel is found, or when all TableLen entries have
been checked without a match. The role of DJNZ here is purely a safety bound,
not the primary exit condition.

---

## Flag-exit loops

A flag-exit loop runs until an arithmetic condition becomes true, then exits
through the flag. A typical case: accumulate values until the sum exceeds a
threshold.

```zax
ld a, 0
flag_loop:
  add a, (hl)
  inc hl
  cp threshold
  jr nc, done    ; exit when A >= threshold (carry clear means A >= threshold)
  djnz flag_loop
done:
```

The exit here is driven by `cp threshold / jr nc`, not by DJNZ. DJNZ again
provides the overrun guard. The two conditions are independent: whichever fires
first ends the loop.

---

## The example: `learning/part1/examples/04_djnz_loops.zax`

```zax
const TableLen = 5

section data vars at $8000
  total:    byte = 0
  scanval:  byte = 0
  flagval:  byte = 0
end

section data rom at $8010
  addends: byte[5] = { 3, 7, 2, 8, 5 }
end
```

The `section data` declaration takes a user-chosen name. Earlier chapters used
`vars` to indicate mutable RAM storage. Here, `rom` is a conventional name
meaning the data lives in read-only or program memory. Neither `vars` nor `rom`
is a ZAX keyword — the name is yours to choose. Pick a name that describes
where the data lives on your target system (`vars`, `rom`, `heap`, and `bss` are
all valid).

The program runs three loop forms side by side over the same five-element table.

**Section A — DJNZ counted loop.**

```zax
ld hl, addends
ld b, TableLen
ld a, 0
djnz_loop:
  add a, (hl)
  inc hl
  djnz djnz_loop
ld (total), a
```

`ld hl, addends` sets HL to the address of the first entry. `ld b, TableLen`
sets B to 5. The body adds the current byte at HL to A and increments HL. DJNZ
decrements B and loops back while B is non-zero. After 5 iterations B = 0, the
loop exits, and `total` receives 25 ($19): the sum of 3 + 7 + 2 + 8 + 5.

**Section B — sentinel loop (cp / jr z).**

```zax
ld hl, addends
ld b, TableLen
sentinel_loop:
  ld a, (hl)
  cp 8
  jr z, sentinel_found
  inc hl
  djnz sentinel_loop
  ld a, $FF
  jr sentinel_done
sentinel_found:
  ld a, (hl)
sentinel_done:
  ld (scanval), a
```

The loop scans the table for the value 8. `cp 8` tests the current byte. When
it matches, Z is set and `jr z, sentinel_found` exits the loop; A receives the
matched byte. DJNZ provides the overrun guard: if 8 were not present, the loop
would exhaust all five entries and fall through to `ld a, $FF`. Because 8 is
the fourth entry, `scanval` receives 8.

**Section C — flag-exit loop.**

```zax
ld hl, addends
ld b, TableLen
ld a, 0
flag_loop:
  add a, (hl)
  inc hl
  cp $10
  jr nc, flag_done
  djnz flag_loop
flag_done:
  ld (flagval), a
```

The loop accumulates bytes until the sum reaches or exceeds 16 (`$10`). After
adding 3, the sum is 3 — `cp $10` sets carry (3 < 16), so `jr nc` does not
branch. After adding 7, the sum is 10 — still less than 16. After adding 2, the
sum is 12 — still less. After adding 8, the sum is 20 — `cp $10` finds 20 >= 16,
carry is clear, `jr nc` exits. `flagval` receives 20 ($14).

---

## Choosing between DJNZ, sentinel, and flag-exit

DJNZ is the right choice when you know exactly how many iterations to run before
the loop starts. Load B with that count and use DJNZ.

A sentinel loop is right when the stopping condition is "find this value." It
exits on content, not count, and DJNZ serves only as an overrun guard.

A flag-exit loop is right when the stopping condition is "some computed quantity
has crossed a threshold." It exits on an arithmetic result, with DJNZ again
serving only as the overrun guard.

In practice, most raw Z80 loops are counted loops with DJNZ as the primary
exit. The sentinel and flag-exit forms appear when the content or computation
determines when to stop.

---

## Summary

- `djnz label` decrements B and jumps to `label` if B is non-zero; it falls
  through when B reaches zero.
- `djnz` replaces `dec b / jp nz` in one instruction and is smaller: 2 bytes
  vs 3 for `dec b / jr nz`, or 4 for `dec b / jp nz`. Its reach is limited to
  roughly 128 bytes backward; use `dec b / jp nz` for longer loops.
- A DJNZ loop has three parts: init (load B), body, and branch-back (djnz).
- The zero-count hardware semantic: B = 0 before `djnz` gives 256 iterations,
  not zero. Guard against this when the count can be zero.
- A sentinel loop uses `cp` and `jr z` as the primary exit, with DJNZ as an
  overrun guard.
- A flag-exit loop uses a flag condition as the primary exit, with DJNZ again
  as the overrun guard.

---

[← Flags, Comparisons, Jumps](04-flags-comparisons-jumps.md) | [Part 1](README.md) | [Data Tables and Indexed Access →](06-data-tables-and-indexed-access.md)
