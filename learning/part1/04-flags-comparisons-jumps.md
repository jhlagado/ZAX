[← Assembly Language](03-assembly-language.md) | [Part 1](README.md) | [Counting Loops and DJNZ →](05-counting-loops-and-djnz.md)

# Chapter 4 — Flags, Comparisons, and Jumps

Every program makes decisions. The Z80 makes them by recording the outcome of
each operation in the flags register, then testing those flags to decide where
execution goes next. This chapter introduces both: what the flags record, how `cp` and the logical
operations set them, and how `jp` uses them.

---

## The flags register

After any calculation, you need to be able to ask: was the result zero? Did it
overflow? Was A less than the value I compared it against? The answer sits in
the flags register.

F holds eight bits. Each bit is called a flag and records one specific outcome
of the last instruction that changed flags. Instructions like `sub`, `cp`,
`and`, `or`, `xor`, `inc`, and `dec` update them as a side effect. The flags
change; you observe them afterward.

Not every instruction affects every flag, and some instructions affect no flags
at all. `ld` never touches the
flags. `inc` and `dec` update most flags but leave C unchanged. This matters
constantly in practice — when a `jp` instruction tests a flag, you need to know
which earlier instruction set it and whether anything in between might have
changed it. An `ld` between your comparison and your `jp` leaves the flags
exactly as they were; a `dec` between them replaces them. Tracking this is one
of the things that takes time to do automatically when reading Z80 code.

The four flags you will use most:

| Flag | Name | Set when |
|------|------|----------|
| Z | Zero | Result is zero |
| C | Carry | Arithmetic produced a carry out of bit 7, or a borrow in subtraction |
| S | Sign | Bit 7 of the result is 1 |
| P/V | Parity/Overflow | Result parity is even; or signed overflow occurred |

**Z** is the one you will reach for constantly. After `sub` or `cp`, Z is set
when the two values were equal. After `dec`, Z is set when a register reaches
zero. After `and`, Z is set when none of the tested bits were present.

**C** records unsigned overflow. After addition, C is set when the result
exceeded 255 — the carry out of bit 7. After `sub` or `cp`, C is set when A
was less than the subtracted value: the subtraction had to borrow. Addition and
subtraction share the same flag for these two distinct purposes, which is why
learning to read C in context takes a little time.

**S** mirrors bit 7 of the result. In signed arithmetic bit 7 is the sign bit,
so S tells you whether the result was negative. When you are working with
unsigned values you can usually ignore S.

**P/V** has two unrelated meanings depending on which instruction set it. After
`add` and `sub` it is the overflow flag: set when a signed operation produced a
result outside −128 to +127. After logical instructions and rotates it reports
parity: set when the result has an even number of 1 bits. The instruction
reference will tell you which meaning applies.

For the full flags reference and all condition codes, see
[Appendix 2](../appendices/02-registers-flags-and-conditions.md).

---

## `sub` and `cp`: subtraction and comparison

`sub n` subtracts `n` from A, writes the result back into A, and updates the
flags to reflect what happened.

```zax
ld a, 8
sub 3     ; A = 5; Z is clear (result non-zero), C is clear (no borrow)
```

```zax
ld a, 3
sub 5     ; A = $FE (−2); Z is clear, C is set (borrow — A was less than 5)
```

C is set when the subtraction needed to borrow — equivalently, when A was less
than the value subtracted (treating both as unsigned). Z is set when the result
is zero.

`cp n` does exactly the same subtraction and sets the same flags, but discards
the result. A is unchanged after `cp n`.

```zax
ld a, 5
cp 5      ; subtracts 5; Z is set (result is zero); A stays 5
```

```zax
ld a, 3
cp 5      ; subtracts 5; C is set (borrow); A stays 3
```

After `cp n`: Z is set if A equals n, C is set if A is less than n (unsigned).

Use `sub` when you need the computed difference. Use `cp` when you only need to
know the relationship — equal, less than, greater than — without changing A.

---

## Logical operations: `and`, `or`, `xor`

The three logical instructions each take a value, apply a bitwise operation
against A, and store the result back in A. All three clear the carry flag and
set Z if the result is zero.

`and n` keeps only the bits where the mask has 1. Use it to isolate part of a
byte:

```zax
ld a, $F3          ; A = %11110011
and $0F            ; A = %00000011 — upper four bits cleared, lower four kept
```

`or n` sets bits where the mask has 1 and leaves others unchanged:

```zax
ld a, $03
or $80             ; A = %10000011 — bit 7 now set
```

`or a` is a useful special case: A ORed with itself always equals A, so the
value does not change. Only the flags are updated — Z is set if A is zero, C is
cleared. One instruction tells you whether A is currently zero, with no
comparison value needed. (`cp 0` gives the same flags in two bytes instead of
one.)

```zax
ld a, 0
or a       ; Z is set because A is zero

ld a, $FF
or a       ; Z is clear because A is non-zero
```

`xor n` toggles bits where the mask has 1:

