[← Typed Assignment](13-typed-assignment.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)

# Chapter 14 — Op Macros and Pseudo-opcodes

Some operations recur constantly: saving a register pair to a temp location, swapping two values, doing a 16-bit arithmetic step the Z80 has no direct opcode for. Each time, you write the same two or three instructions. The code is correct, but the repetition hides the intent — a reader sees the mechanics, not the purpose.

`op` names a short instruction sequence and expands it inline at every call site, with no `call`, no frame, and no `ret`. The ZAX pseudo-opcodes go further: they let you write `ld hl, de` as if the Z80 had a 16-bit register copy instruction, even though it doesn't. This chapter covers both.

---

## `op`: inline named operations

`op` defines a named operation whose body is pasted into the instruction stream at every call site — no `call`, no frame, no `ret` — as if you had written the instructions there yourself.

```zax
op load_and_or(src: reg8)
  ld a, src
  or a
end
```

Every invocation of `load_and_or B` expands to:

```asm
ld a, b
or a
```

The "copy B into A and set flags" pattern appears before every `while NZ` loop and at every back edge. Without the op, you write those two instructions by hand in every place. With the op, you write them once in the declaration and once at each invocation. You see `load_and_or B` and know immediately what instruction pair will appear.

**`reg8` parameters accept only physical register names.** At the call site, a `reg8` parameter must be one of the seven physical registers: A, B, C, D, E, H, or L. A frame-slot name like `len` is not valid — the compiler substitutes the register token directly into the body instruction, and that substitution only makes sense if the operand is a register. If the value lives in a frame slot, load it into a register first:

```zax
ld b, (ix+len+0)      ; load frame slot into B
load_and_or B          ; B is a physical register — valid
```

Or, if you have introduced `:=`:

```zax
b := len               ; load frame slot into B
load_and_or B
```

---

## All matcher types

`reg8` is the most common matcher, but it is only one of several. The full set
lets you match register pairs, immediate values, memory operands, and storage
references.

**Register matchers**

`reg8` matches any of the seven physical byte registers: `A B C D E H L`.

`reg16` matches any of the four register pairs: `HL DE BC SP`. Use this when
the op body needs a 16-bit register as a unit.

```zax
op zero16(dst: reg16)
  ld dst, 0
end

zero16 HL   ; expands to: ld hl, 0
zero16 DE   ; expands to: ld de, 0
```

**Fixed-register matchers**

A parameter can be constrained to a single register by naming it directly:
`A`, `HL`, `DE`, `BC`. These are useful when the op body only makes sense for
one specific register.

```zax
op negate_a(dst: A)
  cpl
  inc a
end
```

The compiler uses fixed-register matchers for overload resolution — a
fixed-register overload wins over a class overload (`reg8`, `reg16`) when the
call site provides that exact register. This is explained in the overloading
section below.

**Immediate matchers**

`imm8` matches a compile-time expression that fits in a single byte (0–255).
`imm16` matches any compile-time expression that fits in 16 bits. The compiler
substitutes the value directly into the body.

```zax
op load_const(dst: reg8, val: imm8)
  ld dst, val
end

load_const A, 42    ; expands to: ld a, 42
load_const B, $FF   ; expands to: ld b, $FF
```

`imm8` is more specific than `imm16` for values that fit in 8 bits, so an
overload with `imm8` wins over one with `imm16` when the call provides a small
constant.

**Storage-reference and memory matchers**

`ea` matches a storage-reference expression — a named variable, a record field,
an array element, or an address arithmetic expression. The parameter substitutes
the storage address, not the stored value.

`mem8` and `mem16` match a memory-dereference operand written with parentheses:
`(ea)`. They substitute the full dereference, parentheses included. `mem8` is
for byte-wide access; `mem16` is for word-wide access. Both are more specific
than `ea`.

```zax
op load_byte(src: mem8)
  ld a, src    ; src includes parentheses: ld a, (hero.flags)
end

load_byte (hero.flags)
load_byte (hl)
```

When an `ea` operand is provided, the op body decides whether to treat it as an
address or dereference it. When a `mem8` or `mem16` operand is provided, the
parentheses are part of the substitution.

