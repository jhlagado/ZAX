[← Assembly Language](03-assembly-language.md) | [Part 1](README.md) | [Flags, Comparisons, Jumps →](05-flags-comparisons-jumps.md)

# Chapter 4 — Memory Access and Data Representation

The programs in Chapter 3 could only talk to registers and a single named byte. That's enough to add two numbers, but not enough to scan a table, process a string, or read from hardware. All of those require reaching into memory — and the Z80 has several specific ways to do it, each suited to a different pattern.

This chapter covers all of them, collects them into a reference table, and explains something that will matter more and more as you go: how the same byte can mean completely different things depending on how you choose to read it.

---

## Memory access through HL

Load an address into HL and it points to that location in memory. `(HL)` means the byte at the address HL holds — you can read or write it directly.

```zax
ld a, (hl)     ; A = byte at address HL
ld (hl), a     ; byte at address HL = A
ld b, (hl)     ; B = byte at address HL
ld (hl), 19    ; byte at address HL = 19
```

Any of A, B, C, D, E, H, L can appear on either side when the other side is `(HL)`. The standard pattern is: load an address into HL, read or write with `(HL)`, increment HL, repeat. Chapter 7 builds on this pattern heavily when working with byte tables.

IX and IY support displaced addressing — `(ix+d)` reads the byte at address IX + d without changing IX. Chapter 7 covers this in full when the use case makes it concrete.

> **The Parentheses Rule — a reminder**
>
> Parentheses always mean "go to this address in memory."
>
> `ld a, b` copies register B into A — no memory involved.
> `ld a, (hl)` reads the _byte at the address held in HL_ from memory.
>
> Missing or adding parentheses writes a completely different instruction —
> one the assembler will happily accept, silently doing the wrong thing.

---

## Memory access through BC or DE

Only A can be used with `(BC)` or `(DE)`:

```zax
ld a, (bc)     ; A = byte at address BC
ld (de), a     ; byte at address DE = A
```

These are compact single-byte opcodes with A hardcoded in the instruction encoding. The Z80 has no opcodes for `ld b, (bc)` or any other register with those indirect modes — the assembler will tell you if you try.

---

## Direct memory address

A can be loaded from or stored to a fixed 16-bit address. Register pairs can also transfer both bytes in one instruction (little-endian, as always):

```zax
ld a, ($8000)      ; A = byte at $8000
ld ($8001), a      ; byte at $8001 = A
ld hl, ($8002)     ; HL = word at $8002–$8003
ld ($8004), bc     ; word at $8004–$8005 = BC
```

Named storage uses this form under the hood. When you write `ld a, (count)`, the assembler substitutes the address that `count` was assigned and emits a direct-address load. `count` is not special syntax — it is just a label that the assembler resolves to a 16-bit number.

---

## Two memory locations cannot be combined

There is no instruction that copies one memory address directly to another. You must go through a register:

```zax
; No such instruction: ld ($8001), ($8000)

; Do this instead:
ld a, ($8000)
ld ($8001), a
```

This catches everyone at first. The CPU can talk to memory or to its own registers, but it cannot move data from one memory location to another without passing it through a register on the way.

Both this and the `(BC)`/`(DE)` restriction above are examples of the same reality: the Z80's instruction set was built from the combinations that fit the original opcode space, not from a consistent scheme. You cannot predict which forms exist from a general rule; you learn them through use.
[Appendix 4](../appendices/04-classic-z80-instruction-support.md) has the complete searchable list.

---

## Summary of LD forms

The table below is a reference — not something to memorise before you continue. Scan it once to see what shapes exist, then return to it when a specific form comes up in code.

| Form         | Example          | Notes                           |
| ------------ | ---------------- | ------------------------------- |
| reg8 ← reg8  | `ld a, b`        | Any 8-bit register to any other |
| reg8 ← n     | `ld b, $FF`      | Immediate 8-bit constant        |
| reg16 ← nn   | `ld hl, $8000`   | Immediate 16-bit constant       |
| reg8 ← (HL)  | `ld c, (hl)`     | Read byte at address HL         |
| (HL) ← reg8  | `ld (hl), d`     | Write byte to address HL        |
| (HL) ← n     | `ld (hl), 0`     | Write immediate to address HL   |
| A ← (BC)     | `ld a, (bc)`     | Read byte at address BC; A only |
| (DE) ← A     | `ld (de), a`     | Write A to address DE; A only   |
| A ← (nn)     | `ld a, ($8000)`  | Read byte from fixed address    |
| (nn) ← A     | `ld ($8001), a`  | Write A to fixed address        |
| reg16 ← (nn) | `ld hl, ($8002)` | Read 16-bit word from memory    |
| (nn) ← reg16 | `ld ($8004), hl` | Write 16-bit word to memory     |
| SP ← reg16   | `ld sp, hl`      | SP = HL (or IX or IY)           |

For a compact LD quick table and the full addressing-shape reference, see [Appendix 3](../appendices/03-addressing-prefixes-and-instruction-forms.md).

---

## Signed and Unsigned Values

The same byte can mean two different things depending on how you choose to read it.

