[← Data Tables and Indexed Access](05-data-tables-and-indexed-access.md) | [Part 1](README.md) | [I/O and Ports →](07-io-and-ports.md)

# Chapter 06 — Stack and Subroutines

This chapter explains how `call` and `ret` work, how the hardware stack operates,
and how to write reusable subroutines that receive values through registers and
return results to the caller. After reading it you will be able to write a
subroutine, call it with values in registers, preserve the caller's registers
using `push` and `pop`, and return a result.

Prerequisites: Chapters 00–05 (registers, flags, `ld`, labels, DJNZ, tables).

---

## What a subroutine is

A subroutine is a block of instructions that can be called from multiple places
in a program. The caller executes `call address`, the CPU runs the subroutine,
and when the subroutine executes `ret`, control returns to the instruction
immediately after the `call`.

Without subroutines, a programmer who needs the same logic in three places must
copy those instructions to three locations and maintain three copies. With
subroutines, the instructions appear once and each caller reaches them with a
single `call`.

---

## How `call` works

`call label` does two things:

1. Pushes the address of the instruction following the `call` onto the hardware
   stack (this is the **return address**).
2. Jumps to `label`.

The hardware stack is a region of RAM used as a last-in-first-out buffer. The
stack pointer SP always holds the address of the most recently pushed value.
When `call` pushes a word onto the stack, SP decreases by two (the stack grows
downward in memory on the Z80). The return address is stored at the new SP.

After the `call`, the CPU is executing instructions inside the subroutine. The
subroutine does not know which call site reached it.

---

## How `ret` works

`ret` does the reverse:

1. Pops two bytes from the stack. That is the return address that `call` pushed.
2. Jumps to that address.

Execution resumes at the instruction after the original `call`. If `ret` runs
when the stack does not contain a valid return address — because of a push/pop
mismatch, for example — the CPU jumps to whatever bytes are at the top of the
stack, which is almost certainly not a valid instruction address.

---

## The hardware stack

The stack is a region of RAM. You decide where it lives by loading SP with a
starting address before the program uses any `call`, `push`, or `pop`
instructions. A common choice is the top of available RAM: `ld sp, $BFFF` (or
whichever address marks the last byte of RAM on your target).

The stack grows downward. Each push decreases SP by two and writes a 16-bit
value. Each pop reads two bytes and increases SP by two. The rule: SP always
points to the most recent data pushed.

A program that calls subroutines must have SP initialized to a valid address
before the first call. In ZAX's generic model, SP is assumed to be set up by the
loader or runtime before `main` is entered.

---

## Passing values through registers

The Z80 has no hardware-enforced calling convention. Any register can carry any
value into a subroutine or back out. The conventions used in these chapters
are:

- **A** carries a single byte result or input value.
- **HL** carries a 16-bit result or input value.
- **BC** and **DE** carry secondary input values.

The subroutine's comment block must document which registers it reads on entry
and which it modifies on exit. Without this documentation, the caller has no way
to know what registers are safe to use after the call.

Example documentation pattern:

```zax
; add_bytes: add two byte values.
; Inputs:  B = first byte, C = second byte
; Outputs: A = B + C
; Preserves: BC, DE, HL
func add_bytes(): AF
  ld a, b
  add a, c
end
```

The word `Preserves` means those registers hold the same values after the call
that they held before. The caller can rely on them being intact.

### The return clause tells ZAX which registers carry the result

A `func` declaration ends with a return clause that names the register or
registers that carry the result back to the caller. ZAX uses this to decide
which registers to save and restore around the function frame:

- **`func name(): void`** — no result; ZAX saves and restores AF, BC, DE, and
  HL. Any value placed in A inside the function is destroyed by the `pop AF`
  before `ret`.
- **`func name(): AF`** — A (and flags) hold the result; ZAX does NOT save or
  restore AF, so the value in A survives to the caller.
- **`func name(): HL`** — HL holds the result; AF, BC, and DE are saved and
  restored; HL is live on return.

### ZAX `func` blocks emit `ret` automatically

A ZAX `func` block does **not** require a final `ret`. When control reaches
`end`, the compiler emits the frame epilogue and `ret` automatically. Only use
`ret` inside a `func` for **early exits** — places in the function body where
you want to return before reaching `end`.

```zax
func my_sub(): AF
  ; ... compute result in A ...
  ; No explicit ret needed: ZAX emits ret at end.
end
```

This is different from raw labeled subroutines — code you reach with `call
label` but that is not wrapped in a ZAX `func`. Those are plain Z80: the
assembler inserts nothing, so they **do** require an explicit `ret`. Chapter 08
shows several such subroutines. In Chapters 09–11 you write ZAX `func` blocks
exclusively, and the compiler handles the return for you.

Declaring `: void` when the function leaves a meaningful value in A is a bug:
the compiler's `pop AF` in the epilogue will overwrite A before returning, and
the caller sees stale flag values rather than the computed result.

---

## `push` and `pop`: saving and restoring registers

`push bc` writes the current value of the register pair BC onto the stack
(two bytes, in the order that `pop bc` expects to recover them). SP decreases
by two.

`pop bc` reads two bytes from the stack and places them into BC. SP increases
by two.

A subroutine uses `push` / `pop` to preserve registers it needs to modify
internally. The pattern:

```zax
func example(): void
  push bc          ; save caller's BC on entry
  ; ... use BC for internal work ...
  pop bc           ; restore caller's BC before returning
end
```

The critical rule: every `push` in a subroutine must have exactly one matching
`pop` before the function returns. If a subroutine pushes twice and pops once,
the stack has an extra word on it when `ret` runs. `ret` will then read that
extra word as the return address and jump to garbage.

Stack depth discipline: count your pushes and pops. They must be balanced.

---

