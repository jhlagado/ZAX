[← Machine Code](02-machine-code.md) | [Part 1](README.md) | [Flags, Comparisons, Jumps →](04-flags-comparisons-jumps.md)

# Chapter 3 — Assembly Language

You now know what the machine looks like and what a program looks like as raw bytes. Nobody writes real programs that way. This chapter introduces assembly language: the `LD` instruction that moves data everywhere, a handful of other essentials, and the rules the hardware imposes on you whether you like it or not.

---

## A First Program

Here is the addition program from Chapter 2, rewritten in assembly. To run it in ZAX, the code needs a thin wrapper that tells the assembler where things go in memory — but everything inside the function body is standard Z80.

```zax
section data state at $8000
  var result: byte
end

section code app at $0100
  export func main(): void
    ld a, 5
    ld b, a
    ld a, 3
    add a, b
    ld (result), a
  end
end
```

Ignore the `section` and `export func` lines for now — they are scaffolding that tells ZAX where to place the code and data. The important thing is what happens inside:

`ld a, 5` loads the value 5 into A. `ld b, a` copies A into B. `ld a, 3` replaces A with 3. `add a, b` adds B (still 5) to A (now 3), leaving 8 in A.

`ld (result), a` stores A into the byte named `result`. The parentheses mean "the memory address of" — the assembler substitutes the actual address, so this becomes `LD ($8000), A` in the output. The bytes are identical to the ones from Chapter 2. Same opcodes, same behaviour. The assembler just lets you write it in a way that a human being can actually read.

---

## The LD Instruction

`LD` is the most frequently used instruction in Z80 assembly. It copies a value from a source to a destination:

```
ld destination, source
```

`LD` does not affect the flags register. It is a pure copy — the source is unchanged, the destination receives the value, nothing else happens.

One rule to internalise now: **parentheses always indicate a memory access.** `LD A, B` copies the register B into A. `LD A, (HL)` reads the byte from memory at the address stored in HL. The parentheses change the meaning entirely. This convention applies everywhere in Z80 assembly, not just to `LD`. If you forget the parentheses, you get a completely different instruction and no error message — just wrong behaviour. This will bite you at some point. Be warned.

Not every combination of source and destination is legal. The Z80's hardware supports specific pairings, and asking for an unsupported one produces an assembler error. The rules are worth knowing in full, because you will be writing `LD` constantly.

### 8-bit register to register

Any of A, B, C, D, E, H, L can be copied to any other:

```zax
ld a, b     ; A = B
ld d, h     ; D = H
ld l, c     ; L = C
ld a, a     ; legal, pointless
```

### Immediate constant into register

Any 8-bit register takes an immediate byte (0–255). Any 16-bit register pair takes a 16-bit constant:

```zax
ld a, 42        ; A = 42
ld b, $FF       ; B = 255
ld hl, $8000    ; HL = $8000
ld ix, $4000    ; IX = $4000
```

### Memory access through HL

HL is the primary indirect address register. `(HL)` means "the byte at the address currently in HL." This is what makes HL the most useful 16-bit register on the Z80 — it can reach any byte in memory, and it works with every 8-bit register.

```zax
ld a, (hl)     ; A = byte at address HL
ld (hl), a     ; byte at address HL = A
ld b, (hl)     ; B = byte at address HL
ld (hl), 19    ; byte at address HL = 19
```

Any of A, B, C, D, E, H, L can appear on either side when the other side is `(HL)`. BC and DE also have indirect forms, but only with A — `ld a, (bc)` and `ld (de), a` — and nothing else. HL supports `INC (HL)` and `DEC (HL)` to modify a byte in place. The standard pattern is: load an address into HL, read or write with `(HL)`, increment HL, repeat. You will see this in almost every Z80 program.

### Indexed memory access through IX and IY

IX and IY support **displaced** addressing: `(IX+n)` means "the byte at address IX + n", where n is a signed offset from −128 to +127.

```zax
ld a, (ix+0)    ; A = byte at address IX
ld b, (ix+7)    ; B = byte at address IX+7
ld (iy-2), a    ; byte at address IY-2 = A
ld (ix+1), $3F  ; byte at address IX+1 = $3F
```

