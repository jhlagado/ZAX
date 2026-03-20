[← Numbers and Registers](01-numbers-and-registers.md) | [Part 2](README.md) | [Flags, Comparisons, Jumps →](03-flags-comparisons-jumps.md)

# Chapter 02 — Loading, Storing, and Simple Constants

This chapter covers the four addressing modes of `ld` you will use in every
program, shows how labels name memory addresses, and demonstrates EQU-style
constants and named storage. After reading it you will be able to load an
immediate value, read from and write to a named memory location, and read
through a register pair used as a pointer.

Prerequisites: Chapters 00–01 (bytes, addresses, register pairs, module shell).

---

## The `ld` instruction

`ld` moves a value from one place to another. The destination is always on the
left and the source is on the right:

```
ld  destination, source
```

`ld` never performs arithmetic; it only copies. The source value is placed in
the destination unchanged.

The four source/destination combinations you will use most often are:

1. **Immediate**: the value is a literal number in the instruction.
2. **Register to register**: copy from one register to another.
3. **Indirect through HL**: read or write the byte at the address in HL.
4. **Direct address**: read or write a fixed memory address by name.

---

## Immediate mode

`ld a, $42` loads the value `$42` into A. The assembler encodes `$42` directly
into the instruction bytes. No memory read happens at run time.

`ld hl, $8000` loads the 16-bit value `$8000` into the register pair HL. The
high byte `$80` goes to H and the low byte `$00` goes to L.

Immediate loads are the first instructions a program uses to establish known
values before doing any work.

---

## Register-to-register mode

`ld b, a` copies the current value of A into B. Neither operand is a memory
address; both are register names. No memory access is involved.

Any pair of the 8-bit registers A, B, C, D, E, H, L can be combined:
`ld d, h`, `ld l, c`, and so on. You cannot use `ld reg, reg` to copy between
register pairs directly; you must copy the high and low bytes separately, as
shown in Chapter 01.

---

## Indirect mode through (HL)

`ld a, (hl)` reads the byte from the memory address currently in HL and places
it in A. The parentheses mean "the memory location whose address is the value
inside the parentheses."

`ld (hl), a` writes the value of A to the memory address in HL.

To use this form, you first load an address into HL, then use `(hl)` to access
that location:

```zax
ld hl, $8000   ; HL = address $8000
ld a, (hl)     ; A = byte at address $8000
```

Changing HL and repeating `ld a, (hl)` reads from a different address. This is
how loops read through consecutive bytes in memory — load an address into HL,
read, increment HL, repeat.

---

## Direct address mode

`ld a, ($8000)` reads the byte at the fixed address `$8000` and places it in A.
`ld ($8000), a` writes A to that address.

The 16-bit form `ld hl, ($8000)` reads a word (two bytes) from address `$8000`
and `$8001` and places the result in HL.

The parentheses always mean **memory dereference**: treat the value inside as
an address and read or write the byte (or word) at that location. This is the
same meaning as `(hl)` — the parens signal "go to this address in memory."

Writing bare numbers like `$8000` in instructions is inconvenient and error-
prone. If the address appears in ten instructions and you later move the storage
to `$8100`, you must change all ten. Labels solve this.

---

## Labels as named addresses

A **label** is a name the assembler binds to an address. When you reference a
label in an instruction operand, the assembler substitutes the address at that
label's location.

In ZAX, labels inside function bodies are defined by writing `labelname:` at the
start of an instruction line. Labels can also refer to storage locations declared
in data sections.

Consider this data section:

```zax
section data vars at $8000
  count: byte = 0
end
```

The assembler places one byte at address `$8000` and records that the name
`count` refers to typed scalar storage at `$8000`. Every instruction that
mentions `count` will use that storage. If the section is later moved to
`$9000`, all those instructions update automatically.

**The bare-name form is the standard way to access named scalar storage in
ZAX.** `ld a, count` reads the value of `count` into A. `ld count, a` (or the
store form, depending on the instruction) writes A to `count`. The name
directly refers to the typed storage value — no extra notation is needed.

