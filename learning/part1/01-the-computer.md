[Part 1](README.md) | [Machine Code →](02-machine-code.md)

# Chapter 1 — The Computer

A Z80 computer has three main parts: a CPU, memory, and I/O ports. The CPU does the work — fetching instructions and carrying them out. Memory holds the program and the data it works with. I/O ports connect the CPU to the outside world: a keyboard, a display, a storage device, a sensor. Every Z80 program is a loop through this: fetch an instruction from memory, execute it, fetch the next.

This chapter maps the territory. By the end you will know how the Z80's memory is laid out, what its registers do, and how it steps through a program — the three things everything else in this course builds on.

---

## Memory

The Z80 can address 65,536 bytes of memory. Think of it as a flat array of 65,536 numbered slots, each holding one byte. The number that identifies a slot is its **address**.

Z80 addresses are always written in **hexadecimal** (base 16) with a `$` prefix. The full address range runs from `$0000` to `$FFFF`. Hexadecimal may be new to you; a brief explanation appears later in this chapter and the full treatment is in [Appendix 1](../appendices/01-numbers-notation-and-ascii.md). For now, `$0000` means "address zero" and `$FFFF` means "the last address, 65535."

Two kinds of memory chip are common. **ROM** (read-only memory) holds data that cannot change during normal operation and keeps its contents when the power goes off — bootloaders, fixed routines, and lookup tables live here. **RAM** (random-access memory) can be freely read and written, but loses its contents when the power goes off; variables, the stack, and anything your program creates or modifies go here.

The hardware designer decides which addresses connect to which chips. The Z80 itself does not know or care — it puts an address on the bus and reads or writes a byte. A system's **memory map** describes which ranges connect to which hardware. A typical small Z80 board might look like this:

```
$0000–$1FFF   ROM   (8 KB — startup code)
$2000–$7FFF   RAM   (24 KB — program and data)
$8000–$FFFF   —     (unmapped, or more RAM, or memory-mapped I/O)
```

The Z80 imposes one constraint: when it resets, the program counter starts at `$0000`. Whatever is mapped there must be valid code. On the board above, that means ROM.

---

## I/O Ports

The Z80 has a separate address space for hardware peripherals, reached with the `in` and `out` instructions rather than the memory-access instructions you will use for most of this course. An 8-bit port number selects the device. Chapter 9 covers I/O in detail; for now it is enough to know that I/O is a separate bus, not part of the 64K memory map.

---

## The CPU and Its Registers

The CPU reads bytes from memory, interprets them as instructions, and carries them out. To carry out instructions, the CPU needs fast internal storage — the **registers**. The Z80 has about 26 bytes of register storage built directly into the chip, much faster than external RAM.

Every instruction you write uses at least one register. Almost every calculation must pass through them — very few Z80 operations act on memory without involving a register.

Here is the complete Z80 register set:

| Register | Width | Role |
|----------|-------|------|
| A | 8 bits | **Accumulator.** Most arithmetic and logic results end up here. |
| F | 8 bits | **Flags.** Individual bits record the outcome of the last operation. Cannot be read directly in most instructions. |
| B | 8 bits | General purpose. Frequently used as a loop counter. |
| C | 8 bits | General purpose. Also used as a port number with `in`/`out`. |
| D | 8 bits | General purpose. |
| E | 8 bits | General purpose. |
| H | 8 bits | General purpose. High byte of HL. |
| L | 8 bits | General purpose. Low byte of HL. |
| BC | 16 bits | B and C as a pair. Used for 16-bit counts and addresses. |
| DE | 16 bits | D and E as a pair. Often used as a destination address when copying data. |
| HL | 16 bits | H and L as a pair. The primary address register — most indirect memory access goes through HL. |
| IX | 16 bits | Index register. Used for indexed memory access (base address + offset). Splits into IXH and IXL. |
| IY | 16 bits | Index register. Same role as IX; a second independent index. Splits into IYH and IYL. |
| SP | 16 bits | **Stack pointer.** Always points to the most recently pushed value on the hardware stack. |
| PC | 16 bits | **Program counter.** Always holds the address of the next instruction to execute. Cannot be read or written directly. |
| I | 8 bits | Interrupt vector register. Used with interrupt mode 2. |
| R | 8 bits | Refresh register. Incremented automatically as each instruction is fetched. Rarely something you will use directly. |

When B and C are used as the pair BC, B holds the high byte and C holds the low byte — the same pattern as DE (D high, E low) and HL (H high, L low). So if HL = `$1A2B`, then H = `$1A` and L = `$2B`.

The Z80 also has a hidden second copy of A, F, B, C, D, E, H, and L called the **shadow registers**, covered in Chapter 8. A compact register reference is in [Appendix 2](../appendices/02-registers-flags-and-conditions.md).

---

## The Fetch-Execute Cycle

The CPU does one thing, over and over: read the byte at the address in PC, interpret it as an instruction, carry it out, and advance PC to the next instruction. This is the **fetch-execute cycle**.

The Z80 starts with PC at `$0000` after a reset. Some instructions are one byte long, some are two, three, or four. After executing an instruction, PC advances by exactly as many bytes as that instruction occupied — unless the instruction itself changes PC, which is what jumps and calls do.

---

## A First Look at the Machine

Before going further, here is a concrete picture of what all this looks like. The following is a complete Z80 program — ten bytes of raw instructions starting at address `$0000`:

```
$0000:  3E 05        ; load 5 into register A
$0002:  47           ; copy A into register B
$0003:  3E 03        ; load 3 into register A
$0005:  80           ; add B to A  →  A = 8
$0006:  32 00 80     ; store A at address $8000
$0009:  76           ; halt
```