## Conditional return: `ret cc`

The Z80 also provides conditional return instructions: `ret z`, `ret nz`,
`ret c`, `ret nc`, and so on. `ret z` pops the return address and returns only
if Z is set; otherwise it falls through to the next instruction.

This is useful for early-exit patterns:

```zax
func check_nonzero(): void
  or a          ; test A for zero
  ret z         ; early exit: return immediately if A is zero
  ; ... rest of the function runs only when A != 0 ...
  ; No explicit ret needed at the end: ZAX emits it automatically.
end
```

`ret z` here is an **early exit** — it returns before `end` is reached.
ZAX still emits the epilogue and final `ret` at `end` for the normal path.

When using `ret cc`, the stack must be balanced at the conditional return point
just as it must be at the final return. If the function pushed a register before
the test, it must pop before `ret z` as well.

---

## Nested calls and stack depth

A subroutine can itself call another subroutine. Each `call` pushes another
return address; each `ret` pops one. As long as every call is matched with a
return, the stack remains balanced and execution returns correctly through each
level.

The only limit is the size of the RAM region allocated to the stack. A program
that calls too many levels deep (or forgets to pop before returning) will
overwrite RAM that the program uses for other purposes. On the Z80, there is no
hardware guard against stack overflow.

---

## The example: `learning/part1/examples/06_subroutines.zax`

```zax
section data vars at $8000
  result_add:  byte = 0
  result_max:  word = 0
end
```

The program has a `main` function and two helper subroutines.

**`add_bytes`: the simplest subroutine.**

```zax
func add_bytes(): AF
  ld a, b
  add a, c
end
```

`add_bytes` reads B and C, adds them, and leaves the result in A. The return
clause `: AF` tells ZAX that A carries the result, so AF is not saved and
restored — the computed sum in A reaches the caller intact. It modifies only A,
so BC, DE, and HL are naturally preserved. The caller (`main`) passes 20 in B
and 10 in C:

```zax
ld b, $14
ld c, $0A
call add_bytes        ; A = 30
ld (result_add), a
```

After the call, `result_add` holds 30 (`$1E`).

**`max_word`: push/pop for preservation.**

```zax
func max_word(): HL
  push de
  or a
  sbc hl, de
  pop de
  jr c, max_is_de
  add hl, de
  ret                ; early exit: HL holds the original HL (the larger value)
max_is_de:
  ex de, hl          ; HL < DE: put DE (the larger value) into HL
end
```

`max_word` receives two 16-bit values in HL and DE and returns the larger one in
HL. Because it returns a result in HL, its declaration is `func max_word(): HL`.
ZAX saves and restores AF, BC, and DE, but leaves HL live for the caller.

Internally the function uses `sbc hl, de` to compare HL with DE, which
overwrites HL. The original DE value is needed after the subtraction (to put
back into HL if DE was larger), so it is saved with `push de` at entry and
restored with `pop de` immediately after the subtract.

The `or a` before `sbc hl, de` clears the carry flag. `sbc hl, de` subtracts
DE from HL including the carry bit, so carry must be clear before the
instruction for a pure 16-bit subtraction.

After `sbc hl, de`, the carry flag indicates the comparison result:

- **Carry clear** — HL was greater than or equal to DE (no unsigned borrow).
  HL now holds `original_HL - DE`, which is not the result we want. `add hl, de`
  restores HL to its original value, and the function returns with that value.
- **Carry set** — HL was less than DE (unsigned borrow occurred). DE is the
  larger value. `ex de, hl` puts DE into HL and returns.

The `or a / sbc hl, de / add hl, de` restore pattern is the standard way to do
an unsigned 16-bit comparison in Z80 when you need the original HL after the
test. `sbc hl, de` is destructive; `add hl, de` undoes the subtraction when the
result was that HL was the larger value.

The caller passes 80 (`$0050`) in HL and 200 (`$00C8`) in DE:

```zax
ld hl, $0050
ld de, $00C8
call max_word         ; HL = $00C8
ld (result_max), hl
```

After the call, `result_max` holds 200.

**Stack balance in `max_word`.** The function has one `push de` and one `pop de`.
The pop occurs before `jr c, max_is_de`, which means DE is restored regardless
of which branch the conditional takes. The stack is clean for both `ret`
paths.

---

## Summary

- `call label` pushes the return address onto the stack and jumps to `label`.
- `ret` pops the return address and jumps to it, returning to the call site.
- The hardware stack is a region of RAM. SP points to the most recently pushed
  word; the stack grows downward.
- Pass values into a subroutine in registers: A for a single byte, HL for a
  16-bit word, BC and DE for secondary values. Document which registers carry
  inputs and which carry outputs.
- `push rr` saves a register pair; `pop rr` restores it. Every push must have
  a matching pop before the function returns.
- Unbalanced push/pop causes `ret` to jump to garbage, because the wrong bytes
  are at the top of the stack when `ret` reads the return address.
- `ret cc` returns conditionally; the stack must be balanced at that point too.
- Subroutines can call other subroutines. Each call pushes a return address;
  each ret pops one. The stack depth grows with each nested call.
- A ZAX `func` block emits the cleanup and `ret` automatically at `end`. A
  trailing `ret` is not needed. Use `ret` inside a `func` only for early exits.
  Raw labeled subroutines — code reached by `call label` outside a ZAX `func`
  — are plain Z80 and do require an explicit `ret`.

## What Comes Next

Chapter 08 builds a complete program using everything from Chapters 00–06
together, then shows the points where raw Z80 starts to get unwieldy — the
same points that Chapters 09–11 address.

---

[← Data Tables and Indexed Access](05-data-tables-and-indexed-access.md) | [Part 1](README.md) | [I/O and Ports →](07-io-and-ports.md)