`ld a, (count)` is the **explicit memory dereference** form. The parentheses
mean "treat `count` as a memory address and load the byte at that address." For
typed scalar storage this produces the same result as the bare form, but the
meaning is subtly different: bare name = the stored value; `(name)` = memory at
that address. Prefer the bare form for named scalar reads and writes.

---

## EQU-style constants

A constant is a name for a fixed value that has no address of its own. In ZAX,
constants are declared with `const`:

```zax
const MaxCount  = 10
const BaseAddr  = $8000
```

The assembler substitutes the value everywhere the name is used. `ld a, MaxCount`
becomes `ld a, 10` in the emitted code. `ld hl, BaseAddr` becomes
`ld hl, $8000`.

Constants are purely a compile-time feature. They produce no bytes in the output
binary and occupy no memory at run time.

The difference between a constant and a label is that a constant is a value
you write down — `10`, `$8000` — while a label is the assembler-computed address
of something in the output. A label for a data byte is also an address, but you
did not write the address down; the assembler computed it from the section
placement.

---

## Bare name vs parentheses: the rule stated once

Three different things can appear as a `ld` operand, and the notation
distinguishes them:

| Notation | What it means |
|----------|---------------|
| `ld a, MaxCount` | `MaxCount` is a `const`: the assembler substitutes the value directly. No memory access. |
| `ld a, count` | `count` is a named scalar storage location: read the typed value stored there. |
| `ld a, (count)` | Explicit memory dereference: read the byte at the address that `count` labels. |

The rule: **parentheses always mean "treat this as a memory address and
dereference it."** A `const` name without parens is substituted as a value.
A storage name without parens reads or writes the typed scalar value at that
location. Only when you specifically want to express "go to this address in
memory" do you write parentheses.

For named scalar storage (`byte`, `word`), the bare form and the paren form
produce the same machine code — the difference is in how you reason about the
code. Use the bare form as your default; reach for `(name)` only when you are
deliberately working at the address level.

---

## Named byte and word storage

The `section data` block declares named storage at a specific address. You can
declare bytes and words:

```zax
section data vars at $8000
  count:   byte = 0
  scratch: word = 0
end
```

The assembler places `count` at `$8000` (one byte, initial value 0) and
`scratch` at `$8001` (two bytes, initial value 0).

Reading and writing named byte storage with the bare form:

```zax
ld a, count       ; A = value of count
ld count, a       ; count = A  (store form)
```

Reading and writing named word storage with the bare form:

```zax
ld hl, $1234
ld scratch, hl    ; scratch = $1234

ld hl, scratch    ; HL = $1234 (read back)
```

The same operations written with explicit dereference:

```zax
ld hl, $1234
ld (scratch), hl  ; identical effect — (scratch) dereferences the address

ld hl, (scratch)  ; identical effect
```

Both forms are legal; the bare form is preferred for typed scalar storage.

---

## The example: `learning/part1/examples/02_constants_and_labels.zax`

```zax
const MaxCount  = 10
const BaseAddr  = $8000

section data vars at $8000
  count:   byte = 0
  scratch: word = 0
end

export func main(): void
  ld a, MaxCount
  ld count, a

  ld hl, BaseAddr
  ld a, (hl)

  ld hl, $1234
  ld scratch, hl

  ld hl, scratch
end
```

`ld a, MaxCount` uses immediate mode with a named constant. The assembler
substitutes the value `10` directly. After this instruction, A = 10.

`ld count, a` uses the bare-name form to store A into the typed scalar storage
`count`. After this instruction, `count` holds 10.

`ld hl, BaseAddr` loads the constant value `$8000` into HL. Notice that
`BaseAddr` and the address of `count` are the same value — `$8000`. This is
intentional: the next instruction uses HL as a pointer to that address.

`ld a, (hl)` uses indirect mode through HL. The parentheses here are the
explicit memory dereference: since HL holds `$8000`, this reads the byte at
address `$8000` — the same byte `count` names. After this instruction, A = 10
again. This demonstrates why `(hl)` needs parens: HL holds an address, and we
are dereferencing it.

