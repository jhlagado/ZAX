# Learn Z80 Programming in ZAX

Status: planned Volume 1 course
Audience: hobbyist / retro learner first, determined absolute beginner second

This directory is the planned entry point for the beginner-first ZAX course.
It is the first volume of the two-volume teaching path:

- Volume 1: learn Z80 programming in ZAX from the machine model upward
- Volume 2: continue with larger practical programs in `docs/course/`

This volume is not written yet. The current planning brief is:

- `docs/work/z80-intro-course-plan.md`

The mandatory editorial standard for all prose in this volume is:

- `docs/work/course-writing-standard.md`

## What this volume will cover

The planned arc is deliberately split in two:

- Phase A: raw-first Z80 in ZAX
- Phase B: structured ZAX as justified relief

That means early chapters stay close to ordinary Z80 programming:

- registers
- flags
- raw jumps and labels
- `djnz`
- `db` / `dw`
- `call` / `ret`

Only later chapters introduce the higher-level ZAX surface:

- typed storage and `:=`
- `if` / `while`
- `succ` / `pred`
- `break` / `continue`
- arguments, locals, and `op`

## Planned chapter map

- `00` — What a Computer Is Doing
- `01` — Numbers and the Z80 Register Set
- `02` — Loading, Storing, and Simple Constants
- `03` — Flags, Comparisons, and Jumps
- `04` — Counting Loops and `djnz`
- `05` — Data Tables and Indexed Access
- `06` — Stack and Subroutines
- `07` — A Phase A Program
- `08` — Typed Storage and Assignment
- `09` — Structured Control Flow
- `10` — Subroutines, Arguments, and `op`

## Before drafting begins

The following have now been settled or confirmed for the first tranche:

- Phase A uses a generic / abstract Z80 target rather than a machine-specific
  ROM environment
- raw user-defined labels work cleanly with:
  - `jp`
  - `jr`
  - `djnz`
  - `call`

Still open for later review:

- whether a text-level `include` feature is needed for early example sharing

## Relationship to Volume 2

After this volume, the reader should be ready to start here:

- `docs/course/README.md`