```zax
ld a, $FF
xor $0F            ; A = %11110000 — lower four bits flipped
```

The most-used form is `xor a`. A XOR'd against itself is always zero — every
bit cancels. In one instruction: A is zeroed, Z is set, C is cleared. `ld a, 0`
also zeros A but leaves the flags unchanged; when you need a guaranteed clean
state in both A and the carry, reach for `xor a`.

```zax
xor a              ; A = 0; Z is set; C is clear
```

All three instructions accept a register, an immediate byte, `(HL)`, or an
index register form. The quick reference for arithmetic and logical instruction
forms is in [Appendix 3](../appendices/03-addressing-prefixes-and-instruction-forms.md).

---

## `jp`: moving execution to a new address

From Chapter 1 you know that the CPU always executes the instruction at the
address in PC, then advances PC to the next instruction. `jp` breaks that
sequence: instead of advancing PC by the instruction's length, it puts a new
address into PC. The CPU's next fetch comes from that address. Whatever was
written after the `jp` in the source does not run.

```zax
jp $8010      ; PC becomes $8010; next instruction comes from $8010
```

You will almost always target a label rather than a raw address:

```zax
jp done
; code written here is never reached
done:
  ...
```

The assembler works out the address of `done` and encodes it into the
instruction bytes. The jump always happens — the flags play no role.

On its own, an unconditional `jp` is mostly useful for two things: skipping
over a block of code (which becomes the else-half of a conditional structure),
or jumping back to an earlier address to repeat something. Its real power comes
when it works together with the flags.

---

## Conditional `jp`: testing the flags

A conditional `jp` works exactly like an unconditional one, with one addition:
before changing PC, it checks a flag. If the flag condition is met, PC changes
and execution continues from the target address. If it is not met, the jump
doesn't happen and execution continues with the instruction that immediately
follows — it falls through.

`jp z, target` checks Z. If Z is set, the jump happens. If Z is clear,
execution falls through to the next instruction.

`jp nz, target` is the inverse: it jumps when Z is clear and falls through when
Z is set. The `n` prefix means "not": `nz` is "not zero", `nc` is "not carry".

The condition codes you will use most:

| Code | Meaning |
|------|---------|
| `z` | Jump if Z is set |
| `nz` | Jump if Z is clear |
| `c` | Jump if C is set |
| `nc` | Jump if C is clear |

`jp` also supports `m` (S set), `p` (S clear), `pe` (P/V set), and `po` (P/V
clear) for signed arithmetic and parity tests. The full list is in
[Appendix 2](../appendices/02-registers-flags-and-conditions.md).

This gives you the raw material for an if-statement. You set a flag with `cp`
or a logical instruction, then use a conditional `jp` to skip over the block
you do not want to execute:

```zax
cp 5
jp nz, skip    ; A != 5: jump to skip
; ... this body runs only when A == 5 ...
skip:
```

`cp 5` subtracts 5 from A and sets Z if the result was zero — that is, if A
was 5. `jp nz` then jumps if Z is clear, which means A was not 5. If A was 5,
Z is set, `jp nz` falls through, and the body runs. If A was anything else, Z
is clear, `jp nz` jumps to `skip`, and the body is skipped.

Getting the direction right is the part that trips everyone up at first. The
condition on `jp` is the condition that causes the jump — not the condition
that runs the body. `jp nz, skip` means "jump away if not-equal." The body
that follows is the equal case. Read it as: "if this is NOT what I want, get out."

`and` with a single-bit mask lets you test one specific bit of A and act on the
result:

```zax
ld a, (status)
and $04            ; keep only bit 2; Z is set if bit 2 was 0
jp z, bit_clear    ; bit 2 was 0 — go to bit_clear
```

`and $04` clears every bit except bit 2. If bit 2 was already 0 in A, the
result is 0, Z is set, and `jp z` jumps. If bit 2 was 1, the result is
non-zero, Z is clear, and execution falls through.

---

## Short relative jump: `jr`

`jp` encodes a full 16-bit target address in its three instruction bytes.
`jr` encodes only a signed 8-bit displacement — the distance from the current
instruction to the target, not the target's actual address. This limits its
reach to roughly 127 bytes forward or 128 bytes backward from the `jr`
instruction itself, but the instruction is one byte shorter.

`jr nz, label` jumps to `label` if Z is clear. The conditional forms support
`z`, `nz`, `c`, and `nc` only — fewer conditions than `jp`.

| | `jp` | `jr` |
|---|---|---|
| Address encoding | Full 16-bit address | Signed 8-bit displacement |
| Instruction size | 3 bytes | 2 bytes |
| Reach | Anywhere in 64K | ≈ 128 bytes backward / 127 forward |
| Conditions available | z, nz, c, nc, m, p, pe, po | z, nz, c, nc only |

