[Part 2](README.md) | [Foundations →](01-foundations.md)

# Introduction

## What This Volume Is For

If you worked through Part 1, you have covered a lot of ground. You started with raw machine code and learned to read it byte by byte. You wrote programs that scan tables, call subroutines, push and pop registers, and drive hardware through I/O ports. By the end you were writing structured ZAX programs where the compiler generates the jump labels and frame offsets while you describe what the code is meant to do — and the machine still executes exactly what you wrote.

Part 2 picks up from there. The Z80 mechanics are the same — registers, flags, the stack, the fetch-execute cycle. What changes is the scale of the problems and the ZAX features that help keep that scale manageable. You have seen typed locals, structured control flow, `:=` assignment, and `op` macros; now you will use all of them together on non-trivial programs.

The chapters are built around practical problems: arrays, strings, bit manipulation, records, recursion, pointer structures, and a capstone search algorithm. Each one works through real ZAX code and shows how the language keeps larger programs readable without hiding what the CPU is doing.

## What ZAX Gives You Here

ZAX is still close to the machine. Raw Z80 instructions are always available,
and you still decide what the registers, flags, and memory layout mean. What
changes is the amount of repetitive work you have to do by hand.

In these chapters you will keep seeing the same pattern. Raw instructions are
used when the machine detail matters directly. ZAX features are used when your
intent is clearer than the mechanical load/store sequence.
A byte can still be loaded with `ld a, (hl)`. A typed local can be updated with
`count := hl` or `step index_value`. The language does not remove machine-level
thinking. It removes repeated clerical work so the program structure is easier
to follow.

## What This Volume Assumes

You should already be comfortable with:

- the Z80 register set and register pairs
- flag-driven branching and loop entry conditions
- `call`, `ret`, and the idea of stack-based local state
- the difference between ROM data, RAM data, and addresses
- reading short Z80 sequences without opcode-by-opcode commentary

You do not need prior knowledge of C, Pascal, or any other high-level language.
This volume explains each program in its own terms. What it does assume is that
you are ready to read multi-step code and follow what a program is doing across
more than a few instructions.

## How To Use The Chapters

Each chapter should be read in the same order:

1. read the prose for the chapter's main idea
2. open the cited `.zax` example files
3. follow the code with the chapter's explanation beside it
4. compile the example if you want to inspect the generated output

Do not try to memorize every line. The useful question is simpler: what problem
is this code solving, and which parts are raw Z80 detail versus ZAX structure?
That distinction is what the rest of the volume keeps reinforcing.

## What Comes Next

Chapter 1 starts with arithmetic and number-theory algorithms: power, GCD,
Fibonacci, square root, and decimal digit count. These are small programs with
no arrays or records — just functions, typed locals, and structured control
flow. They establish the working patterns that every later chapter builds on.

---

[Part 2](README.md) | [Foundations →](01-foundations.md)
