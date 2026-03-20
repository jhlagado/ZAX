[← The Computer](01-the-computer.md) | [Part 1](README.md) | [The Assembler →](03-the-assembler.md)

# Chapter 2 — Machine Code

## A Program Is Bytes

A program is a sequence of bytes sitting in memory. That is all it is.

The CPU does not know whether a byte is an instruction or a number — that distinction is entirely in how the byte is used. When PC points to an address, the CPU reads the byte there and treats it as an instruction. If that instruction says to read a value from another address, the byte at that address is treated as data.

Instructions and data are both just bytes. The difference is whether the CPU is currently fetching an instruction or reading data.

---

## A Real Program in Hex

Here is a complete Z80 program written as raw hexadecimal bytes:

```
3E 05 47 3E 03 80 32 00 80 76
```

Ten bytes. This is a real program that a real Z80 will execute. Let us decode it.

---

## Decoding by Hand

The CPU starts at the first byte, `$3E`. On the Z80, `$3E` is the opcode for the instruction "load the next byte into register A." The next byte, `$05`, is the value to load. After these two bytes, A contains 5 and PC has moved forward by 2.

```
$0000: 3E    ; load next byte into A
$0001: 05    ;   the value: 5
```

Next byte is `$47`. This is the opcode for "copy A into B." No extra byte needed — the instruction is one byte. B now contains 5. PC moves forward by 1.

```
$0002: 47    ; copy A into B
```

Next is `$3E` again — another "load next byte into A," this time with value `$03`. A now contains 3. B still holds 5.

```
$0003: 3E    ; load next byte into A
$0004: 03    ;   the value: 3
```

Next byte is `$80`. This is "add B to A, result in A." A was 3, B is 5, so A becomes 8.

```
$0005: 80    ; add B to A
```

Next three bytes: `$32 $00 $80`. This is "store A at the address given by the next two bytes." On the Z80, 16-bit addresses are stored low byte first, so `$00 $80` means address `$8000`. The value 8 is written to memory location `$8000`.

```
$0006: 32    ; store A at address (follows)
$0007: 00    ;   address low byte
$0008: 80    ;   address high byte
```

Final byte: `$76`. This is HALT — the CPU stops.

```
$0009: 76    ; halt
```

---

## What the Program Did

Starting at address `$0000`, the CPU executed those ten bytes and left the value 8 at memory address `$8000`. You can verify this by inspecting memory after the halt: address `$8000` contains `$08`.

The program computed 5 + 3 and stored the result. That took ten bytes and required knowing that `$3E` means "load immediate into A", that `$80` means "add B to A", that `$32` means "store A at address", and that 16-bit addresses are stored low byte first.

---

## The Problem

Writing programs this way is possible. It is also painful in ways that compound as programs grow.

Every multi-byte instruction embeds a raw address or value. If you move your data to a different memory location, you update every instruction that references it — and you do it by hand, across the byte sequence, with no help. If you insert an instruction in the middle of the program, any address calculated from a position after that insertion is now wrong.

A typo produces no error message. If you write `$83` instead of `$80`, you get "add E to A" instead of "add B to A." The program runs, produces a wrong answer, and offers no clue why.

Labels, meaningful names, and structure do not exist at this level. Everything is a position, an offset, or a raw value.

Nobody writes real programs as raw hex bytes. The next chapter shows the tool that solves this.

---

## Summary

- A program is a sequence of bytes in memory; the CPU fetches and executes them in order
- Each opcode byte has a specific meaning defined by the Z80; some opcodes are followed by additional bytes (values, addresses)
- 16-bit addresses in instructions are stored low byte first, then high byte
- Writing programs as raw hex is exact but fragile — a single wrong byte silently produces wrong behaviour with no indication of where the problem is

---

[← The Computer](01-the-computer.md) | [Part 1](README.md) | [The Assembler →](03-the-assembler.md)
