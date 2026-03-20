[← Machine Code](02-machine-code.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)

# Chapter 3 — The Assembler

An assembler reads a text source file and produces a binary — the byte sequence that goes into memory. The programmer writes instructions using mnemonics (human-readable names for opcodes) and labels (names for addresses), and the assembler handles the translation to bytes, the calculation of label addresses, and the resolution of every reference.

This chapter covers the most important single instruction in the Z80 (`LD`), introduces the hardware stack, and shows what a complete ZAX program looks like from source to output.

---

## The LD Instruction

`LD` is the Z80's load instruction. It copies a value from a source location to a destination location: a register, a memory address, or an immediate constant. Its general form is:

```
ld destination, source
```

`LD` by itself does not affect the flags register. It is a pure copy — source is unchanged, destination receives the value, nothing else happens.

One convention to internalise now: **parentheses always indicate a memory access.** `LD A, B` copies the register B into A. `LD A, (HL)` reads the byte from memory at the address stored in HL. The parentheses are not optional decoration — they change the meaning of the instruction entirely. This convention applies everywhere in Z80 assembly, not just to `LD`.

Not every combination of source and destination is legal. The Z80's hardware supports specific pairings, and asking for an unsupported one is an assembler error. The rules are worth knowing in full, because `LD` is the most frequently used instruction in any Z80 program.

### 8-bit register to register

Any of the registers A, B, C, D, E, H, L can be copied to any other. The only restriction concerns the undivided halves of IX and IY (IXH, IXL, IYH, IYL): you can freely mix within one pair (`LD IXH, IXL` is valid), but you cannot mix between HL's bytes and IX's or IY's bytes in the same instruction.

```zax
ld a, b     ; A = B
ld d, h     ; D = H
ld l, c     ; L = C
ld a, a     ; legal, pointless
```

### Immediate constant into register

Any 8-bit register takes an immediate byte constant (0–255). Any 16-bit register pair or index register takes a 16-bit constant.

```zax
ld a, 42        ; A = 42
ld b, $FF       ; B = 255
ld hl, $8000    ; HL = $8000
ld ix, $4000    ; IX = $4000
```

### Memory access through HL

HL is the primary indirect address register. `(HL)` means "the byte at the address currently in HL."

```zax
ld a, (hl)     ; A = byte at address HL
ld (hl), a     ; byte at address HL = A
ld b, (hl)     ; B = byte at address HL
ld (hl), 19    ; byte at address HL = 19  (immediate constant also valid here)
```

Any of A, B, C, D, E, H, L can appear on either side when the other side is `(HL)`.

### Indexed memory access through IX and IY

IX and IY support **displaced** (indexed) addressing: `(IX+n)` means "the byte at address IX + n", where n is a signed 8-bit offset from −128 to +127.

```zax
ld a, (ix+0)    ; A = byte at address IX
ld b, (ix+7)    ; B = byte at address IX+7
ld (iy-2), a    ; byte at address IY-2 = A
ld (ix+1), $3F  ; byte at address IX+1 = $3F
```

This is the mechanism behind struct field access and array element access in ZAX — you set IX or IY to point to the start of a structure, then access fields at known offsets.

### Memory access through BC or DE

Only the accumulator A can be used with `(BC)` or `(DE)`:

```zax
ld a, (bc)     ; A = byte at address BC
ld (de), a     ; byte at address DE = A
```

Neither `LD B, (BC)` nor `LD (DE), H` is legal.

### Direct memory address

A can be loaded from or stored to a fixed 16-bit address. 16-bit register pairs can also be loaded from or stored to memory, transferring both bytes in one instruction (little-endian, as always).

```zax
ld a, ($8000)      ; A = byte at $8000
ld ($8001), a      ; byte at $8001 = A
ld hl, ($8002)     ; HL = word at $8002–$8003 (little-endian)
ld ($8004), bc     ; word at $8004–$8005 = BC (low byte first)
```

Note that `LD (nn), r` where `r` is a 16-bit pair works for BC, DE, HL, SP, IX, and IY. All are stored little-endian.

### Two memory locations cannot be combined

There is no single instruction that copies one memory address directly to another. You must go through a register:

```zax
; No such instruction: ld ($8001), ($8000)

; Do this instead:
ld a, ($8000)
ld ($8001), a
```

### Summary of LD forms

| Form | Example | Notes |
|------|---------|-------|
| reg8 ← reg8 | `ld a, b` | Any 8-bit register to any other (with IX/IY half-register restriction) |
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

## Arithmetic Instructions Are Not Operators

Before moving on, there is one difference between assembly and higher-level languages that catches everyone. In a language like C, `a + b` produces a result without changing either `a` or `b`. In Z80 assembly, `ADD A, B` adds B to A and **writes the result back into A**, destroying whatever A held before. The instruction is not an operator — it is a complete operation that modifies the destination register.

This matters as soon as you write code longer than a few lines. Here is a small example that calculates the perimeter of a rectangle whose width and height are stored in memory:

```zax
ld a, (Width)       ; A = Width
add a, a            ; A = Width * 2
ld b, a             ; B = Width * 2
ld a, (Height)      ; A = Height
add a, a            ; A = Height * 2
add a, b            ; A = Height*2 + Width*2
ld (Perim), a       ; store result
```

This is correct: 2 × Width + 2 × Height. Now consider what happens if you rearrange the additions, thinking that addition is commutative and the order does not matter:

```zax
ld a, (Width)       ; A = Width
ld b, a             ; B = Width
ld a, (Height)      ; A = Height
add a, b            ; A = Height + Width
add a, b            ; A = Height + Width + Width
add a, a            ; A = (Height + Width + Width) * 2    ← WRONG
ld (Perim), a       ; stores the wrong value
```

The final `ADD A, A` does not double the original width — it doubles the running total in A, which by that point is already Height + 2 × Width. The result is `2 × (Height + 2 × Width)`, which is Height × 2 too large.

The mistake is natural if you think of `ADD` as an algebraic operator. It is not. It is an instruction that replaces the contents of A with a new value, and every subsequent instruction sees the new value, not the original. This kind of ordering bug is common in assembly, easy to miss, and produces no error message — just a wrong answer.

---

## The Stack

The **stack** is a region of RAM used for temporary storage of register values. It is managed through the stack pointer SP, which always points to the most recently stored item. The Z80 provides two instructions for using it: `PUSH` and `POP`.

Both instructions work with 16-bit register pairs: AF, BC, DE, HL, IX, or IY.

### PUSH

`PUSH HL` does two things in sequence:
1. SP is decremented by 2.
2. The value of HL is written to memory at address SP — L at SP, H at SP+1 (little-endian).

### POP

`POP HL` does the inverse:
1. The word at address SP is read: the byte at SP goes into L, the byte at SP+1 goes into H.
2. SP is incremented by 2.

### The stack is last-in, first-out

Values come off the stack in the reverse order they went on. If you push BC and then push DE, popping gives you DE first and BC second.

```zax
push bc       ; save BC
push de       ; save DE
; ... do something that wrecks BC and DE ...
pop de        ; restore DE (came off first — was pushed last)
pop bc        ; restore BC (came off second — was pushed first)
```

This is the standard pattern for preserving registers across a block of code that would otherwise destroy them. You will see it constantly.

### A useful trick

There is no direct instruction to copy AF to another register pair or to access F directly. You can work around this using the stack: push AF, then pop into the target pair (where the byte that was F ends up in the low register).

```zax
push af
pop hl        ; H = A, L = F
```

### The stack is ordinary RAM

The stack is not a separate structure — it is the same RAM as your program and data. SP starts pointing somewhere in RAM (you set it up at the start of your program, or it is set for you), and push/pop move SP up and down within that area. There is nothing magical about it and nothing enforced — if you push more than you pop, SP drifts downward and will eventually collide with something you care about. It is your responsibility to keep pushes and pops balanced.

---

## A First ZAX Program

ZAX wraps Z80 instructions in a structured outer form. A ZAX source file is organised into **sections** — declarations that tell the assembler where in the address space to place the code and data.

Here is the addition program in complete ZAX:

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
    result := a
  end
end
```

### What each part means

`section data state at $8000` — declares a data section. The variables defined below will be placed in memory starting at address `$8000`. The assembler tracks the exact address of each variable for you.

`var result: byte` — declares one byte of named storage. The name `result` behaves as a label: everywhere you write `result` in the code, the assembler substitutes the actual address. If you add more variables before it or change the section's start address, every reference updates automatically.

`section code app at $0100` — declares a code section starting at address `$0100`. The `$0100` origin is a CP/M convention: the CP/M operating system occupies the bottom of RAM and loads application programs at `$0100`.

`export func main(): void` — declares the program's entry point. ZAX generates the function header automatically. The function's closing `end` emits a `ret` instruction, so you do not write one yourself.

`result := a` — ZAX's typed assignment operator. This specific form means "store the value of A into the byte variable `result`." The assembler translates it to `LD ($8000), A`.

### The output

Running ZAX on this source produces a binary file. The bytes inside the function body are identical to the ones decoded in Chapter 2 — the same opcodes, now starting at `$0100` instead of `$0000`. The store to `$8000` is unchanged.

ZAX does not change what the program does. It changes how you write and maintain it.

---

## Beyond Mnemonics: What ZAX Adds

Most assemblers stop at mnemonics and labels. ZAX goes further with features that become important as programs grow:

**Typed variables.** `var result: byte` not only names the storage location — it records what size it is. ZAX uses that information to generate the correct load and store instructions for `:=` assignments. This catches mismatches at assembly time rather than silently generating wrong code.

**Typed function parameters.** Functions can declare what values they receive and what value they return. The assembler generates the correct load and store sequences at call sites.

**Structured control flow.** `if`, `while`, `break`, and `continue` generate correct conditional jumps and loop structures, including the offsets that raw Z80 assembly requires you to calculate manually. You write the structure; the assembler produces the bytes.

**`op` — inline expansion.** An `op` block is like a function, but its body is copied inline at every call site instead of being called with `CALL`/`RET`. This gives you the reuse of a named block without the overhead of a subroutine call.

All of these still produce machine code. The CPU sees bytes. ZAX just handles the bookkeeping.

---

## Summary

- An assembler translates mnemonics and labels to bytes; label addresses are calculated and substituted automatically
- `LD` copies a value from source to destination; it does not affect flags
- Not all combinations of source and destination are legal — the key groupings are: register-to-register, immediate constant, indirect through HL, indexed through IX/IY, indirect through BC or DE (A only), and direct memory address
- Two memory locations cannot both appear in a single `LD`; use a register as an intermediate
- The stack is a region of RAM managed through SP; `PUSH` decrements SP by 2 and stores; `POP` loads and increments SP by 2
- Pushes and pops must be balanced; the stack is ordinary RAM with no automatic protection
- A ZAX program wraps instructions in `section` and `func` blocks; it adds typed variables, structured control flow, and typed function interfaces on top of standard Z80 assembly

---

[← Machine Code](02-machine-code.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)
