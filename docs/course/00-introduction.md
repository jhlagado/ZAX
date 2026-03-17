# Chapter 00 — Introduction

## What ZAX Is

ZAX is a structured assembler for the Z80 family. It compiles directly to
machine code — no external linker, no object format, no runtime system. The
output is a flat binary image alongside optional Intel HEX, a symbol listing,
and a debug map.

It is still assembly. You choose registers, manage flags, and decide what lives
in ROM versus RAM. The Z80 instruction set is fully available, mnemonics and
all. What ZAX adds is structure and names: typed storage declarations,
functions with stack-frame discipline, structured control flow, and a system
for defining inline macro-instructions (`op`) with compiler-level operand
matching.

That is the whole bargain. ZAX is not a systems language in the modern sense —
there is no type inference, no allocation model, no garbage collector, no
runtime exception system. It is not a macro assembler in the traditional sense
either — there are no textual substitutions, no include-time tricks, no flat
instruction streams hiding behind a label convention. It sits in a specific and
defensible position: a structured assembler, one level above raw assembly, with
the machine model fully visible throughout.

## The Problem It Solves

Z80 assembly is expressive. Every addressing mode, every flag condition, every
clever register assignment is available to you directly. The problem is
bookkeeping: which registers are live at this point? What is the offset of this
field into that structure? Which label marks the entry to this inner loop? What
does "count" mean in this context versus the `count` in the function three
screens up?

As a program grows, that bookkeeping noise accumulates. Comments explain what
an `ld` instruction does rather than why the algorithm does it. Field offsets
are hardcoded constants that silently break when a struct changes. Functions
share conventions only by discipline, not by enforcement.

ZAX handles the bookkeeping. Typed storage declarations give names to memory
and let the compiler compute offsets. Functions declare their return registers
and the compiler generates the preservation epilogue. Structured control flow
replaces conditional jumps to ad-hoc labels. The `:=` assignment operator reads
and writes typed storage paths — the compiler emits the IX-relative load/store
sequence, not the programmer.

You remain responsible for the algorithmic decisions: which register holds
what, why this loop structure, what invariant this sequence maintains. That is
the work that produces readable code. ZAX removes the mechanical layer so that
work can show clearly.

## Two Kinds of Transfer

A central ZAX idiom is the distinction between `:=` and raw Z80 `ld`.

`:=` is typed storage transfer. `count := hl` writes the value of HL into the
typed local `count`. `hl := count` reads it back. The compiler emits the
IX-relative load or store — typically a two-instruction EX/LD sequence because
of the Z80's constraint that H and L cannot be used directly with IX-relative
addressing. You write the intent; the compiler handles the mechanics.

`ld` is the raw Z80 instruction. `ld hl, $FF00` loads an immediate into HL.
`ld a, (hl)` dereferences HL. These are assembly mnemonics and they mean
exactly what they say. They have no knowledge of typed storage symbols.

The two forms coexist naturally in the same function body. Typed variable
access uses `:=`; raw machine-level work uses Z80 mnemonics directly. You will
see both in almost every example in this course.

## Why Algorithms

This course is organised around algorithms, not features. Each chapter
introduces ZAX constructs in the context of a real problem. Features earn their
place by being needed.

The algorithm corpus is drawn from two foundational texts: Kernighan and
Ritchie's _The C Programming Language_ and Niklaus Wirth's _Algorithms + Data
Structures = Programs_. These are not arbitrary choices. These algorithms are
short enough to hold in your head, varied enough to cover the key patterns of
structured programming, and well-understood enough that you can judge whether a
given ZAX expression is clean or awkward.

The course is also a language design instrument. Where an algorithm resists
clean ZAX expression, the friction is recorded honestly — in the prose and in
the friction log that feeds the language roadmap. A reader who completes the
course will understand both what ZAX can do cleanly and where the current
surface still asks something extra of the programmer.

## What You Will Build

Working through the course, you will read and understand ZAX programs
implementing:

- arithmetic and number theory: power, GCD, Fibonacci, integer square root,
  exponentiation by squaring, decimal digit decomposition
- sorting and searching: insertion sort, bubble sort, selection sort, binary
  search, linear search, the prime sieve of Eratosthenes
- string operations: string length, copy, compare, concatenate, reverse,
  integer-to-string and string-to-integer conversion
- bit manipulation: population count, bit reversal, parity, field extraction
- a ring buffer using exact-size record layout
- recursive algorithms: Towers of Hanoi, recursive array sum and reverse
- a complete RPN calculator assembled from helper routines
- linked list and binary search tree traversal using typed pointer fields
- the eight-queens problem as a capstone for control-flow structure

None of these are toy programs. Each one is a real implementation that
compiles and runs on Z80 hardware or a simulator. Together they constitute a
body of non-trivial ZAX code that you can study, modify, and build from.

## Assumptions

You know the Z80 instruction set and register model. You understand flags,
addressing modes, and the calling conventions of raw assembly. You have written
non-trivial Z80 programs before.

You do not need to know C, Pascal, or any high-level language. The algorithm
descriptions in each chapter are self-contained. Familiarity with the K&R and
Wirth texts is useful context but not required.

The next chapter begins where ZAX code begins: variables, types, functions, and
the first small programs.