As an **unsigned** value, the byte holds 0 to 255. The bit pattern `$FF` is 255.

As a **signed** value using two's complement, bit 7 is the sign bit. If bit 7 is 0 the value is positive (0 to 127). If bit 7 is 1 the value is negative (−128 to −1). The bit pattern `$FF` is −1. The bit pattern `$80` is −128.

To compute the two's complement of a positive value: invert all bits and add one. The two's complement of `$01` (`%00000001`) is `%11111110 + 1 = %11111111 = $FF`, which is −1.

If the invert-and-add-one rule feels like a formula to memorise rather than something that makes sense yet, that is completely normal — two's complement is one of those things that clicks properly only once you have used it a few times. The practical point that matters right now is in the next paragraph.

`add a, b` performs the same bitwise addition regardless — the result byte is identical whether you treat the inputs as signed or unsigned. Where the difference surfaces: `$80 + $01` gives `$81`. Read as unsigned that is 128 + 1 = 129. Read as signed that is −128 + 1 = −127. Same instruction, same output, two different numbers. The bug appears when one part of your program writes a value intending it as signed and another reads it as unsigned. The common landmark values (`$00`, `$7F`, `$80`, `$FF`) and their signed and unsigned meanings are in
[Appendix 2](../appendices/02-registers-flags-and-conditions.md).

---

## The Example: `learning/part1/examples/02_constants_and_labels.zax`

```zax
const MaxCount  = 10

export func main()
  ld a, MaxCount
  ld (count), a

  ld hl, $1234
  ld (scratch), hl

  ld hl, (scratch)
end

section data state at $8000
  count:   byte = 0
  scratch: word = 0
end
```

`ld a, MaxCount` — the assembler sees `MaxCount` and writes `10` into the instruction. This is an immediate load; no memory access happens.

`ld (count), a` — stores A at the address of `count`. This is a direct-address write: the `(nn) ← A` form from the table above. The parentheses mean "memory at this address," and `count` resolves to `$8000`.

`ld (scratch), hl` — stores the two-byte value in HL into `scratch`. The assembler reserved two consecutive bytes for `scratch` automatically — that is what declaring it as `word` instead of `byte` does. This uses the `(nn) ← reg16` form.

`ld hl, (scratch)` — reads the word back from `scratch`. After this instruction, HL holds `$1234` again. This uses the `reg16 ← (nn)` form.

After the program runs: `$8000` holds `10` (`$0A`), and `$8001`–`$8002` hold `$1234` (little-endian: `$34` at `$8001`, `$12` at `$8002`).

---

## Summary

- `(HL)` reads or writes the byte at the address HL holds; any 8-bit register can pair with `(HL)` on either side
- `(BC)` and `(DE)` indirect forms exist only with A — `ld a, (bc)`, `ld (de), a`
- Direct-address forms (`ld a, ($8000)`, `ld ($8001), a`) work for A with bytes and for register pairs with words
- Two memory locations cannot be combined in one `ld`; always pass through a register
- Named variables use the same direct-address forms under the hood — `ld a, (count)` is `ld a, ($8000)` with the assembler filling in the address
- The LD forms table lists every legal shape; the Z80 does not implement all logical combinations — learn the ones that exist
- The same byte can be read as unsigned (0–255) or signed (−128 to +127, two's complement); the distinction is in how your code interprets the bits, not in how `add` or `ld` work

---

## What Comes Next

Every program so far has done its work in a straight line. Chapter 5 adds the ability to branch — to ask whether a value is zero, whether one number is greater than another, whether a carry occurred — and act on the answer. The flags register is what makes that possible, and understanding it is what separates instruction lookup from actual Z80 programming.

---

## Exercises

**1. Memory form identification.** Classify each instruction below using the LD forms table: identify the row it belongs to and state whether the instruction reads from or writes to memory.

```zax
ld a, (hl)
ld (hl), b
ld a, (bc)
ld ($8010), a
ld de, ($8020)
```

**2. Spot the illegal instruction.** Four of these five `ld` instructions will assemble without error. One will not — the assembler will reject it. Identify the illegal form and explain why it is rejected:

```zax
ld a, (hl)
ld (hl), b
ld ($8000), (hl)
ld hl, (scratch)
ld b, $FF
```

_(Hint: re-read the two-memory-locations section and the note about what `ld` cannot do.)_

**3. Signed or unsigned?** For each byte value below, give both the unsigned interpretation (0–255) and the signed two's complement interpretation (−128 to +127):

- `$00`
- `$7F`
- `$80`
- `$FF`

Which of these values has the same meaning under both interpretations? Which has the most dramatically different meanings?

**4. Trace the word store.** Given the sequence:

```zax
ld hl, $ABCD
ld ($8050), hl
```

What value is stored at address `$8050`? What value is stored at `$8051`? Which is the low byte and which is the high byte? (The Z80 stores 16-bit values little-endian — low byte first.)

---

[← Assembly Language](03-assembly-language.md) | [Part 1](README.md) | [Flags, Comparisons, Jumps →](05-flags-comparisons-jumps.md)
