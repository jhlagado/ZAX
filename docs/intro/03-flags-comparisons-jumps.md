# Chapter 03 — Flags, Comparisons, and Jumps

This chapter explains the flag register, shows how `cp` and `or a` set flags,
and demonstrates how conditional and unconditional jump instructions use those
flags to control which instructions execute next. After reading it you will be
able to follow a short raw Z80 control-flow sequence, trace through a simple
conditional branch, and read a label-based counted loop.

Prerequisites: Chapters 00–02 (bytes, registers, `ld` modes, labels).

---

## The flag register

The Z80 flag register F holds eight bits, each of which records one piece of
information about the last instruction that affected flags. Programs cannot read
or write F directly with `ld`. Instead, arithmetic instructions set the flags
as a side effect, and conditional jump instructions test the flags to decide
whether to jump.

The four flags used most often in Phase A programs are:

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

This is the standard way to test a relationship between A and a value:

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

The rule: after `cp n`, Z is set if A equals n, and C is set if A is less than
n (unsigned).

---

## `or a`: test whether A is zero

`or a` performs the bitwise OR of A with itself. The result is always equal to
A, so A is unchanged. The flags are updated: Z is set if A is zero, C is
cleared.

This is the standard idiom for testing whether A holds zero without a separate
comparison:

```zax
ld a, 0
or a       ; Z is set because A is zero

ld a, $FF
or a       ; Z is clear because A is non-zero
```

`or a` does not require knowing what value to compare against; it simply
reflects whether A is currently zero. It is shorter and faster than `cp 0`.

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
into the `jp` instruction. This is the unconditional jump: it always branches,
no matter what the flags say.

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

`jr` is commonly used for short backward jumps in loops. For any jump that could
exceed the 128-byte backward range, use `jp` instead. The assembler will report
an error if a `jr` target is out of range.

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

Both structures are visible in the example file.

---

## The example: `examples/intro/03_flag_tests_and_jumps.zax`

```zax
const Limit = 5

section data vars at $8000
  counter: byte = 0
  found:   byte = 0
end

export func main(): void
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

  ret
end
```

**Part 1 — equality test.** `ld a, Limit` loads 5 into A. `cp 5` subtracts 5
from A and sets Z. Because A equals 5, Z is set. `jp nz, not_equal` tests
whether Z is clear: it is set, so the jump does not occur. Execution continues
through `ld a, 1 / ld (found), a`, then `jp done_compare` skips the else-block
and lands at `done_compare:`.

If A had held any value other than 5, Z would have been clear, `jp nz` would
have branched to `not_equal:`, and `found` would have been set to 0.

**Part 2 — zero test with `or a`.** `ld a, 0` loads zero. `or a` sets Z because
A is zero. `jp z, was_zero` branches because Z is set. The instruction
`ld a, $AA` executes as the "zero was detected" branch; this marks the register
so you can verify in a debugger or simulator that this path ran.

**Part 3 — counted loop with `dec` / `jp nz`.** `ld b, Limit` initializes B to
5. At `loop_top:`, the body reads `counter` from RAM, increments it, and stores
it back. `dec b` decrements B and sets Z when B reaches zero. `jp nz, loop_top`
branches back while B is non-zero.

After the loop, `counter` holds 5. B holds 0. The loop ran exactly five times.

Notice that `dec b` sets the Z flag: this is how `jp nz` knows when to stop.
The flag is not set by `ld`; it is set by the instruction that changes the
counter. Always identify which instruction sets the flag you are about to test.

---

## What This Chapter Teaches

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

## What Comes Next

Chapter 04 introduces `djnz`, the Z80's dedicated decrement-and-branch-if-not-
zero instruction, and shows how it reduces the two-instruction counter-decrement-
and-test pattern to a single instruction.
