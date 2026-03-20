[Part 1](README.md) | [Machine Code →](02-machine-code.md)

# Chapter 1 — The Computer

To program at the level of machine code you need a clear picture of what the machine actually is. This chapter builds that picture from the ground up. No code yet — just the mental model that everything else depends on.

---

## Memory

Memory is the computer's storage. Think of it as a very long row of numbered boxes. Each box holds one number between 0 and 255. The number that identifies a box is its **address**. The number stored inside the box is a **byte**.

On the Z80, there are 65,536 boxes — addresses 0 through 65,535. We normally write addresses in hexadecimal, so the range runs from `$0000` to `$FFFF`. That is 64 kilobytes, and it is the entire extent of memory that the Z80 can see.

```
Address  Contents
$0000      $3E
$0001      $05
$0002      $47
$0003      $3E
  ...      ...
$FFFF      $00
```

Every byte the computer uses — instructions, numbers, text, anything at all — lives somewhere in this address space. There is no other storage visible to the CPU.

Two kinds of memory occupy different parts of this space:

**ROM** (read-only memory) holds content that does not change. ROM keeps its contents when the power goes off. On the Z80, ROM almost always occupies the bottom of the address space, starting at `$0000`.

**RAM** (random-access memory) holds content that can be read and written freely. RAM loses its contents when power goes off. RAM normally occupies the upper portion of the address space.

The exact split between ROM and RAM depends on the hardware the Z80 is installed in. A typical arrangement might have ROM from `$0000` to `$3FFF` and RAM from `$4000` to `$FFFF`, but other layouts are common.

---

## The CPU

The CPU (central processing unit) is the chip that does the work. It reads bytes from memory, interprets them as instructions, and carries them out.

Inside the CPU are **registers** — named storage locations that the CPU uses while working. Registers are not part of memory. They are built into the CPU chip, faster to access than RAM, and there are only a handful of them.

The Z80 registers you will use most often:

| Register | Width  | Purpose |
|----------|--------|---------|
| A        | 8 bits | The **accumulator**. Most arithmetic and logic operations happen here. |
| B, C     | 8 bits | General purpose. B is often used as a loop counter. |
| D, E     | 8 bits | General purpose. Often holds a memory address as the pair DE. |
| H, L     | 8 bits | General purpose. HL is the primary address register — most memory access goes through it. |
| SP       | 16 bits | **Stack pointer.** Tracks the top of the call stack. |
| PC       | 16 bits | **Program counter.** Always contains the address of the next instruction to execute. |

B and C together form the 16-bit pair **BC**; D and E form **DE**; H and L form **HL**. The pairs behave as single 16-bit values when you need a full memory address.

---

## The Fetch-Execute Cycle

The CPU does one thing, over and over, as fast as its clock allows: it reads the byte at the address stored in PC, interprets it as an instruction, executes it, and updates PC to point past that instruction. This is called the **fetch-execute cycle**.

Concretely:

1. Read the byte at address PC. That byte is an instruction code.
2. Carry out what the instruction says.
3. Advance PC past the instruction. (Some instructions are one byte; some are two or three.)
4. Go back to step 1.

The CPU never stops to wonder what to do next. It just keeps fetching and executing.

When the Z80 is powered on, PC starts at `$0000`. Execution therefore begins at the very first byte in memory — which is why ROM, containing your startup code, lives at address `$0000`.

---

## Input and Output

Memory handles storage, but a computer also communicates with the outside world: keyboards, displays, serial ports, storage devices. The Z80 connects to external hardware through **I/O ports**.

The Z80 has 256 I/O ports, numbered 0 to 255. Each port connects to a hardware device. You read from and write to ports using dedicated instructions (`in` and `out`). Ports are completely separate from memory — they do not occupy any addresses in the `$0000`–`$FFFF` range.

Which devices connect to which ports depends entirely on the hardware the Z80 is installed in. We will come back to I/O in a later chapter, once you have the rest of the picture.

---

## Summary

- Memory is a flat array of 65,536 bytes, addressed `$0000` to `$FFFF`
- Each byte holds a value 0–255; addresses identify which byte you mean
- ROM holds fixed content and normally starts at `$0000`; RAM holds changeable content
- The CPU has a small set of named registers for working data — A, B, C, D, E, H, L, SP, PC
- PC contains the address of the next instruction; it starts at `$0000`
- The CPU fetches, executes, and advances PC — endlessly, automatically
- I/O ports connect to external hardware and are separate from the memory address space

The next chapter shows what a program looks like when it is sitting in memory.

---

[Part 1](README.md) | [Machine Code →](02-machine-code.md)