For short loops and nearby tests, `jr` saves a byte per jump and the range is
rarely a problem. For anything that might be far away, or when you need a
condition that `jr` does not support, `jp` is the safe choice. The assembler
will tell you if a `jr` target is out of range. Jump range limits for `jr` and
the related `djnz` instruction (Chapter 5) are in
[Appendix 2](../appendices/02-registers-flags-and-conditions.md).

---

## Detecting a negative number: the `cp $80` technique

Suppose A holds a signed value and you need its absolute value. The first step
is finding out whether it is negative. A signed byte stores values from −128 to
127. Negative values have bit 7 set, which means their unsigned interpretation
is 128 or greater. You can test which half A falls in by comparing it against
128 as an unsigned value:

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

  ld a, $F3
  and $0F
  ld a, $03
  or $80
  ld a, $FF
  xor $0F
  xor a
end
```

**Section A — equality test.** `ld a, Limit` loads 5 into A. `cp 5` subtracts 5
from A and sets Z. Because A equals 5, Z is set. `jp nz, not_equal` tests
whether Z is clear: it is set, so the jump does not occur. Execution continues
through `ld a, 1 / ld (found), a`, then `jp done_compare` skips the else-block
and lands at `done_compare:`.

If A had held any value other than 5, Z would have been clear, `jp nz` would
have jumped to `not_equal:`, and `found` would have been set to 0.

**Section B — zero test with `or a`.** `ld a, 0` loads zero. `or a` sets Z
because A is zero. `jp z, was_zero` sees Z set and jumps to `was_zero:`.
`ld a, $AA` runs — this marks A so you can confirm in a debugger that this
path was taken. `jp skip_zero` then skips past the end of the block.

The structure is the same as Section A: set a flag, use a conditional `jp` to
enter or skip a consequence block, place an exit label after it. The only
difference is that `or a` sets the flag here instead of `cp`.

**Section C — counted loop with `dec` / `jp nz`.** `ld b, Limit` loads 5 into
B. At `loop_top:`, the body reads `counter` from RAM, increments it, and stores
it back. `dec b` decrements B and sets Z when B reaches zero. `jp nz, loop_top`
jumps back to `loop_top:` while B is non-zero.

After five iterations, `counter` holds 5 and B holds 0.

Pay attention to which instruction sets Z here. `dec b` sets it — not
`ld (counter), a`, which never touches flags at all. `jp nz` reads whatever
`dec b` left. An `ld` between a comparison and a `jp` leaves the flags
unchanged; a `dec` replaces them entirely. Getting this wrong is one of the
most common sources of silent bugs in Z80 programs.

**Section D — logical operations.** A is loaded with `$F3` (`%11110011`), then
`and $0F` clears bits 7–4 and keeps bits 3–0. Result: `$03`. Z is clear.

`ld a, $03` reloads A — this resets A to a known value before the next
demonstration. `or $80` sets bit 7 of A regardless of what was already there.
`$03 | $80 = $83`. Z is clear.

`ld a, $FF` reloads A again. `xor $0F` flips bits 3–0. `$FF ^ $0F = $F0`.
Z is clear.

`xor a` computes A XOR A. Every bit cancels out — any bit XOR'd with itself is
always 0. A is zeroed, Z is set, C is cleared, in one instruction.

---

## Summary

- The Z, C, S, and P/V flags record the outcome of the last instruction that
  affected them. Most `ld` instructions do not affect flags; arithmetic,
  comparison, and logical instructions do.
- `sub n` subtracts n from A, stores the result in A, and updates flags. Z is
  set if the result is zero; C is set if A was less than n (unsigned borrow).
- `cp n` does the same subtraction and sets the same flags, but discards the
  result — A is unchanged. Use it when you only need the relationship, not the
  difference.
- `or a` sets Z if A is zero, without changing A. Use it to test A for zero
  without a comparison value.
- `and n` keeps bits where the mask has 1 (clears others); `or n` sets bits
  where the mask has 1; `xor n` toggles bits where the mask has 1. All three
  clear C and update Z.
- `xor a` zeroes A, sets Z, and clears C in one instruction. Prefer it over
  `ld a, 0` when you need a known flag state.
- `jp label` puts the address of `label` into PC; execution continues from
  there. The jump always happens — the flags are not consulted.
- `jp nz, label` jumps if Z is clear; `jp z, label` jumps if Z is set; `jp c`
  and `jp nc` test C. The full condition-code list is in Appendix 2.
- The condition on `jp cc` is what triggers the jump, not what runs the body.
  `jp nz, skip` jumps away when not-equal; what follows is the equal case.
- `jr` is a 2-byte relative jump, limited to roughly ±128 bytes and four
  conditions. Use it when the target is close; use `jp` otherwise.
- When a `jp` tests a flag, trace back to find which instruction set it.
  An `ld` between a comparison and a `jp` leaves the flags unchanged; `dec`
  and `inc` replace them. Getting this wrong produces silent wrong results.

---

[← Assembly Language](03-assembly-language.md) | [Part 1](README.md) | [Counting Loops and DJNZ →](05-counting-loops-and-djnz.md)