---

## Op overloading

One `op` name can have multiple declarations with different parameter signatures.
The compiler picks the best match at each call site.

```zax
op transfer(dst: reg16, src: reg16)
  ld d, h
  ld e, l
end

op transfer(dst: HL, src: reg16)
  ; HL is already the destination register pair
  ld h, src_hi      ; illustrative — real body depends on src
  ld l, src_lo
end
```

Overloads are resolved by specificity. A fixed-register match beats a class
match. If the call is `transfer HL, DE`, the second overload wins because `HL`
is more specific than `reg16`. If the call is `transfer BC, DE`, the first
overload wins because `BC` is not `HL`.

You can use overloading to provide a fast path for the most common case while
keeping a general path for everything else:

```zax
op push_word(src: HL)
  push hl
end

op push_word(src: reg16)
  push src
end

push_word HL    ; fast path: push hl
push_word DE    ; general: push de
```

Two rules the compiler enforces: if no overload matches the call, compilation
fails. If two overloads match equally — neither is more specific than the other
— compilation fails with an ambiguity error. You must ensure your overload set
has a unique best match for every call pattern you intend to use.

**Specificity ranking (from most to least specific):**

1. Fixed-register match (e.g., `A`, `HL`)
2. Class match (`reg8`, `reg16`, `imm8`, `mem8`, `mem16`)
3. Wider class match (`imm16`, `ea`)

`imm8` beats `imm16` when the value fits in 8 bits. `mem8`/`mem16` beat `ea`.

---

## When to use `op` vs `func`

The decision is practical, and a few concrete rules cover most cases.

Use `op` when:

- a short sequence of instructions repeats mechanically
- the expansion is small enough that call overhead would dominate the cost
- you want accumulator-style or register-pair operations that read like opcodes
- no frame slot allocation is needed (ops cannot have `var` blocks)

Use `func` when:

- the function is long enough that a `call`/`ret` pair is not the dominant cost
- the function needs typed local variables
- the function is called from many places and you want the compiler to enforce the calling convention
- a consistent register-preservation boundary at the call site matters

An `op` is pasted at every call site. If your `op` body is ten instructions long and you invoke it eight times, the binary contains eighty instructions — the same ten copied eight times. For a two- or three-instruction op this is correct and desirable; for something longer it is expensive. If you find yourself writing an `op` with more than five instructions, consider whether a `func` call would cost less in binary size than the repeated inlining.

A ZAX `func` with a frame emits six overhead instructions — the prologue and epilogue — before and after the body. If the body itself is two or three instructions, the overhead is two to three times the cost of the work being done. For a short accumulator operation you will call in a tight loop, that overhead compounds. Use `op` when the body is shorter than the frame overhead; use `func` when the body is long enough that the overhead is negligible.

`op` bodies have no preservation boundary of their own. Registers clobbered by an `op` body are clobbered in the caller's instruction stream, exactly as if you had written those instructions there yourself. A `func` call preserves all registers not in the return clause — the compiler generates the save/restore sequence.

---

## ZAX pseudo-opcodes: synthetic 16-bit register moves

Copying HL into DE in raw Z80 takes two 8-bit moves:

```zax
ld d, h
ld e, l
```

ZAX removes this chore. You can write the 16-bit form directly:

```zax
ld hl, de       ; ZAX expands to: ld h, d / ld l, e
ld de, hl       ; ZAX expands to: ld d, h / ld e, l
```

The assembler emits the two-instruction sequence automatically. No new opcode is invented — the output is exactly the same pair of 8-bit moves. The pseudo-opcode exists to make the intent visible at a glance.

The full set of synthetic 16-bit register transfers:

| Pseudo-opcode | Expands to            |
| ------------- | --------------------- |
| `ld hl, de`   | `ld h, d` / `ld l, e` |
| `ld hl, bc`   | `ld h, b` / `ld l, c` |
| `ld de, hl`   | `ld d, h` / `ld e, l` |
| `ld de, bc`   | `ld d, b` / `ld e, c` |
| `ld bc, hl`   | `ld b, h` / `ld c, l` |
| `ld bc, de`   | `ld b, d` / `ld c, e` |

