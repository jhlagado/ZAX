[← Assembly Language](03-assembly-language.md) | [Part 1](README.md) | [Counting Loops and DJNZ →](05-counting-loops-and-djnz.md)

# Chapter 4 — Flags, Comparisons, and Jumps

Every program makes decisions. A loop decides when to stop. A condition decides
which path to take. In a high-level language the syntax handles this — `if`,
`while`, `for` are keywords the compiler translates for you. In assembly there
are no such keywords. There are only instructions.

The mechanism the Z80 uses is the **flags register** and the **conditional
jump**. Every instruction that produces a result leaves a record of that result
in F. Conditional jump instructions read that record and branch based on what
they find. That is the entire basis of flow control in raw Z80 — and once you
understand it, you can build any structure you need.

---

## The Flags Register

After an instruction that performs arithmetic or comparison, certain bits in the
flags register F are updated to describe the result. You cannot read or write F
directly with `LD`; instead, arithmetic instructions set the flags as a side
effect, and conditional jump instructions test them to decide whether to branch.

The four flags you will use most often are:

| Flag | Name | Set when |
|------|------|----------|
| Z | Zero | Result is zero |
| C | Carry | Arithmetic produced a carry out of bit 7 (unsigned overflow) |
| S | Sign | Bit 7 of the result is 1 (result is negative in signed interpretation) |
| P/V | Parity/Overflow | Result parity is even; or signed overflow occurred |

Z and C appear in almost every conditional branch. S and P/V appear in more
specialised cases.

Not every instruction updates every flag. `LD` instructions do not affect flags
at all — they are pure copies. Arithmetic and comparison instructions do affect
flags. You will learn which flags each instruction touches as you encounter them.
The critical habit is: always know which instruction set the flag before the
branch that reads it.

---

## `cp`: Setting Flags Without Changing A

`cp n` subtracts the value `n` from A and sets the flags based on the result,
but does **not** store the result back in A. After `cp n`, A is unchanged and
the flags reflect `A − n`.

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
n (unsigned). Nothing in A changes.

---

## `or a`: Testing Whether A Is Zero

`or a` performs the bitwise OR of A with itself. The result is always A, so A
is unchanged. The flags are updated: Z is set if A is zero, C is cleared.

This is the standard way to test whether A holds zero without a separate
comparison:

```zax
ld a, 0
or a       ; Z is set because A is zero

ld a, $FF
or a       ; Z is clear because A is non-zero
```

`or a` does not require knowing what value to compare against — it simply
reflects whether A is currently zero. It is also shorter than `cp 0`: one
byte instead of two. You will see it constantly.

---

## Unconditional Jump: `jp nn`

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

The assembler resolves `done` to its address and encodes it into the instruction.
This is the unconditional jump: it always branches, no matter what the flags say.

---

## Conditional Jump: `jp cc, label`

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
structured keyword — you set the flags with `cp` or an arithmetic instruction,
then use a conditional `jp` to skip over the "then" block:

```zax
; if A == 5: do something
cp 5
jp nz, skip    ; if A != 5, skip the block
; ... the "then" body ...
skip:
```

If A equals 5, Z is set, `jp nz` does not branch, and the body executes. If A
is anything else, Z is clear, `jp nz` branches to `skip`, and the body is
skipped. The pattern feels backwards at first — you are jumping over the code
you *want* to run — but it is the only shape raw Z80 gives you.

---

## Short Relative Jump: `jr`

`jr` is a shorter form of `jp`. Where `jp` encodes a full 16-bit target
address, `jr` encodes a signed 8-bit displacement from the current instruction.
This limits its range to approximately 127 bytes forward or 128 bytes backward,
but saves one byte of code.

`jr nz, label` is the conditional relative jump form: jump to `label` if Z is
clear.

`jr` is commonly used for short backward jumps in loops. For any jump that could
exceed the 128-byte backward range, use `jp` instead. The assembler will report
an error if a `jr` target is out of range.

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

## Detecting a Negative Number: the `cp $80` Technique

A signed byte stores values from −128 to 127. Negative values have bit 7 set,
which means their unsigned interpretation is 128 or greater. You can test
whether A holds a negative value by comparing it against 128 as an unsigned
quantity:

```zax
  cp $80              ; compare A (unsigned) against 128
  jr c, is_positive   ; carry set means A < 128 → non-negative
  neg                 ; negate A: A = -A
is_positive:
  ; A now holds the absolute value
```

After `cp $80`, carry is set when A is less than 128 (unsigned), meaning bit 7
is clear and the signed value is non-negative. If carry is clear, A is 128 or
above: bit 7 is set, the value is negative, and `neg` flips the sign.

This works because signed and unsigned representations share the same bits. The
value 128 is the dividing line: 0–127 on the non-negative side, 128–255 on the
negative side when read as signed. Note that `neg` applied to −128 gives −128
again — the mathematical result (+128) does not fit in a signed byte, so the
bit pattern `$80` is unchanged.

---

## How a Conditional Block Is Built

Every conditional block in raw Z80 has the same skeleton:

1. Set the flags (using `cp`, `or a`, arithmetic, or another instruction).
2. Conditionally jump over the block you want to skip.
3. Write the block.
4. Place an exit label after the block.

A simple loop has a similar shape:

1. Initialise a counter or pointer before the loop.
2. Place a label at the loop top.
3. Write the loop body.
4. Update the counter or pointer.
5. Test the exit condition.
6. Conditionally jump back to the loop-top label.

Both structures are visible in the example file.

---

## The Example: `learning/part1/examples/03_flag_tests_and_jumps.zax`

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

**Section A — equality test.** `ld a, Limit` loads 5 into A. `cp 5` sets Z
because A equals 5. `jp nz, not_equal` tests whether Z is clear — it is set, so
the jump does not occur. Execution continues through `ld a, 1 / ld (found), a`,
then `jp done_compare` skips the else-block.

If A had held any value other than 5, Z would have been clear, `jp nz` would
have branched to `not_equal:`, and `found` would have been set to 0.

**Section B — zero test with `or a`.** `ld a, 0` loads zero. `or a` sets Z
because A is zero. `jp z, was_zero` branches. `ld a, $AA` marks the register
so you can verify in a debugger that this path ran.

This pair — `jp z, was_zero` followed by `jp skip_zero` — is the conditional
branch pattern in action: set a flag, use a conditional jump to enter or skip a
consequence block, place an exit label after it.

**Section C — counted loop with `dec` / `jp nz`.** `ld b, Limit` initialises B
to 5. At `loop_top:`, the body reads `counter` from RAM, increments it, and
stores it back. `dec b` decrements B and sets Z when B reaches zero. `jp nz,
loop_top` branches back while B is non-zero.

After the loop, `counter` holds 5. B holds 0. The loop ran exactly five times.
`dec b` is the instruction that sets the flag; `jp nz` reads it. These two
always go together.

---

## Summary

- The flags register F records the outcome of the last instruction that affected
  it. Most `ld` instructions do not affect flags; arithmetic and comparison
  instructions do.
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
