[← Structured Control Flow](12-structured-control-flow.md) | [Part 1](README.md) | [Op Macros and Pseudo-opcodes →](14-op-macros-and-pseudo-opcodes.md)

# Chapter 13 — Typed Assignment

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

For a byte-sized local, `count := a` emits a single `ld (ix-N), a` — exactly what you wrote by hand in Chapters 11 and 12.

For a word-sized local, the story is different. The Z80 cannot load HL directly from an IX-relative address. So when you write `hl := total`, the compiler emits:

```asm
ex de, hl
ld e, (ix-4)
ld d, (ix-3)
ex de, hl
```

It saves HL into DE, loads the word into DE using byte-lane access, then swaps back. The result is HL = total, with DE preserved. The old value of HL is gone — if you need it after this point, push HL before the assignment. You could write this sequence yourself — you now know exactly how — but with `:=` you do not have to.

---

## All supported assignment directions

`:=` moves data between a typed frame slot and a register. The direction is determined by which side the slot name appears on.

**Byte slots** — one `ld` instruction each:

`count := a` stores A into a byte slot. Any 8-bit register works on the right: `count := b`, `count := c`, and so on.

```zax
count := a      ; ld (ix-N), a
```

`a := count` loads a byte slot into A. Any 8-bit register works on the left: `b := count`, `c := count`, and so on.

```zax
a := count      ; ld a, (ix-N)
```

**Word slots with HL** — four instructions each:

The Z80 has no IX-relative 16-bit store, so `:=` routes the value through DE. `ptr := hl` stores HL into a word slot:

```zax
ptr := hl       ; ex de,hl / ld (ix-N),e / ld (ix-N+1),d / ex de,hl
```

`hl := ptr` loads a word slot into HL by the same sequence in reverse:

```zax
hl := ptr       ; ex de,hl / ld e,(ix-N) / ld d,(ix-N+1) / ex de,hl
```

**Word slots with DE** — two instructions each:

DE does not need an intermediate, so the transfer is a direct byte-lane pair. `total := de` stores DE into a word slot:

```zax
total := de     ; ld (ix-N),e / ld (ix-N+1),d
```

`de := total` loads a word slot into DE:

```zax
de := total     ; ld e,(ix-N) / ld d,(ix-N+1)
```

The DE forms follow from the supported register list but are not demonstrated in the companion example. The HL forms are what the examples show.

---

## What the type check prevents

`:=` checks that left and right sides have compatible widths. The check fires when both sides are typed storage paths. Writing a byte-typed local into a word-typed local is a compile error:

```zax
total := count  ; error: ":=" path-to-path transfer requires compatible scalar widths; got word and byte.
```

The compiler knows `total` is a `word` slot and `count` is a `byte` slot — that knowledge comes from the `:` declarations in `var`. The error fires before any code is emitted.

The same check rejects the reverse: `count := total` fails with `got byte and word`. Reading a word slot into a byte register, or writing a word-width register into a byte slot, is also rejected. Use the matching register width, or read the byte lane you need with a raw `ld` instruction.

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

In Chapter 12, you incremented a counter by hand:

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

Here are the `find_max` and `count_above` functions rewritten with `:=` and `step`, so you can compare them with the raw IX versions from Chapters 11 and 12.

**`find_max` — raw IX (Chapter 11):**

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

**`count_above` — raw IX (Chapter 11):**

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

**`advance` — word result returned via HL:**

This function computes a new address from a base and a count, stores it as a typed local, then returns it via HL. The final `hl := result` is the pattern for handing a word value back to the caller.

```zax
func advance(base: addr, n: byte): HL
  var
    result: addr
  end
  hl := base             ; load address parameter into HL
  ld b, 0
  c := n                 ; load count byte into C
  add hl, bc             ; HL = base + n
  result := hl           ; store the computed address into a typed local
  hl := result           ; retrieve it into HL for return
end
```

`hl := result` at the exit is what makes the return typed: the compiler emits the four-instruction DE-intermediate sequence to load the word slot into HL. The function is declared `: HL`, so HL is the live return value when `end` is reached.

---

## Raw Z80 instructions can still use typed names

The `find_max` above uses all three layers at once. The IX frame — declared once in the function header — gives every parameter and local a stable name that survives the entire call. The `jr c` and `djnz` control the loop; `:=` handles the running maximum load and store. Each layer does one job; none of them duplicate the others.

`:=` does not replace raw Z80 instructions — it complements them. In the typed version of `find_max`, `cp running_max` uses the typed name as an operand to a raw Z80 instruction. The compiler recognises the name and emits `cp (ix-N)`. This is not a `:=` assignment; it is a raw `cp` with a compiler-resolved operand.

You can freely mix raw instructions and `:=` in the same function. Use `:=` for loads and stores to frame slots. Use raw instructions for arithmetic, comparisons, and anything that does not have a `:=` equivalent.

---

## When to use `:=` vs raw IX access

Use `:=` when you want the compiler to handle the register selection and multi-instruction sequences — especially for word-sized locals.

Use raw `ld a, (ix+name+0)` when you need precise control: choosing which register gets the value, accessing a specific byte lane of a word slot, or when the context makes the raw form clearer.

Both are always available. Neither is required. The choice is about what reads most clearly — the compiler accepts either.

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

## Exercises

**1. Expand `:=` by hand.** Write out the exact Z80 instruction sequence that the compiler emits for each of these `:=` statements. Give the numeric IX offset for each slot, assuming `total` is a `word` local at offset −4 (low byte at IX−4, high byte at IX−3) and `count` is a `byte` local at offset −1.

```zax
count := a          ; (a)
a := count          ; (b)
total := hl         ; (c)
hl := total         ; (d)
step count          ; (e)
```

**2. Type mismatch.** Explain why each of these `:=` statements is a compile error. State what type conflict the compiler detects and what you would need to change to make each line legal:

```zax
total := count      ; total is word, count is byte
count := total      ; count is byte, total is word
```

For each case, write the corrected form that compiles — either using a different register to bridge the width or accessing only the byte lane you need.

**3. Rewrite with `:=`.** Here is a raw-IX function body from Chapter 11. Rewrite it using `:=` and `step` where appropriate, keeping raw Z80 instructions for operations that have no `:=` equivalent:

```zax
  ld l, (ix+tbl+0)
  ld h, (ix+tbl+1)
  ld b, (ix+len+0)
count_loop:
  ld a, (hl)
  cp (ix+threshold+0)
  jr c, count_skip
  jr z, count_skip
  ld a, (ix+cnt+0)
  inc a
  ld (ix+cnt+0), a
count_skip:
  inc hl
  djnz count_loop
  ld a, (ix+cnt+0)
```

**4. Bare name vs dereference.** A function has a local declared as `var ptr: addr = 0 end`. Explain the difference between these two forms and what instruction each generates:

```zax
hl := ptr           ; (a)
ld hl, (ptr)        ; (b)
```

Which form gives you the address stored in the local variable `ptr`? Which form treats `ptr` as if it were a fixed absolute address in memory? When would form (b) cause a silent bug?

---

[← Structured Control Flow](12-structured-control-flow.md) | [Part 1](README.md) | [Op Macros and Pseudo-opcodes →](14-op-macros-and-pseudo-opcodes.md)
