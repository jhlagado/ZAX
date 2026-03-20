[Part 1](README.md) | [Machine Code →](02-machine-code.md)

# Chapter 1 — The Computer

Before writing a single line of assembly, you need to know what you are programming. This chapter describes the Z80 computer — its memory, its registers, and the cycle by which it executes instructions. Everything in the rest of the book depends on this picture being clear.

---

## Bits and Bytes

The memory of any computer stores only two values: 0 and 1. Each individual 0 or 1 is called a **bit** (from *binary digit*). The Z80 cannot access individual bits directly, however. It always handles memory in groups of eight bits at a time. A group of eight bits is a **byte**.

The eight bits in a byte are numbered from position 7 down to position 0. The numbering reflects each bit's contribution to the byte's total value: bit 7 represents 2<sup>7</sup> = 128, bit 6 represents 2<sup>6</sup> = 64, and so on down to bit 0, which represents 2<sup>0</sup> = 1. To find the numeric value of a byte, multiply each bit by its positional value and add up the results.

Here is the byte `0b01110101` worked out in full (the `0b` prefix means the number is written in binary):

| Bit position | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|---|---|---|
| Positional value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
| Digit | 0 | 1 | 1 | 1 | 0 | 1 | 0 | 1 |
| Contribution | 0 | 64 | 32 | 16 | 0 | 4 | 0 | 1 |

Total: 64 + 32 + 16 + 4 + 1 = **117**.

A byte can hold any value from 0 (`0b00000000`) to 255 (`0b11111111`). This is the smallest unit of data the Z80 can directly read, write, or operate on.

### Words

Two consecutive bytes form a **word**, a 16-bit value. A word can hold values from 0 to 2<sup>16</sup> − 1 = 65,535. The Z80 handles both bytes and words; many of its registers are 16 bits wide and its memory addressing uses 16-bit values throughout. (Other CPUs have 32-bit or 64-bit words, but the Z80 only works with these two sizes.)

When a word is stored in memory, it occupies two consecutive bytes. Which byte comes first matters, and this is discussed below under *Endianness*.

---

## Hexadecimal

Writing out eight bits every time you mean a byte value is tedious and error-prone. Instead, Z80 programmers almost universally use **hexadecimal** — base 16 — and so will you. Hexadecimal numbers are prefixed with `$` throughout this book.

Hexadecimal uses sixteen digits: `0`–`9` for values 0–9, then `A`–`F` for values 10–15. The key property that makes hexadecimal useful in this context is that exactly four bits correspond to exactly one hexadecimal digit. Converting between hex and binary requires no arithmetic — just split the bits into groups of four and substitute each group directly.

Taking the example from above, `0b01110101`:

```
  0111   0101
   7      5
  $75
```

So `0b01110101 = $75`. Confirm in the other direction: `$75 = 7 × 16 + 5 = 112 + 5 = 117`. ✓

The same holds for 16-bit words: `$FFFF` is `0b1111111111111111`, and a four-digit hex number always represents exactly sixteen bits. Addresses in the Z80 are always four hex digits, running from `$0000` to `$FFFF`.

You will see hex constantly in Z80 work. Every opcode, every address, every constant value is typically written this way. It is worth spending a few minutes converting numbers in both directions until it feels natural.

---

## Memory

The Z80 can address 65,536 bytes of memory, at addresses `$0000` through `$FFFF`. Think of it as a flat array: 65,536 numbered slots, each holding one byte. The number that identifies a slot is its **address**. To read or write any byte, you name its address.

Two types of memory occupy different parts of this address space:

**ROM** (read-only memory) holds content that cannot be changed during normal operation and retains its contents when power is removed. On the Z80, ROM almost always occupies the lowest addresses, starting at `$0000`. The program that runs at power-on must live in ROM, because the CPU always begins executing from address `$0000`.

**RAM** (random-access memory) holds content that can be freely read and written. RAM loses its contents when power is removed. RAM normally occupies the upper portion of the address space.

The exact layout depends on the hardware. A small Z80 system might look like this:

```
$0000–$3FFF   ROM   (16 KB — startup code, fixed routines)
$4000–$7FFF   —     (unmapped or memory-mapped I/O)
$8000–$FFFF   RAM   (32 KB — your programs and data)
```

Other systems use completely different layouts. The important thing is that on any Z80 system, ROM begins at `$0000`.

### Endianness

When a 16-bit word is stored in memory, its two bytes must go into two consecutive addresses. The Z80 is **little-endian**: the low byte of the word is stored at the lower address, and the high byte at the higher address.

For example, storing the word `$1A2B` at address `$8000`:

```
Address   Contents
$8000       $2B    ← low byte first
$8001       $1A    ← high byte second
```

Read it back: the byte at `$8000` is `$2B` (low), the byte at `$8001` is `$1A` (high), so the word is `$1A2B`. This is not something you can change — every Z80 instruction that handles 16-bit values follows this rule. You will encounter it whenever you store addresses or multi-byte values in memory, so remember it.

---

## The CPU and Its Registers

The CPU (central processing unit) is the chip that does the work. It reads bytes from memory, interprets them as instructions, and carries them out one after another. To carry out those instructions, the CPU needs a small amount of very fast internal storage. That storage is called the **registers**.

Registers are not part of RAM. They are built into the CPU itself, much faster to access than any external memory, and there are only a small number of them. Almost every instruction you write uses at least one register.

Here is the complete Z80 register set:

