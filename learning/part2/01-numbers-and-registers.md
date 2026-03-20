 [← Part 1](../part1/README.md) | [Part 2](README.md) | [Loading, Storing, Constants →](02-loading-storing-constants.md)

# Chapter 01 — Numbers and the Z80 Register Set

This chapter introduces the number systems and the internal storage that Z80
programs depend on. After reading it you will be able to read any value in
binary or hexadecimal, explain what register pairs are, and follow a program
that moves values between registers.

Prerequisites: Chapter 00 (bytes, addresses, the module shell).

---

## Binary and hexadecimal

Every byte in the Z80 holds an eight-bit binary value. Each bit is either 0 or 1.
The bits are numbered 7 (most significant, leftmost) down to 0 (least
significant, rightmost). The binary value `%10000001` has bits 7 and 0 set and
all others clear; its decimal value is 128 + 1 = 129.

Binary notation is precise but long. Hexadecimal (base 16) is shorter. One hex
digit represents exactly four bits: `0`–`9` for values 0–9, `A`–`F` for
values 10–15. Two hex digits describe a full byte. The binary byte
`%10000001` written in hex is `$81` (8×16 + 1 = 129). ZAX uses the `$` prefix
for hex literals throughout.

The table below shows the correspondence for the sixteen possible four-bit
combinations:

```
Binary  Hex  Decimal
0000    $0   0
0001    $1   1
0010    $2   2
0011    $3   3
0100    $4   4
0101    $5   5
0110    $6   6
0111    $7   7
1000    $8   8
1001    $9   9
1010    $A   10
1011    $B   11
1100    $C   12
1101    $D   13
1110    $E   14
1111    $F   15
```

A word is two bytes, expressed as four hex digits. `$1234` has high byte `$12`
and low byte `$34`.

---

## Unsigned vs signed values

The Z80 can interpret the eight bits of a byte in two ways.

As an **unsigned** value, the byte holds a number from 0 to 255. The bit pattern
`$FF` is 255.

As a **signed** value using two's complement, bit 7 is the sign bit. If bit 7
is 0, the value is positive (0 to 127). If bit 7 is 1, the value is negative
(-128 to -1). The bit pattern `$FF` is -1 in signed interpretation. The bit
pattern `$80` is -128.

Two's complement is the standard encoding for negative integers on the Z80.
To compute the two's complement of a positive value, invert all bits and add
one. The two's complement of `$01` (binary `%00000001`) is `%11111110 + 1 =
%11111111 = $FF`, which is -1.

The CPU arithmetic instructions do not distinguish: `add a, b` performs the same
bitwise addition regardless of whether you intend the values as signed or
unsigned. The result is the same bit pattern either way. Only the meaning you
attach to the result, and which flags you check afterward, reflects the
signed/unsigned choice. Chapter 03 covers flag interpretation in detail.

---

## The Z80 register set

Registers are byte and word storage locations built into the CPU. They are much
faster to access than memory and are where all arithmetic happens.

The Z80 has these main registers:

| Register | Width | Primary use |
|----------|-------|-------------|
| A | 8 bits | Accumulator — arithmetic and logic results land here |
| B | 8 bits | General purpose; counted-loop counter |
| C | 8 bits | General purpose; I/O port number |
| D | 8 bits | General purpose |
| E | 8 bits | General purpose |
| H | 8 bits | High byte of HL; general purpose |
| L | 8 bits | Low byte of HL; general purpose |
| F | 8 bits | Flags — set by arithmetic, read by conditional jumps |

The flag register F is not used directly in `ld` instructions. Its contents are
examined implicitly by conditional jumps. Chapter 03 covers the flags.

The Z80 also has a **program counter** (PC) and a **stack pointer** (SP):

- **PC** holds the address of the next instruction byte to execute. The CPU
  advances it automatically after each fetch. You do not write to PC directly;
  jump instructions change it.
- **SP** holds the top-of-stack address. Push and pop instructions move SP.
  Chapter 06 covers the stack.

---

## Register pairs

The Z80 can treat certain pairs of 8-bit registers as a single 16-bit unit:

| Pair | High byte | Low byte |
|------|-----------|----------|
| BC | B | C |
| DE | D | E |
| HL | H | L |

When you write `ld hl, $1234`, both H and L are loaded at once: H gets `$12`
and L gets `$34`. When you later read `ld d, h`, you get the high byte of that
word — `$12` — in D.

---

## Why HL is the common working pair

HL is the most useful 16-bit register on the Z80 for memory access. It can be
used as a **memory pointer** in indirect addressing: `ld a, (hl)` reads the
byte from the address held in HL, and `ld (hl), a` writes a byte there.

BC and DE also have indirect forms, but only with A: `ld a, (bc)` and
`ld a, (de)` read one byte into A; `ld (bc), a` and `ld (de), a` write A to
memory. What makes HL different is that it works with any byte register, not
just A. `ld b, (hl)`, `ld c, (hl)`, `ld (hl), d` — any combination is valid.
HL also supports `inc (hl)` and `dec (hl)` to modify a byte in place, and it
is the base for indexed addressing with the IX and IY registers. You will load
an address into HL, then use `(hl)` to read or write at that address. This
pattern appears in almost every Z80 program.

---

## The example: `learning/part1/examples/01_register_moves.zax`

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

`ld a, $FF` loads the immediate value 255 into A. This is a one-instruction load
with no memory access: the value `$FF` is encoded directly in the instruction
bytes.

`ld d, a` copies the current value of A into D. No immediate value is involved;
this is a register-to-register move. After this instruction D holds `$FF`.

`ld hl, $1234` loads a 16-bit immediate into the register pair HL. Note that
later in the example `ld de, $5678` overwrites D and E: D becomes `$56` and E
becomes `$78`, replacing the `$FF` that was in D after the register copy above. H receives
the high byte `$12` and L receives the low byte `$34`. The instruction encodes
as three bytes: the opcode followed by the two bytes of the value in
little-endian order (`$34` then `$12`).

`ld d, h` and `ld e, l` copy the high and low bytes of HL into DE, one byte at
a time. After both instructions DE holds `$1234` — a copy of HL.

There is no native `ld de, hl` instruction in the Z80 instruction set. Copying
a register pair in raw Z80 always takes two separate 8-bit moves. The example
shows that two-step pattern so you recognise it when you see it later.

---

## Summary

- A byte holds 8 bits; two hex digits describe it. A word holds 16 bits; four
  hex digits describe it.
- Unsigned bytes represent 0–255. Signed bytes use two's complement: bit 7 is
  the sign bit, range is -128–127.
- The Z80 has eight 8-bit registers: A (accumulator), B, C, D, E, H, L, and F
  (flags).
- Register pairs BC, DE, and HL treat two 8-bit registers as a single 16-bit
  unit.
- HL is the standard memory-pointer pair: `(hl)` reads or writes the byte at
  the address in HL.
- PC holds the next-instruction address; SP holds the stack top. Both are
  managed indirectly.
- `ld reg, imm` loads an immediate value; `ld reg, reg` copies between
  registers; `ld rr, imm16` loads a 16-bit immediate into a pair.
- Copying HL to DE in raw Z80 requires two separate 8-bit moves; there is no
  native `ld de, hl` instruction.

## What Comes Next

Chapter 02 introduces the addressing modes of `ld` in full, shows how labels
name memory addresses, and demonstrates reading from and writing to named RAM
locations using immediate values, register pairs, and indirect addressing.

---

 [← Part 1](../part1/README.md) | [Part 2](README.md) | [Loading, Storing, Constants →](02-loading-storing-constants.md)
