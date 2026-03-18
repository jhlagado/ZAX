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

Mandatory companion standard:

- `docs/work/course-writing-standard.md`

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

All draft prose for this volume must satisfy the stricter editorial criteria in
`docs/work/course-writing-standard.md`.

## Teaching principle

The teaching arc for Volume 1 is now explicit:

- start with the raw machine-facing subset of ZAX
- teach labels, jumps, calls, constants, `db`, `dw`, and ordinary register use
  before higher-level conveniences
- introduce structured ZAX only after the reader has seen the bookkeeping cost
  of the raw form
- make each higher-level construct earn its place by solving a problem the
  earlier raw technique created

This means the course should not present structured forms as arbitrary syntax
upgrades. It should present them as relief from specific sources of confusion or
bookkeeping the reader has already experienced.

The early chapters therefore need an explicit contract with the reader:

- the book will first show the raw form
- then show where it becomes awkward
- then introduce the ZAX form that solves that awkwardness

## Teaching position

The beginner volume should teach ZAX as the normal assembler surface, not as an
optional improvement layered on top of a different assembler the reader is
expected to know already.

That means:

- raw Z80 mnemonics are still taught directly
- labels, low-level control flow, and raw data layout are still taught directly
- but the notation, examples, and idioms should be written in ZAX
- early chapters should stay deliberately close to conventional assembly style
- later chapters should introduce ZAX structure as a justified improvement, not
  as a replacement the reader must accept on faith

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
- confirm and demonstrate raw label targets with `jp`, `jr`, `djnz`, and `call`

### 05 — Loops

- count-controlled loops via `djnz` first
- explain the `djnz` zero-count behaviour as a real hardware semantic
- sentinel loops and hand-written branch loops
- then structured `while` as the first high-level loop relief
- `repeat ... until` only if the example corpus produces a clean must-run-once
  case; otherwise leave it out of Book 1
- `break` / `continue` as later structured relief from manual branch scaffolding
- note that a structured `for` loop is deferred and does not exist yet

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
- `if` and structured `while` as relief from jump-heavy control flow
- functions with locals/parameters introduced late, after raw calling
  conventions are already understood
- `break` / `continue` revisited in the structured surface
- `op` as the next step after repeated raw instruction sequences
- why these are better than handwritten offsets, labels, and repeated load/store
  bookkeeping

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

## Planning consequences and language checks

The following points are now explicitly part of the plan and must not be lost:

1. Raw label/jump support must be confirmed before drafting the early chapters.
   The course depends on clean support for user-defined labels with raw forms
   such as `jp label`, `jr NZ, label`, `djnz label`, and `call label`. Any gap
   here is a language or implementation issue, not a writing-time surprise.
2. A text-level `include` facility is now a tracked candidate language feature
   for Book 1. The existing module `import` system serves later, more structured
   code well, but early chapters may need a simpler way to share constants or
   raw definitions without introducing the module system too early.
3. `repeat ... until` is not part of the core Book 1 promise. It appears only
   if the example corpus produces a clean must-run-once case where it is clearly
   better than `while`.
4. A structured `for` loop remains deferred. Book 1 may mention the idea when
   discussing `djnz` and counted loops, but must not present `for` as an
   available language feature.

## Open planning questions

1. How much raw data syntax (`db`, `dw`, `ds`) should be taught before typed
   storage becomes the default?
2. What is the cleanest early example set for raw labels, jumps, and `djnz`?
3. Do the early-chapter teaching needs justify a text-level `include` feature,
   or can the examples stay clean without it?
4. Should the beginner volume be written as one book or split into smaller
   staged parts?

## Immediate next actions

1. Confirm raw label/jump support for `jp`, `jr`, `djnz`, and `call` with
   user-defined labels.
2. Review whether a text-level `include` feature is needed for the early
   examples and record the answer in design work.
3. Review and settle the chapter skeleton.
4. Create the output subtree under `docs/intro/`.
5. Choose the first tranche of beginner examples.
6. Audit the current language surface for any other raw-first teaching blockers.
