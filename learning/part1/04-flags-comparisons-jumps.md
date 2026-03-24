[← Assembly Language](03-assembly-language.md) | [Part 1](README.md) | [Counting Loops and DJNZ →](05-counting-loops-and-djnz.md)

# Chapter 4 — Flags, Comparisons, and Jumps

Every program makes decisions. The Z80 makes them by recording the outcome of
each operation in the flags register, then testing those flags with a
conditional jump. This chapter introduces both: what the flags record, how `cp`
and `or a` set them, and how `jp` uses them to direct execution.

---

## The flag register

The Z80 flag register F holds eight bits, each of which records one piece of
information about the last instruction that affected flags. Programs cannot read
or write F directly with `ld`. Arithmetic instructions set the flags as a side
effect, and conditional jump instructions test them to decide whether to branch.

The four flags you will use most often are:

| Flag | Name | Set when |
|------|------|----------|
| Z | Zero | Result is zero |
| C | Carry | Arithmetic produced a carry out of bit 7 (unsigned overflow) |
| S | Sign | Bit 7 of the result is 1 (result is negative in signed interpretation) |
| P/V | Parity/Overflow | Result parity is even; or signed overflow occurred |

The Z and C flags appear in almost every conditional branch. S and P/V appear
in more specialized cases.

---

## `cp`: compare without storing

`cp n` subtracts the value `n` from A and sets the flags based on the result,
but does **not** store the result back in A. After `cp n`, A is unchanged and
the flags reflect `A - n`.

```zax
ld a, 5
cp 5      ; A - 5 = 0; Z flag is set, C flag is clear
```

After `cp 5` with A = 5: Z is set (result is zero), C is clear (no borrow).

```zax
ld a, 3
cp 5      ; A - 5 = -2; Z flag is clear, C flag is set (borrow)
```

After `cp 5` with A = 3: Z is clear (result is not zero), C is set (A was less
than 5 — unsigned borrow is treated as carry).

After `cp n`, Z is set if A equals n, and C is set if A is less than n (unsigned).

---

## `or a`: test whether A is zero

`or a` performs the bitwise OR of A with itself. The result is always equal to
A, so A is unchanged. The flags are updated: Z is set if A is zero, C is
cleared.

```zax
ld a, 0
or a       ; Z is set because A is zero

ld a, $FF
or a       ; Z is clear because A is non-zero
```

`or a` reflects whether A is currently zero — one byte, no comparison value.
(`cp 0` would do the same job in two bytes.)

---

## Unconditional jump: `jp nn`

`jp $8010` changes the program counter to `$8010`. The CPU's next fetch comes
from that address. Execution continues from there, not from the instruction
following the `jp`.

`jp` can target a label:

```zax
jp done
...
done:
  ret
```

The assembler resolves the label `done` to its address and encodes that address
into the `jp` instruction. The jump always happens — the flags are not consulted.

---

## Conditional jump: `jp cc, label`

`jp z, target` jumps to `target` only if the Z flag is currently set. If Z is
clear, execution falls through to the next instruction.

`jp nz, target` jumps if Z is clear (n = "not"). The condition codes for the
four main flags are:

| Code | Meaning |
|------|---------|
| `z` | Jump if Z is set |
| `nz` | Jump if Z is clear |
| `c` | Jump if C is set |
| `nc` | Jump if C is clear |

A conditional branch is the raw Z80 equivalent of an if-statement. There is no
structured keyword. Instead, you set the flags with `cp` or an arithmetic
instruction, then use a conditional `jp` to skip over the "then" block:

```zax
; if A == 5: do something
cp 5
jp nz, skip    ; if A != 5, skip the block
; ... the "then" body ...
skip:
```

If A equals 5, Z is set, `jp nz` does not branch, and the then-body executes.
If A is anything else, Z is clear, `jp nz` branches to `skip`, and the
then-body is skipped.

---

## Short relative jump: `jr`

`jr` is a shorter form of `jp`. Where `jp` encodes a full 16-bit target
address, `jr` encodes a signed 8-bit displacement from the current instruction.
This limits its range to approximately 127 bytes forward or 128 bytes backward,
but saves one byte of code.

`jr nz, label` is the conditional relative jump form: jump to `label` if Z is
clear.

For any jump that could exceed the 128-byte backward range, use `jp` instead.
The assembler will report an error if a `jr` target is out of range.

The practical differences:

| | `jp` (absolute) | `jr` (relative) |
|---|---|---|
| Address encoding | Full 16-bit address | Signed 8-bit displacement |
| Instruction size | 3 bytes | 2 bytes |
| Reach | Anywhere in 64K | ≈ 128 bytes backward / 127 forward |
| Available conditions | z, nz, c, nc, pe, po, m, p | z, nz, c, nc only |

Use `jr` when the target is close and you want compact code. Use `jp` when the
target may be far away, or when you need the `pe`, `po`, `m`, or `p` conditions
that `jr` does not support.

---

## Detecting a negative number: the `cp $80` technique

A signed byte stores values from -128 to 127. Negative values have bit 7 set,
which means their unsigned interpretation is 128 or greater. You can test
whether A holds a negative number by comparing it against 128 as an unsigned
value:

