[Part 1 →](part1/README.md)

# Introduction — Why Assembly, Why ZAX, Why the Z80

Most programmers never write assembly language. They write in Python or C or JavaScript and let a compiler or interpreter do the mechanical work of turning their code into something the CPU can run. That arrangement is efficient and sensible for most purposes.

But it means most programmers never quite understand what a program *is* at the level where it actually executes. They have a mental model — a rough picture of "the computer" somewhere below the language — but it is vague and borrowed, built from analogies and half-remembered explanations. The machine itself remains opaque.

This course is about making the machine transparent.

---

## What assembly actually is

Every computer, regardless of how powerful or modern, ultimately runs instructions encoded as numbers. The CPU reads those numbers one at a time from memory, decodes each one into an operation, carries it out, and moves to the next. The operation might be "add these two values" or "store this byte at this address" or "if the last result was zero, jump to address X instead of continuing." That is all a program is, at the bottom: a sequence of numbered operations, each one small and exact.

Assembly language is a thin layer of notation over those numbers. Instead of writing `$3E $05` you write `ld a, 5` — a human-readable name for the same instruction. Instead of tracking that your variable lives at address `$8003`, you write `result` and let the assembler compute the address for you. Everything else stays the same. One line of assembly corresponds to one CPU instruction. Nothing is hidden.

Writing in assembly means you decide what goes in every register, what address every memory access targets, and which branch the program takes at every decision point. The CPU does not track any of this for you. That responsibility is yours — and that directness is exactly what makes assembly the most effective way to understand how programs work.

---

## Why the Z80

The Z80 is a real CPU from 1976, still in production, and used in millions of devices. But the reason it appears in this course is not historical sentiment — it is that the Z80 is genuinely good for learning.

The Z80 has a small instruction set. There are a few hundred instructions, and only a few dozen that appear in everyday programming. Compare that to a modern x86 processor, which has thousands. With the Z80, you can learn the whole surface of the instruction set, not just the parts that apply to the task in front of you.

The Z80 has a clean memory model. A 16-bit address bus gives 65,536 bytes of addressable space. Everything — code, data, the stack — lives in that flat array. There is no virtual memory, no protected mode, no operating system in the way. You put bytes in memory and the CPU runs them.

And the Z80 has enough structure to be interesting. It has a proper set of registers, an index register for structured data access, a hardware stack, and a well-designed calling convention. Everything that matters in real-world assembly programming is present, in a form simple enough to understand completely.

---

## Why ZAX

ZAX is an assembler for the Z80. It assembles standard Z80 instructions exactly as a classic assembler would, and it adds a thin structural layer on top: named parameters, local variables, and control-flow keywords like `if`, `while`, and `select`.

These additions are not a high-level language. They do not hide the machine or introduce a runtime. Every ZAX construct compiles to standard Z80 instructions that you can read and verify directly. What ZAX removes is the most tedious part of raw assembly: inventing label names for loop targets, tracking which register carries which value in a long function, and writing three instructions every time you want to do what one named operation would express.

This course teaches raw Z80 assembly first — registers, flags, jumps, the stack, subroutines — and then introduces ZAX's additions one at a time, each one motivated by a specific friction point in the raw code. By the time you see `if` and `while`, you will already know exactly what instructions they compile to, because you will have written those instructions by hand.

---

## What you will be able to do

By the end of Part 1 you will be able to:

- Read and write any raw Z80 program: move data between registers and memory, test flags and branch, loop with DJNZ, call subroutines and return correctly
- Understand what the CPU is doing at every step, because you placed every byte
- Write ZAX functions with named parameters, local variables, and structured control flow that compiles to tight Z80 and reads like the algorithm it implements
- Recognise the difference between code that runs correctly by design and code that runs correctly by accident

By the end of Part 2 you will be able to:

- Implement and reason about standard algorithms and data structures — sorting, searching, strings, recursion, records, linked structures — in a low-level language with no standard library
- Read unfamiliar assembly code and understand what it is doing
- Debug programs by tracing register state and flag state through a sequence of instructions
- Write programs for real Z80 hardware or emulators, with full control over memory layout and I/O

---

## How this course is organised

**Part 1** starts with the bare machine: what a byte is, what a program looks like as raw hex in memory, why raw hex is unmanageable, and how assembly language solves that. It then builds the Z80 programming model instruction by instruction — loads, flags, jumps, loops, tables, the stack, subroutines, I/O — before introducing ZAX's structural features in the final four chapters.

**Part 2** moves to algorithms and data structures. Each chapter works through a real, compilable ZAX program that solves a non-trivial problem, using the full language surface. These chapters assume everything in Part 1.

**Appendices** are reference material: number notation, ASCII, the full register set, flags and condition codes, and a searchable Z80 instruction table. Use them while reading either part.

---

## Before you start

You will need:

- The ZAX assembler (built with `npm run build` from the repository root)
- A Z80 emulator or the ZAX built-in test runner to verify your programs execute correctly
- A text editor

You do not need prior programming experience. Part 1 assumes none. You do need patience with precision: assembly rewards careful reading and makes you pay immediately for careless writing. That is not a warning — it is most of the point.

Start with [Part 1, Chapter 1](part1/01-the-computer.md).

---

[Part 1 →](part1/README.md)