You set IX or IY to point at the start of some region of memory, then access individual bytes at known offsets. This turns out to be extremely useful — you will see why when we get to functions and data tables.

### Memory access through BC or DE

Only A can be used with `(BC)` or `(DE)`:

```zax
ld a, (bc)     ; A = byte at address BC
ld (de), a     ; byte at address DE = A
```

Neither `LD B, (BC)` nor `LD (DE), H` is legal. If you try, the assembler will tell you.

### Direct memory address

A can be loaded from or stored to a fixed 16-bit address. Register pairs can also transfer both bytes in one instruction (little-endian, as always):

```zax
ld a, ($8000)      ; A = byte at $8000
ld ($8001), a      ; byte at $8001 = A
ld hl, ($8002)     ; HL = word at $8002–$8003
ld ($8004), bc     ; word at $8004–$8005 = BC
```

### Two memory locations cannot be combined

There is no instruction that copies one memory address directly to another. You must go through a register:

```zax
; No such instruction: ld ($8001), ($8000)

; Do this instead:
ld a, ($8000)
ld ($8001), a
```

This catches everyone at first. The CPU can talk to memory or to its own registers, but it cannot move data from one memory location to another without passing it through a register on the way. That is simply how the hardware works.

### Summary of LD forms

| Form | Example | Notes |
|------|---------|-------|
| reg8 ← reg8 | `ld a, b` | Any 8-bit register to any other (IX/IY restriction below) |
| reg8 ← n | `ld b, $FF` | Immediate 8-bit constant |
| reg16 ← nn | `ld hl, $8000` | Immediate 16-bit constant |
| reg8 ← (HL) | `ld c, (hl)` | Read byte at address HL |
| (HL) ← reg8 | `ld (hl), d` | Write byte to address HL |
| (HL) ← n | `ld (hl), 0` | Write immediate to address HL |
| reg8 ← (IX+n) | `ld a, (ix+3)` | Read byte at IX + offset (n: −128 to +127) |
| (IX+n) ← reg8 | `ld (ix+3), a` | Write byte to IX + offset |
| A ← (BC) | `ld a, (bc)` | Read byte at address BC; A only |
| (DE) ← A | `ld (de), a` | Write A to address DE; A only |
| A ← (nn) | `ld a, ($8000)` | Read byte from fixed address |
| (nn) ← A | `ld ($8001), a` | Write A to fixed address |
| reg16 ← (nn) | `ld hl, ($8002)` | Read 16-bit word from memory |
| (nn) ← reg16 | `ld ($8004), hl` | Write 16-bit word to memory |
| SP ← reg16 | `ld sp, hl` | SP = HL (or IX or IY) |

---

## Signed and Unsigned Values

The same byte can mean two different things depending on how you choose to read it.

As an **unsigned** value, the byte holds 0 to 255. The bit pattern `$FF` is 255.

As a **signed** value using two's complement, bit 7 is the sign bit. If bit 7 is 0 the value is positive (0 to 127). If bit 7 is 1 the value is negative (−128 to −1). The bit pattern `$FF` is −1. The bit pattern `$80` is −128.

To compute the two's complement of a positive value: invert all bits and add one. The two's complement of `$01` (`%00000001`) is `%11111110 + 1 = %11111111 = $FF`, which is −1.

Here is the important part: the CPU does not know which interpretation you intend. `ADD A, B` performs the same bitwise addition regardless. The result is the same bit pattern either way. Only the meaning you assign to it, and which flags you check afterward, determines the interpretation. Chapter 4 covers flags in detail.

---

## Constants

A **constant** is a name for a fixed value that has no address of its own:

```zax
const MaxCount  = 10
const BaseAddr  = $8000
```

The assembler substitutes the value everywhere the name appears. `ld a, MaxCount` becomes `ld a, 10`. `ld hl, BaseAddr` becomes `ld hl, $8000`. Constants produce no bytes in the output and occupy no memory at run time.

The difference between a constant and a label: a constant is a value you write down — `10`, `$8000`. A label is an address the assembler computes from where things end up in the output.

---

## Named Storage

You have already seen `var result: byte` in the data section. More generally, named storage is declared like this:

```zax
section data vars at $8000
  count:   byte = 0
  scratch: word = 0
end
```

