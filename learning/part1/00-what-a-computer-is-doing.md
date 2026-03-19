[Part 1](README.md) | [Numbers and Registers →](01-numbers-and-registers.md)

# Chapter 00 — What a Computer Is Doing

This chapter explains the ground that every later chapter builds on: what bytes
and addresses are, how memory holds both code and data, and what an assembler
source file actually produces. By the end of this chapter you will be able to
read a ZAX file and explain what each part does before the program has run a
single instruction.

Prerequisites: none. This is the first chapter.

---

## Machine code is bytes the CPU reads as instructions

The Z80 processor reads bytes from memory one at a time and acts on them. Each
byte, or short sequence of bytes, is a single instruction — one thing the CPU
knows how to do. A byte is a number from 0 to 255. The byte value 62 (written
here in plain decimal, the number system you use every day) tells the processor
to load the following byte into register A. The byte value 118 tells the
processor to halt. That sequence of bytes — one instruction after another — is
called **machine code**.

Writing programs directly as numbers is possible but painful. Each value must be
looked up in the CPU manual, and nothing in the file shows what any sequence is
trying to accomplish. A single mistake changes the program in ways that are
invisible until the CPU misbehaves.

An **assembler** accepts human-readable instruction names — called **mnemonics**
— and converts them to the correct byte sequences automatically. The mnemonic
for byte 62 followed by byte 66 is `ld a, 66`. The assembler turns that text
into the two bytes; you write names, not numbers.

ZAX is an assembler. You write instructions in a `.zax` source file and ZAX
produces the machine code. Later in this chapter, hex notation is introduced
and the examples switch to it — for now, plain decimal values are easier to
follow.

---

## Bytes and words

One **byte** holds a value from 0 to 255, stored in eight binary digits called
bits. Two bytes together form a **word**, which holds a value from 0 to 65535.
The Z80 is an 8-bit processor: most of its internal registers hold one byte.
Some pairs of registers are treated as a single 16-bit unit and hold one word.

When a value is written in hexadecimal (base 16), a prefix of `$` is used in
ZAX notation: `$FF` is 255, `$0100` is 256. Hexadecimal is convenient because
one hex digit maps exactly to four bits, so two hex digits describe a byte and
four hex digits describe a word.

---

## Memory is addressed storage

The Z80 can address 65536 individual bytes of memory, identified by addresses
`$0000` through `$FFFF`. Each address names exactly one byte location.

When the CPU executes `ld a, ($8000)`, it reads the byte stored at address
`$8000` and places it in register A. When it executes `ld ($8000), a`, it writes
the value of A into the byte at address `$8000`. The address `$8000` is simply
a number that identifies a location in memory.

A **16-bit word** occupies two consecutive byte addresses. By convention the
Z80 stores the low byte at the lower address and the high byte at the next
address. This is called **little-endian** order. The word value `$1234` stored
at address `$8000` puts `$34` at `$8000` and `$12` at `$8001`.

---

## Code and data both live in memory

The CPU has no built-in distinction between a byte that is an instruction and a
byte that is data. Both are stored in memory. The difference is only where the
program counter is pointing when the byte is read.

The program counter (PC) holds the address of the next instruction byte to
fetch and execute. When the program starts running at address `$0000`, the CPU
reads the byte at `$0000`, executes it, then advances the PC to the next
instruction. If the program stores a data byte at some address and the PC never
reaches that address, the CPU never interprets it as an instruction.

Good programs keep instruction bytes and data bytes in separate regions so that
the CPU never accidentally executes data. In a ZAX file you declare which
addresses hold code and which hold data, and the assembler lays out the output
accordingly.

---

## What a ZAX file is

A ZAX source file has a defined structure. It contains:

- **Constants** — names for fixed values the assembler substitutes at compile
  time. `const MaxLen = 10` means the assembler replaces the name `MaxLen` with
  the value `10` wherever it appears.
- **Data sections** — named regions of memory that hold byte or word values.
  You give each region an address and list the initial values.
- **Functions** — named blocks of Z80 instructions that the assembler emits as
  machine code starting at a particular address.

Here is the first example file: `learning/part1/examples/00_first_program.zax`.

```zax
const StoredValue = $42

section data vars at $8000
  result: byte = 0
end

export func main(): void
  ld a, StoredValue
  ld (result), a
  ret
end
```

The assembler processes this file in three steps:

1. It records that `StoredValue` is the value `$42`.
2. It places one byte of initialized storage at address `$8000` and records that
   the name `result` refers to that address.
3. It emits machine code for the three instructions inside `main`.

The instruction `ld a, StoredValue` becomes `ld a, $42`, which assembles to the
two bytes `$3E $42`. The instruction `ld (result), a` becomes `ld ($8000), a`,
which assembles to the three bytes `$32 $00 $80`. The instruction `ret`
assembles to the single byte `$C9`.

After the assembler runs, the output is a binary image — a sequence of bytes at
known addresses — that a Z80 processor can load and execute.

---

## The module shell

Every ZAX file is a **module**. The `export func main(): void ... end` block is
the top-level function the program starts in — exactly how the loader enters it
depends on your target platform. The word `export` marks this function as
visible outside the module. The words `func` and
`end` delimit the function body. Inside the body are the raw Z80 instructions,
one per line.

You do not need to understand every keyword yet. The important points are:

- The module shell (`export func main(): void ... end`) wraps the instructions.
- The instructions inside are read by the assembler in the order they appear and
  emitted as consecutive bytes in the output.
- Labels, constants, and data sections give names to addresses and values so
  that the instructions can refer to them by name rather than by bare number.

---

## What This Chapter Teaches

- Machine code is a sequence of bytes the CPU reads as instructions.
- An assembler converts human-readable mnemonics into those bytes.
- Memory is a flat array of 65536 byte locations, each with a 16-bit address.
- A word is two bytes stored low-byte-first at consecutive addresses.
- Code and data both live in memory; the CPU distinguishes them only by whether
  the program counter reaches them.
- A ZAX file has a module shell, optional constants, optional data sections, and
  one or more functions containing raw instructions.
- The assembler produces a binary image: bytes at specific addresses.

## What Comes Next

Chapter 01 introduces the Z80 register set — the small collection of named byte
and word storage locations inside the CPU itself — and explains the binary and
hexadecimal number systems you will use to reason about values in those
registers.

---

[Part 1](README.md) | [Numbers and Registers →](01-numbers-and-registers.md)
