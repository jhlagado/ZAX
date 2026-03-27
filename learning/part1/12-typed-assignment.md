[← Structured Control Flow](11-structured-control-flow.md) | [Part 1](README.md) | [Op Macros and Pseudo-opcodes →](13-op-macros-and-pseudo-opcodes.md)

# Chapter 12 — Typed Assignment

You have spent two chapters writing `ld a, (ix+running_max+0)` and `ld (ix+cnt+0), a` by hand. You know what each frame access costs, you know where the offsets come from, and you know the low-byte / high-byte drill for word-sized slots. This chapter introduces `:=`, the typed assignment operator, which automates all of that — shorthand for what you already do.

The companion example is `learning/part1/examples/11_functions_and_op.zax`.

---

## `:=` as the assignment surface

`:=` reads a value from the right-hand side and stores it into the left-hand side. The destination is on the left, the source on the right — the same direction as `ld destination, source`:

```zax
count := a      ; store A into the typed local 'count'
a := count      ; load the value of 'count' into A
hl := total     ; load the 16-bit value of 'total' into HL
total := hl     ; store HL into 'total'
```

`ld` is a raw Z80 instruction — you choose the operand form and the assembler encodes it exactly as written. `:=` is a typed assignment: the compiler checks that the left side is writable storage, checks that the right side is a compatible value, and emits whatever instruction sequence is needed.

For a byte-sized local, `count := a` emits a single `ld (ix-N), a` — exactly what you wrote by hand in Chapters 10 and 11.

For a word-sized local, the story is different. The Z80 cannot load HL directly from an IX-relative address. So when you write `hl := total`, the compiler emits:

```asm
ex de, hl
ld e, (ix-4)
ld d, (ix-3)
ex de, hl
```

It saves HL into DE, loads the word into DE using byte-lane access, then swaps back. The result is HL = total, with DE preserved. You could write this sequence yourself — you now know exactly how — but with `:=` you do not have to.

---

## Bare-name access vs address dereference

ZAX distinguishes two forms: the bare name means "the typed value at this location" and `(name)` means "memory at this address." With `:=`, always use the bare form for typed locals. Typed locals live at IX-relative offsets, not at fixed absolute addresses — the dereference form `(count)` would mean "memory at the address value stored in the count slot," which is not the same thing.

---

## `step`

`step path` increments a typed scalar in place by one. `step path, amount` adds a signed compile-time integer to it:

```zax
step count           ; count := count + 1
step count, -1       ; count := count - 1
step count, 5        ; count := count + 5
```

The amount, when given, must be a constant the compiler can evaluate — a literal or a named `const`. `step` returns no value and does not set flags reliably; it is a pure mutation of the named location.

In Chapter 11, you incremented a counter by hand:

```zax
ld a, (ix+cnt+0)
inc a
ld (ix+cnt+0), a
```

`step cnt` does the same thing in one line. Named constants work as the amount, which is useful when the step size has a name worth giving:

```zax
const STRIDE = 4
step cursor, STRIDE     ; cursor := cursor + 4
```

---

## Before and after: the same two loops

Here are the `find_max` and `count_above` functions rewritten with `:=` and `step`, so you can compare them with the raw IX versions from Chapters 10 and 11.

**`find_max` — raw IX (Chapter 10):**

```zax
  ld a, (hl)
  cp (ix+running_max+0)
  jr c, find_max_skip
  ld (ix+running_max+0), a
find_max_skip:
  inc hl
  djnz find_max_loop
  ld a, (ix+running_max+0)
```

**`find_max` — with `:=`:**

```zax
  ld a, (hl)
  cp running_max
  jr c, find_max_skip
  running_max := a
find_max_skip:
  inc hl
  djnz find_max_loop
  a := running_max
```

The generated code is identical. `running_max := a` emits `ld (ix-N), a`. `a := running_max` emits `ld a, (ix-N)`. The names resolve to the same offsets. The `:=` form is easier to read.

**`count_above` — raw IX (Chapter 10):**

```zax
  ld a, (ix+cnt+0)
  inc a
  ld (ix+cnt+0), a
```

**`count_above` — with `step`:**

```zax
  step cnt
```

One line instead of three. Same effect.

---

## Raw Z80 instructions can still use typed names

`:=` does not replace raw Z80 instructions — it complements them. In the typed version of `find_max`, `cp running_max` uses the typed name as an operand to a raw Z80 instruction. The compiler recognises the name and emits `cp (ix-N)`. This is not a `:=` assignment; it is a raw `cp` with a compiler-resolved operand.

You can freely mix raw instructions and `:=` in the same function. Use `:=` for loads and stores to frame slots. Use raw instructions for arithmetic, comparisons, and anything that does not have a `:=` equivalent.

---

## When to use `:=` vs raw IX access

Use `:=` when you want the compiler to handle the register selection and multi-instruction sequences — especially for word-sized locals.

Use raw `ld a, (ix+name+0)` when you need precise control: choosing which register gets the value, accessing a specific byte lane of a word slot, or when the context makes the raw form clearer.

Both are always available. Neither is required. The choice is about clarity for the reader, not correctness for the compiler.

---

## Summary

- `:=` assigns from right to left. The compiler checks types and emits the correct instruction sequence.
- For byte locals, `:=` emits a single `ld (ix±d), reg` or `ld reg, (ix±d)` — the same instruction you would write by hand.
- For word locals, `:=` emits a multi-instruction sequence using DE as an intermediate and `ex de, hl` to preserve registers.
- `step path` increments a typed scalar by one. `step path, amount` adds any signed compile-time integer. Both replace the three-instruction load-modify-store pattern.
- Use bare names with `:=` for typed locals. Do not use `(name)` — that means something different.
- Raw Z80 instructions can still use typed names as operands. The compiler resolves them to IX-relative offsets.
- `:=` and raw access are complementary. Use whichever is clearest.

---

[← Structured Control Flow](11-structured-control-flow.md) | [Part 1](README.md) | [Op Macros and Pseudo-opcodes →](13-op-macros-and-pseudo-opcodes.md)
