[← Machine Code](02-machine-code.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)

# Chapter 3 — The Assembler

## Mnemonics

The fundamental problem with raw machine code is not that the CPU is hard to understand — the fetch-execute cycle is straightforward. The problem is that hex bytes give you nothing to hold onto: no names, no structure, no indication of intent.

An assembler solves this by letting you write instructions using **mnemonics** — human-readable names that correspond one-to-one with opcodes. Instead of writing `$3E $05`, you write:

```
ld a, 5
```

`ld` stands for "load." `a` names the destination register. `5` is the value. The assembler reads this text and produces the same bytes `$3E $05` that the CPU expects.

Here is the program from Chapter 2, written as Z80 assembly mnemonics:

```
ld a, 5        ; load 5 into A
ld b, a        ; copy A into B
ld a, 3        ; load 3 into A
add a, b       ; A = A + B
ld ($8000), a  ; store result at address $8000
halt           ; stop
```

Six readable lines instead of ten opaque bytes. The assembler translates them back into exactly the same byte sequence: `3E 05 47 3E 03 80 32 00 80 76`.

---

## A ZAX Program

ZAX is an assembler for the Z80. It understands all the standard Z80 mnemonics, and adds a structured layer on top: named variables, typed storage, and control flow written in a readable form. But underneath, ZAX still produces raw machine code — the same bytes the CPU reads.

Here is the same program written in ZAX:

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

A few things to notice.

`section data state at $8000` tells ZAX that the variables declared below live starting at address `$8000`. ZAX calculates the exact address of `result` — you name it, ZAX tracks where it lives.

`section code app at $0100` tells ZAX that the code below starts at address `$0100`. (This is the convention used by CP/M, a common Z80 operating environment, which reserves the bottom of RAM for its own use.)

`var result: byte` names a one-byte storage location. Writing `result` in the code is clearer than writing `$8000`, and it stays correct even if you reorganise your data layout.

`result := a` is ZAX syntax for "store A into the variable `result`." ZAX translates this into the store instruction `ld ($8000), a` — the same opcode as before.

`export func main(): void` declares the program's entry point. ZAX automatically adds the housekeeping that a well-formed function needs: a header, a final `ret` instruction, and correct structure for the linker.

---

## What ZAX Produces

When you run ZAX on that source file, it produces a binary — a sequence of bytes ready to be loaded into memory. The store to address `$8000` is still there; the result is still 8.

The bytes are different from Chapter 2 only because the code now starts at `$0100` instead of `$0000`, and ZAX adds a small function header. The arithmetic is identical: 5 + 3, stored at `$8000`.

ZAX does not change what the program does. It changes how you express it.

---

## Why ZAX Goes Further

Most assemblers stop at mnemonics — they translate names to bytes and track label addresses. ZAX adds things that become valuable as programs grow:

**Named variables.** `result` instead of `$8000`. You add a variable and ZAX places it; you do not adjust addresses by hand when your layout changes.

**Typed storage.** `result := a` knows that `result` is a byte and generates the right store instruction. `:=` is ZAX's assignment operator; it handles the load or store sequence for you.

**Structured control flow.** `if`, `while`, `break`, and `func` generate correct conditional jumps and call sequences. You write the structure; ZAX counts the bytes and calculates the offsets.

All of these features produce machine code. The CPU still sees bytes. ZAX just handles the bookkeeping that would otherwise be your problem.

---

## What Comes Next

You now have the mental model:

- A computer is a CPU, memory, and I/O ports (Chapter 1)
- A program is bytes in memory; the CPU fetches and executes them (Chapter 2)
- An assembler translates readable source into those bytes; ZAX adds structure on top of that (this chapter)

Part 2 of this book teaches Z80 programming with ZAX in detail — the full instruction set, addressing modes, the stack, subroutines, and ZAX's typed features. Every chapter in Part 2 builds on the picture you have just established.

---

[← Machine Code](02-machine-code.md) | [Part 1](README.md) | [Part 2 →](../part2/README.md)
