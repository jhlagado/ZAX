# Learn Z80 Programming in ZAX — Course Plan

Status: planning brief
Audience: course author, writer, reviewer

## Purpose

This document is the operational planning brief for the planned beginner-facing
volume:

- **Learn Z80 Programming in ZAX**

It is the first-stage course.

The existing `docs/course/` material remains the second-stage algorithms volume.

Planned output location:

- `docs/intro/`

## Target reader

Primary reader:

- the hobbyist / retro learner with limited prior low-level experience

Secondary reader:

- the determined absolute beginner

The volume should therefore assume:

- little or no Z80 knowledge
- little or no assembly-language experience
- some willingness to learn technical concepts progressively
- interest in understanding how programs run at the machine level

The course should therefore teach:

- machine model first
- assembly reasoning second
- structured ZAX power gradually

## Teaching position

The beginner volume should teach ZAX as the normal assembler surface, not as an
optional improvement layered on top of a different assembler the reader is
expected to know already.

That means:

- raw Z80 mnemonics are still taught directly
- labels, low-level control flow, and raw data layout are still taught directly
- but the notation, examples, and idioms should be written in ZAX

## Learning outcomes

By the end of Volume 1, the reader should be able to:

- explain bytes, words, addresses, ROM, RAM, and memory maps
- explain two's complement and flag behaviour
- use the Z80 register set and register pairs
- write small loops, branches, and subroutines
- understand stack use and call/return discipline
- read and write small raw assembly routines in ZAX
- understand why and when to use structured ZAX features such as:
  - typed storage
  - `:=`
  - `if`
  - `while`
  - `break` / `continue`
  - `succ` / `pred`
  - functions
  - `op`

At that point the reader is ready for the algorithms volume.

## Proposed chapter skeleton

This is the current planning shape, not final prose:

### 00 — What a computer is doing

- machine code vs assembly language
- bytes and words
- memory as addressed storage
- code vs data

### 01 — Numbers and two's complement

- unsigned vs signed interpretation
- binary and hexadecimal
- overflow intuition
- why flags matter

### 02 — The Z80 register set

- A, general registers, register pairs
- HL as the common working pair
- SP, PC, IX, IY at a conceptual level

### 03 — Loading, storing, and moving data

- raw `ld`
- labels and named storage
- simple constants
- first small data-moving programs

### 04 — Flags, comparisons, and branches

- Z, C, NZ, NC
- `cp`, `or a`, arithmetic-driven tests
- labels and jump-based control flow first

### 05 — Loops

- count-controlled loops
- sentinel loops
- hand-written branch loops
- then structured `while` / `repeat`
- later in the chapter: `break` / `continue` as structured relief from manual
  branch scaffolding

### 06 — Memory layout and simple data

- `db`, `dw`, simple tables
- strings as bytes
- ROM constants vs RAM variables
- first clear bridge into typed storage

### 07 — Stack and subroutines

- `call`, `ret`, stack growth
- saving registers
- simple reusable routines
- first function-shaped ZAX code

### 08 — Ports, I/O, and restart conventions

- ports
- `in` / `out`
- ROM entry points
- restart instructions

### 09 — Structured ZAX as relief from bookkeeping

- typed storage
- `:=`
- `succ` / `pred`
- functions with locals/parameters
- `if`, `while`
- `break` / `continue` revisited in the structured surface
- `op` as the next step after repeated raw instruction sequences
- why these are better than handwritten offsets and labels

### 10 — Bridge to the algorithms volume

- one or two integrative programs larger than the earlier teaching fragments
- explicit comparison between the raw-first style from early chapters and the
  structured ZAX style the reader can now use
- direct handoff to `docs/course/README.md`
- clear statement of what Volume 2 assumes and why the reader is now ready for it

## Example style

The beginner volume should use:

- smaller examples than the algorithms volume
- more single-purpose programs
- more direct hardware and machine-model exposition
- fewer large algorithm jumps early on

The goal is concept scaffolding, not maximal density.

## Relationship to Volume 2

After Volume 1, the reader should be ready for:

- `docs/course/README.md`

Volume 2 should be referenced explicitly as:

- the algorithms-and-data-structures companion
- the next stage after the machine-model foundations are in place

## Open planning questions

1. How much raw data syntax (`db`, `dw`, `ds`) should be taught before typed
   storage becomes the default?
2. How early should structured forms appear relative to label-based raw loops?
3. Do any raw-first examples expose language rough edges that need design work?
4. Should the beginner volume be written as one book or split into smaller
   staged parts?

## Immediate next actions

1. Review and settle the chapter skeleton.
2. Create the output subtree under `docs/intro/`.
3. Choose the first tranche of beginner examples.
4. Audit the current language surface for any raw-first teaching blockers.