The assembler places `count` at `$8000` (one byte, initial value 0) and `scratch` at `$8001` (two bytes, initial value 0). You access them with parentheses — the same notation you use for any memory address:

```zax
ld a, (count)         ; A = byte at address of count
ld (count), a         ; byte at address of count = A

ld hl, $1234
ld (scratch), hl      ; word at address of scratch = HL
ld hl, (scratch)      ; HL = word at address of scratch
```

The parentheses mean the same thing everywhere:

| Notation | Meaning |
|----------|---------|
| `ld a, (hl)` | Read byte at the address in HL |
| `ld a, (count)` | Read byte at the address of `count` |
| `ld a, ($8000)` | Read byte at address `$8000` |

**Parentheses always mean "go to this address in memory."** If you remember nothing else from this chapter, remember this.

---

## IX, IY, and the Half-Register Restriction

IX and IY are 16-bit index registers. Each splits into 8-bit halves — IXH/IXL and IYH/IYL — which are useful as extra byte storage when you have run out of general registers.

Zilog's original documentation did not list these halves as supported instructions. Programmers discovered them by noticing that the prefix-byte encoding made them work, and they have been in common use since the early 1980s. Modern assemblers — ZAX included — support them without qualification.

There is a hardware constraint you need to know about. The Z80 encodes H, L, IXH, IXL, IYH, and IYL using the same bit positions in the instruction byte, resolving the ambiguity with a prefix: unprefixed means H/L, `$DD` means IXH/IXL, `$FD` means IYH/IYL. Since one instruction can carry only one prefix, you cannot mix halves from different groups:

- `ld ixh, ixl` — valid, both share `$DD`
- `ld l, h` — valid, both unprefixed
- `ld h, ixl` — **impossible**, H is unprefixed, IXL needs `$DD`
- `ld iyh, ixl` — **impossible**, IYH needs `$FD`, IXL needs `$DD`

The rule: in any single instruction, the halves of HL, IX, and IY are mutually exclusive. You can freely combine A, B, C, D, E with any of them, but you cannot cross the HL/IX/IY boundary within one instruction. The assembler enforces this — you will get an error if you try.

---

## EX DE, HL

`EX DE, HL` swaps DE and HL in a single instruction. Afterward, DE holds what HL had and HL holds what DE had.

This is a true bidirectional swap, not a copy. Copying HL into DE without caring about DE's old value takes two instructions:

```zax
ld d, h
ld e, l        ; DE = old HL; HL unchanged
```

But if you need a genuine exchange — each pair receiving the other's value — you would need six instructions and a scratch register:

```zax
ld a, h
ld h, d
ld d, a        ; D = old H
ld a, l
ld l, e
ld e, a        ; E = old L — swap complete, A clobbered
```

`EX DE, HL` replaces all six with one instruction and leaves A untouched:

```zax
ld hl, $1234
ld de, $5678
ex de, hl      ; HL = $5678, DE = $1234
```

You will reach for it whenever you need to hand an address between these two pairs — after building a result in HL and needing it in DE for the next step, for instance.

Two other exchange instructions exist: `EX AF, AF'` swaps AF with its shadow counterpart, and `EXX` swaps BC, DE, and HL all at once with their shadow counterparts. Both rely on the shadow registers, which are covered in Chapter 7. For now, `EX DE, HL` is the one you will use.

---

## Arithmetic Instructions Are Not Operators

This is the section that saves you from your first truly baffling bug.

In a language like C, `a + b` produces a result without changing either variable. In Z80 assembly, `ADD A, B` adds B to A and **writes the result back into A**, destroying whatever A held before. The instruction is not an operator that produces a value — it is a complete operation that modifies a register. Every instruction after it sees the new value of A, not the old one.

This matters as soon as you write code longer than a few lines. Here is a calculation of a rectangle's perimeter, with width and height stored in memory:

```zax
ld a, (Width)       ; A = Width
add a, a            ; A = Width × 2
ld b, a             ; B = Width × 2
ld a, (Height)      ; A = Height
add a, a            ; A = Height × 2
add a, b            ; A = Height×2 + Width×2
ld (Perim), a       ; store result
```