When the CPU resets, PC is `$0000`. It fetches `$3E`, recognises it as a two-byte "load constant into A" instruction, reads the next byte (`$05`), loads 5 into A, and advances PC to `$0002`. It continues instruction by instruction until it reaches `$76` (HALT) and stops. Address `$8000` now holds the value 8.

Every concept from this chapter is visible in those ten bytes: the fetch-execute cycle, the registers A and B used as working storage, memory accessed by address, and the 16-bit address `$8000` encoded in two bytes. Chapter 2 decodes this program step by step. Chapter 3 rewrites it in assembly.

---

## Hexadecimal

Z80 work uses hexadecimal constantly. Every opcode, every address, and every constant is written this way — you will see it in emulator displays, assembler listings, and every program in this course.

Hexadecimal is base 16. It uses sixteen digits: `0`–`9` for values 0–9, then `A`–`F` for values 10–15. ZAX marks hex numbers with a `$` prefix. The key property that makes hex useful here: exactly four bits map to exactly one hex digit. Splitting a byte's eight bits into two groups of four and substituting each group directly gives the hex value — no arithmetic needed.

| Hex digit | Value | Binary pattern |
|-----------|-------|----------------|
| 0 | 0 | 0000 |
| 1–9 | 1–9 | 0001–1001 |
| A | 10 | 1010 |
| B | 11 | 1011 |
| C | 12 | 1100 |
| D | 13 | 1101 |
| E | 14 | 1110 |
| F | 15 | 1111 |

So `$75` is the byte `%0111 0101` — a `7` (0111) followed by a `5` (0101). And `$FF` is `%1111 1111`, which is 255. A four-digit hex number like `$8000` is a 16-bit address. Spend a few minutes converting in both directions until reading `$3E` or `$FF` feels immediate. The full conversion tables are in [Appendix 1](../appendices/01-numbers-notation-and-ascii.md).

---

## Bits, Bytes, and Words

A **bit** is a single binary digit: 0 or 1. A **byte** is eight bits — the smallest unit of data the Z80 can read, write, or operate on directly. A byte holds values from 0 to 255. Two consecutive bytes form a **word**, a 16-bit value ranging from 0 to 65,535. The Z80's address space, its 16-bit registers, and its 16-bit arithmetic all work in words.

The `%` prefix marks a binary number: `%01110101` is the binary representation of `$75` (117 in decimal). The full explanation of binary — how bits combine to make values, two's complement for signed numbers, and bit-by-bit arithmetic — is in [Appendix 1](../appendices/01-numbers-notation-and-ascii.md). You will need it in detail when you reach bitwise operations in Chapter 5; a quick read now will save time later.

---

## Endianness

When a 16-bit word is stored in memory, its two bytes go into two consecutive addresses. The Z80 is **little-endian**: the low byte goes at the lower address, the high byte at the higher address.

Storing the word `$1A2B` at address `$8000`:

```
Address   Contents
$8000       $2B    ← low byte first
$8001       $1A    ← high byte second
```

You saw this in the first program: the address `$8000` is encoded in the instruction at `$0006` as two bytes `$00 $80` — low byte `$00` first, high byte `$80` second. Every Z80 instruction that handles 16-bit values follows this rule.

---

## The Flags Register

The flags register F records the outcome of the last operation. Each flag is a single bit — set (1) or clear (0). The two you will use from the very beginning are:

| Symbol | Name | Set when |
|--------|------|----------|
| Z | Zero | The result of the last operation was zero |
| C | Carry | The last addition produced a carry out of bit 7, or the last subtraction required a borrow |

These two flags drive most of the conditional branches you will write in Chapters 4 through 10. The Z80 has four more flags — S (sign), H (half carry), P/V (parity/overflow), and N (subtract). They appear in specific contexts and are introduced when those contexts arise. The full flags reference is in [Appendix 2](../appendices/02-registers-flags-and-conditions.md).

One thing to know now: `ld` instructions — the ones you will write most often — do not affect flags at all. Arithmetic and comparison instructions do. This distinction matters when writing conditional branches, and Chapter 5 explains exactly which instructions set which flags.

---

## Summary

- A Z80 computer has three parts: CPU, memory, and I/O ports. The CPU fetches and executes instructions from memory; I/O ports connect it to hardware peripherals.
- Memory is a flat array of 65,536 bytes at addresses `$0000`–`$FFFF`. ROM holds fixed content; RAM holds data the program can read and write.
- The memory map — which address ranges connect to ROM, RAM, or I/O — is a hardware decision. PC starts at `$0000` after reset, so that address must contain valid code.
- The CPU has named internal registers: A (accumulator), HL/DE/BC (address and data pairs), IX/IY (indexed access), SP (stack), and PC (next instruction). Most operations pass through registers.
- The fetch-execute cycle: fetch the byte at PC, execute the instruction, advance PC, repeat.
- Hex (`$` prefix) is how Z80 values are written. Four bits = one hex digit; `$FF` = 255; `$0000`–`$FFFF` is the address space. Full tables in Appendix 1.
- A byte is 8 bits (0–255); a word is 16 bits (0–65535). The `%` prefix marks binary.
- The Z80 is little-endian: the low byte of a 16-bit value is stored at the lower address.
- The flags register F records the outcome of the last operation. Z (zero) and C (carry) are the two used first. `ld` instructions do not affect flags; arithmetic instructions do.

---

[Part 1](README.md) | [Machine Code →](02-machine-code.md)
