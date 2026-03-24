[← Flags, Comparisons, Jumps](04-flags-comparisons-jumps.md) | [Part 1](README.md) | [Data Tables and Indexed Access →](06-data-tables-and-indexed-access.md)

# Chapter 5 — Counting Loops and DJNZ

There are no loops in assembly. There are no subroutines, no if-statements, no
structured blocks of any kind. The language is nothing but individual
instructions, one after another. Every structure that exists in high-level
languages — loops, conditionals, function calls — you build yourself out of
jumps and labels. The CPU does exactly what you write, nothing more.

---

## Chapter 4 Left a Two-Instruction Pattern

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

The Z80 has a single instruction that fuses those two.

---

## DJNZ: Decrement B and Jump if Not Zero

`djnz label` does exactly what its name says:

1. Decrement B by one.
2. If B is now non-zero, jump to `label`.
3. If B is now zero, fall through to the next instruction.

It replaces `dec b / jp nz, label` in one instruction — one byte smaller than
`dec b / jr nz` (2 bytes vs 3) and two bytes smaller than `dec b / jp nz` (2
bytes vs 4). On a tight Z80 system, that matters.

`djnz` is a relative jump, like `jr`. Its target must be within approximately
128 bytes backward or 127 bytes forward. If the loop body is too long for that
range, the assembler reports an error and you must use `dec b / jp nz` instead.

---

## The Loop Structure

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
`ld b` initialiser. DJNZ does not initialise B — that is your responsibility.
If you forget the `ld b` init, B holds whatever was there from the previous
instruction, and the loop runs for an unpredictable number of iterations. This
is the most common DJNZ mistake.

---

## The Zero-Count Hardware Semantic

`djnz` uses B as an 8-bit counter. When you write `ld b, 5`, the loop runs
exactly 5 times. But what happens if you write `ld b, 0`?

On the Z80, DJNZ decrements B *before* testing. If B starts at 0, the decrement
wraps to 255 (`$FF`), the result is non-zero, and the jump is taken. The loop
continues from B = 255 and runs a further 255 times before B reaches zero again.
Total: 256 iterations.

This is not a programming error that the hardware catches. It is documented
hardware behaviour. `ld b, 0 / djnz label` is a valid way to write a 256-
iteration loop, and some programs use it intentionally. But if you meant *zero*
iterations and wrote `ld b, 0`, you will get 256. The two are indistinguishable
to the CPU.

**Never call a DJNZ loop with B = 0 when you intend zero iterations.** If the
iteration count can be zero, test for it before the loop:

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

## What the Registers Hold After a Loop

It is worth pausing to think about what state the CPU is in after a loop
finishes. Consider this loop, which sums the five bytes `{ 3, 7, 2, 8, 5 }`:

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
overwrite that variable. There is nothing to stop you: the Z80 has no array
bounds, no memory protection, no runtime error. If you write past the end of
a table, you corrupt whatever is there. The price of assembly's freedom is
responsibility — you must track where your pointers end up.

---

## Sentinel Loops

A sentinel loop does not count iterations. It tests each element against a
known value — the **sentinel** — and stops when it finds a match. This is the
right shape when you do not know how many elements to process; the data tells
you when to stop.

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
been checked without a match. DJNZ here is a safety bound, not the primary exit
condition.

---

## Flag-Exit Loops

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

## The Example: `learning/part1/examples/04_djnz_loops.zax`

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

The `section data` declaration takes a user-chosen name. Here, `rom` is a
conventional name meaning the data lives in read-only or program memory. Neither
`vars` nor `rom` is a ZAX keyword — the name is yours to choose. Pick one that
describes where the data lives on your target system.

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
it matches, Z is set and `jr z, sentinel_found` exits; A receives the matched
byte. DJNZ provides the overrun guard: if 8 were not present, the loop would
exhaust all five entries and fall through to `ld a, $FF`. Because 8 is the
fourth entry, `scanval` receives 8.

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
3+7+2 = 12, the carry is still set (12 < 16). After adding 8, the sum is 20.
`cp $10` finds 20 ≥ 16, carry is clear, `jr nc` exits. `flagval` receives 20
($14).

---

## Picking the Right Loop Shape

DJNZ is the right tool when you know exactly how many iterations to run before
the loop starts. Load B with the count and let DJNZ handle the rest.

A sentinel loop is right when the stopping condition is "find this value." The
data determines when to stop, not a count you calculated in advance. DJNZ is
only there to keep the loop from running forever if the value is missing.

A flag-exit loop is right when the stopping condition is "some computed quantity
has crossed a threshold." An arithmetic result drives the exit, with DJNZ again
serving only as the overrun guard.

In practice, most raw Z80 loops are counted loops. The sentinel and flag-exit
forms appear when content or computation determines when to stop — and DJNZ
earns its place in those loops not as the exit mechanism, but as the safety net.

---

## Summary

- `djnz label` decrements B and jumps to `label` if B is non-zero; it falls
  through when B reaches zero.
- `djnz` replaces `dec b / jp nz` in one instruction: 2 bytes vs 4. Its reach
  is limited to roughly 128 bytes backward; use `dec b / jp nz` for longer loops.
- A DJNZ loop has three parts: init (load B), body, and branch-back (djnz).
  The init must come before the loop-top label, not inside it.
- The zero-count hardware semantic: B = 0 before `djnz` gives 256 iterations,
  not zero. Guard against this when the count can be zero.
- A sentinel loop uses `cp` and `jr z` as the primary exit, with DJNZ as an
  overrun guard.
- A flag-exit loop uses a flag condition as the primary exit, with DJNZ again
  as the overrun guard.
- After a loop exits, B is zero and any pointer register (HL, IX) has advanced
  past the last element processed. Know where your pointers land.

---

[← Flags, Comparisons, Jumps](04-flags-comparisons-jumps.md) | [Part 1](README.md) | [Data Tables and Indexed Access →](06-data-tables-and-indexed-access.md)
