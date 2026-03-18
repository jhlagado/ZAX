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

The four source/destination combinations you will use in Phase A are:

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
address; both are register names. This is the fastest `ld` form on the Z80 and
takes one machine cycle.

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
`count` refers to `$8000`. Every instruction that mentions `count` will use the
address `$8000`. If the section is later moved to `$9000`, all those instructions
update automatically.

`ld a, (count)` reads the byte at the address of `count`. `ld (count), a` writes
A to that address. The parentheses indicate a memory access, exactly as with
`(hl)`.

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
`scratch` at `$8001` (two bytes, initial value 0). The names `count` and
`scratch` behave exactly like labels: they refer to their respective addresses.

`ld hl, $1234` followed by `ld (scratch), hl` writes the word `$1234` to
addresses `$8001` (low byte `$34`) and `$8002` (high byte `$12`).

`ld hl, (scratch)` reads back from the same two addresses and reconstructs
the word `$1234` in HL.

---

## The example: `examples/intro/02_constants_and_labels.zax`

```zax
const MaxCount  = 10
const BaseAddr  = $8000

section data vars at $8000
  count:   byte = 0
  scratch: word = 0
end

export func main(): void
  ld a, MaxCount
  ld (count), a

  ld hl, BaseAddr
  ld a, (hl)

  ld hl, $1234
  ld (scratch), hl

  ld hl, (scratch)

  ret
end
```

`ld a, MaxCount` uses immediate mode with a named constant. After this
instruction, A = 10.

`ld (count), a` uses direct address mode via a label. The assembler replaces
`count` with `$8000`. After this instruction, the byte at `$8000` contains 10.

`ld hl, BaseAddr` loads the constant value `$8000` into HL. Notice that
`BaseAddr` and the address of `count` are the same value — `$8000`. This is
intentional: the next instruction uses HL as a pointer to that address.

`ld a, (hl)` uses indirect mode through HL. Since HL now holds `$8000`, this
reads the byte at `$8000`, which we just wrote as 10. After this instruction,
A = 10 again.

`ld (scratch), hl` uses direct address mode to write the word in HL to the
two-byte storage at `scratch`. Then `ld hl, (scratch)` reads it back.

---

## What This Chapter Teaches

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
- `ld (name), a` and `ld a, (name)` access named byte storage through its label.
- `ld (name), hl` and `ld hl, (name)` access named word storage.

## What Comes Next

Chapter 03 introduces the flag register: the set of condition bits that
arithmetic and comparison instructions set, and that conditional jump
instructions read to decide where execution continues next.
