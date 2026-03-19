# Chapter 00 — Introduction

## What This Volume Is For

This volume is the second stage of the ZAX course.

It assumes you already know the basic machine model: registers, flags, memory,
subroutines, and ordinary loop structure on the Z80. Volume 1 under
`docs/intro/` covers those foundations from the ground up. This volume starts
later. Its job is to show how larger ZAX programs are organised once those
basics are already familiar.

The chapters are built around practical programs. They cover arrays, strings,
bit manipulation, records, recursion, composition, pointer structures, and a
capstone search problem. The point is not to admire named algorithms as museum
pieces. The point is to study real ZAX code that solves non-trivial problems
and to learn how the language helps keep that code readable.

## What ZAX Gives You Here

ZAX is still close to the machine. Raw Z80 instructions are always available,
and the programmer still decides what the registers, flags, and memory layout
mean. What changes is the amount of bookkeeping you have to do by hand.

In these chapters you will keep seeing the same pattern. Raw instructions are
used when the machine detail matters directly. ZAX surface features are used
when the programmer's intent is clearer than the mechanical load/store sequence.
A byte can still be loaded with `ld a, (hl)`. A typed local can be updated with
`count := hl` or `succ index_value`. The language does not remove machine-level
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
you are ready to read multi-step code and follow a program invariant across more
than a few instructions.

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

Chapter 01 starts with arithmetic and number-theory algorithms: power, GCD,
Fibonacci, square root, and decimal digit count. These are small programs with
no arrays or records — just functions, typed locals, and structured control
flow. They establish the working patterns that every later chapter builds on.