`ld scratch, hl` uses the bare-name form to store the word in HL into `scratch`.
`ld hl, scratch` reads it back. Both use the bare form because `scratch` is a
named typed storage location.

---

## Exchanging register pairs

`ex de, hl` swaps the contents of DE and HL in a single instruction. After it
executes, the old value of HL is in DE and the old value of DE is in HL.

It is worth being precise about what "swap" means here versus a one-way copy.

A one-way copy from HL into DE takes two instructions and leaves HL unchanged:

```zax
; One-way copy: HL -> DE (two instructions, HL still holds its old value)
ld d, h
ld e, l
; DE now holds old HL; HL is unchanged
```

This works if you only need HL's value in DE and no longer care about DE's old
value. But if you need to truly exchange the two — so that DE gets HL's value
and HL gets DE's old value simultaneously — you must save one of them first.
Using A as scratch, that is six instructions:

```zax
; True swap without ex de, hl: six instructions, A used as scratch
ld a, h
ld h, d
ld d, a     ; D now holds old H
ld a, l
ld l, e
ld e, a     ; E now holds old L — swap complete, A clobbered
```

`ex de, hl` replaces all six with one instruction and leaves A untouched:

```zax
ld hl, $1234
ld de, $5678
ex de, hl      ; HL = $5678, DE = $1234 — true bidirectional swap in one step
```

After `ex de, hl`: HL holds `$5678` and DE holds `$1234`. This makes
`ex de, hl` useful any time you need to swap the addresses or values held in
these two pairs — for example, after a loop that built a result in HL and you
want to pass it to the next step in DE.

Two other exchange instructions exist. They are noted here for completeness but
belong to more advanced usage patterns covered later in the course.

`ex af, af'` swaps the AF register pair with its shadow counterpart AF'. The Z80
has a second set of registers — the shadow registers — that are separate storage
locations with the same names, accessed by swapping. The shadow registers are
introduced in Chapter 06. The practical use of `ex af, af'` is saving and
restoring A and the flags temporarily, without using the stack.

`exx` swaps BC, DE, and HL all at once with their shadow counterparts BC', DE',
HL'. Like `ex af, af'`, this relies on the shadow registers and is most
commonly used in interrupt handlers and time-critical routines where spilling
to the stack is too slow.

Throughout this course, `ex de, hl` is the exchange instruction you will
encounter regularly. The others exist and will appear in later volumes.

---

## Summary

- `ld` copies a value from source to destination; it does not perform
  arithmetic.
- Immediate mode encodes the value directly in the instruction bytes.
- Register-to-register mode copies between named registers at no memory cost.
- Indirect mode `(hl)` reads or writes the byte at the address held in HL.
- Direct address mode `(addr)` reads or writes a fixed memory location.
- Labels name addresses; the assembler substitutes the address wherever the
  label appears.
- `const` names a fixed value; it produces no output bytes.
- `section data ... end` declares named byte or word storage at a known address.
- The bare-name form (`ld a, count`, `ld count, a`) is the standard way to read
  and write named scalar storage in ZAX. The name refers directly to the typed
  value.
- The paren form (`ld a, (count)`) is an explicit memory dereference: "read the
  byte at the address of `count`." Use it when working at the address level.
- Parentheses in instruction operands always mean dereference, whether the
  operand is a register (`(hl)`), a name (`(count)`), or a literal address
  (`($8000)`).
- `ex de, hl` performs a true bidirectional swap of DE and HL in one
  instruction. A one-way copy (HL→DE) takes two instructions; a manual swap
  without `ex de, hl` takes six and clobbers a scratch register.

## What Comes Next

Chapter 03 introduces the flag register: the set of condition bits that
arithmetic and comparison instructions set, and that conditional jump
instructions read to decide where execution continues next.

---

[← Numbers and Registers](01-numbers-and-registers.md) | [Part 2](README.md) | [Flags, Comparisons, Jumps →](03-flags-comparisons-jumps.md)