| Register | Width | Role |
|----------|-------|------|
| A | 8 bits | **Accumulator.** Most arithmetic and logic operations happen here. If an instruction produces a result, it usually ends up in A. |
| F | 8 bits | **Flags.** Individual bits record the outcome of the last operation (zero result, carry, overflow, etc.). Cannot be used directly in most instructions. |
| B | 8 bits | General purpose. Frequently used as a loop counter. |
| C | 8 bits | General purpose. Also used as a port number with the `in`/`out` instructions. |
| D | 8 bits | General purpose. |
| E | 8 bits | General purpose. |
| H | 8 bits | General purpose. High byte of HL. |
| L | 8 bits | General purpose. Low byte of HL. |
| BC | 16 bits | B and C treated as a pair. Useful for 16-bit counts and addresses. |
| DE | 16 bits | D and E treated as a pair. Commonly used as a destination address when copying data. |
| HL | 16 bits | H and L treated as a pair. The primary address register — most indirect memory access goes through HL. |
| IX | 16 bits | Index register. Used for indexed memory access (address + offset). Splits into IXH and IXL. |
| IY | 16 bits | Index register. Same role as IX, a second independent index. Splits into IYH and IYL. |
| SP | 16 bits | **Stack pointer.** Points to the most recently pushed value on the hardware stack. |
| PC | 16 bits | **Program counter.** Always contains the address of the next instruction to execute. Cannot be read or written directly. |
| I | 8 bits | Interrupt vector register. Used with interrupt mode 2. |
| R | 8 bits | Refresh register. Incremented automatically as each instruction is fetched. Only the low seven bits cycle; the top bit stays zero. Rarely useful to the programmer. |

When B and C are used as the pair BC, B holds the high byte and C holds the low byte — the same pattern as DE (D high, E low) and HL (H high, L low). IX and IY follow the same rule with their halves. So for example if HL = `$1A2B`, then H = `$1A` and L = `$2B`.

### Shadow Registers

There is a second, hidden copy of A, F, B, C, D, E, H, and L — denoted A′, F′, B′, C′, D′, E′, H′, and L′. These are the **shadow registers**. You cannot use them directly in instructions. Two dedicated exchange instructions swap the main registers with their shadow counterparts:

- `EX AF, AF′` swaps A and F with A′ and F′.
- `EXX` swaps BC, DE, and HL with BC′, DE′, and HL′ simultaneously.

One `EXX` moves six registers in a single instruction — much faster than six individual saves to memory. This makes the shadow registers useful for very tight interrupt handlers or innermost loops where you need to save and restore a full register state instantly.

---

## The Flags Register in Detail

The flags register F contains eight bits, each of which records something about the result of the last operation that affected it. You will use these flags constantly — every conditional branch in the Z80 tests one of them.

| Bit | Symbol | Name | Meaning |
|-----|--------|------|---------|
| 7 | S | Sign | Set if the result, interpreted as a signed number, is negative (i.e. bit 7 of the result is 1). |
| 6 | Z | Zero | Set if the result is zero. |
| 5 | — | | Undefined. |
| 4 | H | Half carry | Set if there was a carry from bit 3 to bit 4. Used for BCD arithmetic. You will almost certainly never need this. |
| 3 | — | | Undefined. |
| 2 | P/V | Parity / Overflow | Used for two different purposes depending on the instruction: parity (set if the number of 1-bits in the result is even) or overflow (set if the result exceeded the signed range). Which meaning applies is determined by the instruction. |
| 1 | N | Subtract | Set if the last operation was a subtraction. Used internally for BCD correction. |
| 0 | C | Carry | Set if the last operation produced a carry out of bit 7, or a borrow in the case of subtraction. |

Not every instruction updates every flag. Some instructions update all flags; some update only Z and C; some leave all flags unchanged. You will learn which flags each instruction affects as you encounter them in Part 2.

---

## The Fetch-Execute Cycle

The CPU does one thing, over and over: read the byte at address PC, interpret it as an instruction, carry it out, and advance PC to the next instruction. This is the **fetch-execute cycle**.

The Z80 starts with PC at `$0000`. The first byte fetched is therefore the byte at the lowest address in ROM — which is why ROM must occupy `$0000`. Some instructions are one byte long, some are two, three, or four. After executing an instruction, PC advances by exactly as many bytes as that instruction occupied, unless the instruction itself changes PC — jumps and calls do exactly that.

---

## Input and Output

Memory covers data and programs, but the Z80 also communicates with the outside world through **I/O ports** — a separate 256-address space, numbered 0 to 255, entirely independent of the `$0000`–`$FFFF` memory space. Each port typically connects to a hardware peripheral: a keyboard, a display, a serial line, or a timer. The instructions `IN` and `OUT` read from and write to ports.

Which device sits at which port number depends on the hardware. We will cover I/O in detail in Part 2, Chapter 7, once you have the instruction set under your belt.

---

## Summary

- Memory is 65,536 bytes at addresses `$0000`–`$FFFF`; each byte holds 0–255
- A byte is 8 bits; a word is 16 bits (two bytes)
- The `0b` prefix marks binary numbers; the `$` prefix marks hexadecimal numbers
- Four bits = one hex digit; conversion between binary and hex is direct and requires no arithmetic
- The Z80 is little-endian: the low byte of a word is stored at the lower address
- ROM occupies `$0000` (the startup address); RAM occupies the upper address space
- The CPU has 20+ named registers; the main working registers are A, BC, DE, HL, IX, IY, SP, and PC
- The flags register F records results of operations; its bits (S, Z, H, P/V, N, C) control conditional branches
- PC always holds the address of the next instruction; the CPU fetches and executes endlessly
- I/O ports form a separate 256-address space for hardware peripherals

---

[Part 1](README.md) | [Machine Code →](02-machine-code.md)