Each expands to two one-byte instructions — the same two `ld` moves you would write by hand. ZAX adds nothing at run time.

---

## Summary

- `op` defines an inline expansion — no call, no frame, no `ret`. The body is pasted at each invocation.
- Matcher types for `op` parameters: `reg8` (A–L), `reg16` (HL/DE/BC/SP),
  fixed-register (`A`, `HL`, `DE`, `BC`), `imm8`, `imm16`, `ea`, `mem8`,
  `mem16`. Each constrains what the call site may supply.
- `reg8` and `reg16` parameters accept only physical register names at the call
  site. Load frame slots into registers first.
- One `op` name can have multiple overloads with different parameter signatures.
  The compiler selects the best match by specificity. Fixed-register matchers
  beat class matchers; `imm8` beats `imm16` for small values; `mem8`/`mem16`
  beat `ea`. Ambiguous or unmatched calls are compile errors.
- Use `op` for short repeating patterns. Use `func` for anything that benefits from a clean call boundary and typed parameters.
- ZAX pseudo-opcodes — `ld hl, de`, `ld de, bc`, and the other four pair-to-pair combinations — expand to two 8-bit moves with no run-time cost.

---

## Exercises

**1. Write an `op`.** The pattern `ld a, b / or a` (or with any 8-bit register) appears before every `while NZ` loop in the structured code. Define an `op` called `test_reg` with a `reg8` parameter that expands to the two-instruction sequence. Then write the invocations needed before these two loops:

```zax
; Loop driven by B
while NZ
  ; ...
  dec b
end

; Loop driven by C
while NZ
  ; ...
  dec c
end
```

**2. `op` vs `func` cost comparison.** You have a six-instruction sequence you need to use in five places in your program. Compare the total instruction count in the binary for each approach: (a) a `func` call — include the six instructions plus the `call`, `ret`, and frame overhead; (b) an `op` — include the six instructions repeated at all five call sites. Which produces fewer total instructions? At what body length would the two approaches produce the same total instruction count? _(Assume frameless function: 2 overhead instructions — `call` and `ret`.)_

**3. Overload resolution.** Given these two `op` declarations:

```zax
op clr(dst: reg16)
  ld dst, 0
end

op clr(dst: HL)
  ld hl, 0
end
```

State which overload the compiler selects for each of these call sites, and why:

```zax
clr HL    ; which overload?
clr DE    ; which overload?
clr BC    ; which overload?
```

Now add a third overload `op clr(dst: DE)` and state what happens when you call `clr DE`.

**4. Pseudo-opcode expansion.** Write the exact raw Z80 instruction pair that each pseudo-opcode expands to, and explain why ZAX provides these but does not provide, say, `ld hl, af`:

```zax
ld hl, de
ld de, bc
ld bc, hl
```

---

## Part 1 complete

You have completed Volume 1.

By this point you can:

- write a complete function that scans a table of bytes, makes comparisons, and returns a result — with typed parameters, a counting loop, and a frame-managed local for the running total
- write a hardware polling routine that reads a status port, waits on a specific bit, and acts when the device signals ready
- structure a multi-function program with named data sections, typed storage, and control flow that reads like the algorithm it implements

**Volume 2: `learning/part2/`**

The algorithms course (`learning/part2/README.md`) is the second stage. It assumes everything from Part 1 and uses it from the first chapter.

Volume 2 covers the constructs and patterns needed for larger programs:

- **Arrays and indexing** — typed arrays in `section data`, indexed with register operands
- **Records** — struct-like types, field access, `sizeof` and `offsetof`
- **Strings** — null-terminated byte arrays, sentinel traversal
- **Recursion** — recursive calls, the IX frame per call level
- **Modules and `import`** — splitting programs across files
- **Pointer structures** — typed reinterpretation, linked lists, trees

You have built this understanding from first principles. Part 2 assumes it and moves forward from there.

---

[← Typed Assignment](13-typed-assignment.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)