```zax
  cp $80              ; compare A (unsigned) against 128
  jr c, is_positive   ; carry set means A < 128 → non-negative
  neg                 ; negate A: A = -A
is_positive:
  ; A now holds the absolute value
```

After `cp $80`, carry is set when A is less than 128 (unsigned) — meaning
bit 7 is clear, so the signed value is non-negative. If carry is clear, A is
128 or above, which means bit 7 is set and the value is negative. `neg` then
flips the sign, leaving A with the absolute value.

This pattern works because signed and unsigned representations share the same
bits — the only difference is how you interpret bit 7. Comparing against `$80`
is the dividing line between the two halves: 0–127 (non-negative) and 128–255
(negative when read as signed).

`neg` applied to −128 gives −128 — the mathematical result (+128) does not fit
in a signed byte, so the bit pattern (`$80`) is unchanged.

---

## Label-based control flow structure

Every conditional block in raw Z80 has the same skeleton:

1. Set the flags (using `cp`, `or a`, arithmetic, or another instruction).
2. Conditionally jump over the block you want to skip.
3. Write the block.
4. Place an exit label after the block.

A simple loop has a similar skeleton:

1. Initialize a counter or pointer before the loop.
2. Place a label at the loop top.
3. Write the loop body.
4. Update the counter or pointer.
5. Test the exit condition.
6. Conditionally jump back to the loop-top label.

The example file below runs both back to back — trace each one and watch which instruction sets the flag before the branch reads it.

---

## The example: `learning/part1/examples/03_flag_tests_and_jumps.zax`

```zax
const Limit = 5

section data vars at $8000
  counter: byte = 0
  found:   byte = 0
end

export func main()
  ld a, Limit
  cp 5
  jp nz, not_equal
  ld a, 1
  ld (found), a
  jp done_compare
not_equal:
  ld a, 0
  ld (found), a
done_compare:

  ld a, 0
  or a
  jp z, was_zero
  jp skip_zero
was_zero:
  ld a, $AA
skip_zero:

  ld b, Limit
loop_top:
  ld a, (counter)
  inc a
  ld (counter), a
  dec b
  jp nz, loop_top
end
```

**Section A — equality test.** `ld a, Limit` loads 5 into A. `cp 5` subtracts 5
from A and sets Z. Because A equals 5, Z is set. `jp nz, not_equal` tests
whether Z is clear: it is set, so the jump does not occur. Execution continues
through `ld a, 1 / ld (found), a`, then `jp done_compare` skips the else-block
and lands at `done_compare:`.

If A had held any value other than 5, Z would have been clear, `jp nz` would
have branched to `not_equal:`, and `found` would have been set to 0.

**Section B — zero test with `or a`.** `ld a, 0` loads zero. `or a` sets Z because
A is zero. `jp z, was_zero` branches because Z is set. The instruction
`ld a, $AA` executes as the "zero was detected" branch; this marks the register
so you can verify in a debugger or simulator that this path ran. `jp skip_zero`
then skips past the end of the zero-branch.

This pair — `jp z, was_zero` / `jp skip_zero` — is the raw conditional branch
pattern defined in "Label-based control flow structure" above: set a flag, use a
conditional jump to enter or skip a consequence block, and place an exit label
after it. The only difference from the `cp`-based Section A is that `or a` sets
the flag here instead of `cp`.

**Section C — counted loop with `dec` / `jp nz`.** `ld b, Limit` initializes B to
5. At `loop_top:`, the body reads `counter` from RAM, increments it, and stores
it back. `dec b` decrements B and sets Z when B reaches zero. `jp nz, loop_top`
branches back while B is non-zero.

After the loop, `counter` holds 5. B holds 0. The loop ran exactly five times.

`dec b` sets the Z flag — not the preceding `ld (counter), a`, which never
touches flags. `jp nz` reads whatever `dec b` left. Always identify which
instruction sets the flag before the branch that reads it.

---

## Summary

- The Z, C, S, and P/V flags record the outcome of the last instruction that
  affected them. Most `ld` instructions do not affect flags; arithmetic and
  comparison instructions do.
- `cp n` subtracts n from A and sets flags without changing A. Z is set if
  A = n; C is set if A < n (unsigned).
- `or a` sets Z if A is zero, without changing A. Use it to test A for zero
  without a comparison value.
- `jp label` jumps unconditionally to the address of `label`.
- `jp nz, label` jumps if Z is clear; `jp z, label` jumps if Z is set; `jp c`
  and `jp nc` test the C flag.
- `jr` is a shorter, range-limited relative jump. Use it for nearby branches;
  use `jp` when the target might be more than 127 bytes away.
- A conditional block in raw Z80 uses a flag-setting instruction, a conditional
  `jp` to skip the block, the block body, and an exit label.
- A counted loop uses a register as the counter, a loop-top label, the loop
  body, a decrement, and `jp nz` back to the loop-top label.
- Always identify which instruction sets the flag before the branch that reads
  it.

---

[← Assembly Language](03-assembly-language.md) | [Part 1](README.md) | [Counting Loops and DJNZ →](05-counting-loops-and-djnz.md)
