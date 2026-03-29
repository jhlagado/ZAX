[← Typed Assignment](12-typed-assignment.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)

# Chapter 13 — Op Macros and Pseudo-opcodes

This chapter covers two features that extend the Z80's native instruction set without adding run-time cost: `op`, which lets you name a short instruction sequence and expand it inline at every call site, and the ZAX pseudo-opcodes, which let you write `ld hl, de` as if the Z80 had a 16-bit register copy instruction.

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

## When to use `op` vs `func`

Here is how I decide between the two.

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

| Pseudo-opcode | Expands to |
|---------------|------------|
| `ld hl, de` | `ld h, d` / `ld l, e` |
| `ld hl, bc` | `ld h, b` / `ld l, c` |
| `ld de, hl` | `ld d, h` / `ld e, l` |
| `ld de, bc` | `ld d, b` / `ld e, c` |
| `ld bc, hl` | `ld b, h` / `ld c, l` |
| `ld bc, de` | `ld b, d` / `ld c, e` |

Each expands to two one-byte instructions — the same two `ld` moves you would write by hand. ZAX adds nothing at run time.

---

## Summary

- `op` defines an inline expansion — no call, no frame, no `ret`. The body is pasted at each invocation.
- `op` parameters typed `reg8` accept only physical register names at the call site. Load frame slots into registers first.
- Use `op` for short repeating patterns. Use `func` for anything that benefits from a clean call boundary and typed parameters.
- ZAX pseudo-opcodes — `ld hl, de`, `ld de, bc`, and the other four pair-to-pair combinations — expand to two 8-bit moves with no run-time cost.

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

You are ready.

---

[← Typed Assignment](12-typed-assignment.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)