Correct: 2 × Width + 2 × Height. Now consider rearranging the additions, thinking that addition is commutative and the order does not matter:

```zax
ld a, (Width)       ; A = Width
ld b, a             ; B = Width
ld a, (Height)      ; A = Height
add a, b            ; A = Height + Width
add a, b            ; A = Height + Width + Width
add a, a            ; A = (Height + 2×Width) × 2    ← WRONG
ld (Perim), a       ; stores the wrong value
```

The final `ADD A, A` does not double the original width — it doubles the running total, which by that point is already Height + 2 × Width. The result is 2 × Width too large.

The mistake is natural if you think of `ADD` as algebra. It is not. Every instruction modifies its destination in place, and every subsequent instruction sees the modified value. This kind of ordering bug is common in assembly, easy to miss, and produces no error message — just a wrong answer. Be prepared for it.

Besides `ADD`, the Z80 has `INC` (increment by one) and `DEC` (decrement by one). `INC A` adds 1 to A; `DEC B` subtracts 1 from B. Both affect the flags register — importantly, `DEC` sets the Zero flag when the result reaches zero, which makes it useful for counting loops. All three instructions share the same trait: they modify their operand in place.

---

## The Examples

Three example files accompany this chapter. Each one is a complete program you can assemble and run.

### `00_first_program.zax`

The addition program from the beginning of this chapter: load two values, add them, store the result to a named variable. This is the smallest complete ZAX program.

### `01_register_moves.zax`

```zax
export func main(): void
  ld a, $FF
  ld b, $10
  ld c, $20
  ld d, a
  ld e, b
  ld hl, $1234
  ld de, $5678
  ld bc, $0064
  ld d, h
  ld e, l
end
```

`ld a, $FF` loads 255 into A — an immediate load, the value encoded directly in the instruction bytes. `ld d, a` copies A into D — a register-to-register move, no memory involved.

`ld hl, $1234` loads a 16-bit immediate into HL: H gets `$12`, L gets `$34`. The instruction encodes as three bytes — the opcode, then the value in little-endian order (`$34` then `$12`).

Notice that `ld de, $5678` overwrites both D and E, replacing the `$FF` that was in D after the earlier copy. Every instruction overwrites its destination completely. If you were relying on D still being `$FF` after this point, too bad — it is gone.

The final two instructions, `ld d, h` and `ld e, l`, copy HL into DE one byte at a time. After both, DE holds `$1234`. There is no single instruction that copies one register pair into another; you always do it as two 8-bit moves.

### `02_constants_and_labels.zax`

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
end
```

`ld a, MaxCount` — the constant `MaxCount` is substituted as `10`. This is an immediate load; no memory access happens.

`ld (count), a` — stores A at the address of `count`. The parentheses mean "memory at this address."

`ld hl, BaseAddr` loads `$8000` into HL. Since `BaseAddr` and the address of `count` are both `$8000`, the next instruction `ld a, (hl)` reads the same byte — the value `10` we just stored. This demonstrates something important: named storage and pointer-based access are just two ways of reaching the same memory. The computer does not care which way you get there.

`ld (scratch), hl` and `ld hl, (scratch)` demonstrate word-sized storage: the full 16-bit value in HL is written to and read from the two-byte variable.

---

## Summary

- `LD` copies a value from source to destination without affecting flags; not all combinations are legal — consult the forms table
- Parentheses always mean "memory at this address" — whether in `(HL)`, `(count)`, or `($8000)`
- Two memory locations cannot appear in a single `LD`; you must go through a register
- Unsigned bytes hold 0–255; signed bytes use two's complement (bit 7 = sign, range −128 to +127)
- `const` names a fixed value substituted at assembly time; it produces no output bytes
- IXH, IXL, IYH, IYL are usable as extra byte registers, but cannot be mixed with H/L or each other's pair in one instruction
- `EX DE, HL` swaps the two pairs in one instruction
- Arithmetic instructions modify the destination register in place — `ADD A, B` destroys A's old value; ordering matters
- `INC` and `DEC` add or subtract 1 and affect the flags register

---

[← Machine Code](02-machine-code.md) | [Part 1](README.md) | [Flags, Comparisons, Jumps →](04-flags-comparisons-jumps.md)
