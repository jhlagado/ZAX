# Learn Z80 Programming in ZAX

Status: complete Volume 1 course
Audience: hobbyist / retro learner first, determined absolute beginner second

This directory is the entry point for the beginner-first ZAX course.
It is the first volume of the two-volume teaching path:

- Volume 1: learn Z80 programming in ZAX from the machine model upward
- Volume 2: continue with larger practical programs in `docs/course/`

The mandatory editorial standard for all prose in this volume is:

- `docs/work/course-writing-standard.md`

## How to compile and run the examples

The examples require the ZAX compiler. To compile a single file:

```
npm run zax -- examples/intro/00_first_program.zax
```

`npm run zax` builds the compiler from source and passes arguments to the CLI.
Run `npm run build` once to pre-build, then invoke `node dist/src/cli.js`
directly for subsequent runs.

## Phase A and Phase B

The volume is split into two phases.

**Phase A** (Chapters 00–07) stays close to ordinary Z80 programming. The
reader writes raw instructions, manages registers by hand, invents loop labels,
and calls subroutines with register-passing conventions documented only in
comments. Chapter 07 is the Phase A capstone: a complete program that uses
every Phase A construct and names the points where the raw approach creates
overhead.

**Phase B** (Chapters 08–10) introduces the higher-level ZAX surface as
justified relief from that overhead. Each Phase B construct is introduced by
showing exactly which Phase A cost it removes. The machine model does not
change; the compiler takes on more of the bookkeeping.

## Chapter table

| Chapter | File | Phase | What it covers |
|---------|------|-------|----------------|
| 00 | `00-what-a-computer-is-doing.md` | A | Bytes, addresses, machine code, the ZAX module shell |
| 01 | `01-numbers-and-registers.md` | A | Binary and hex, the Z80 register set, register pairs |
| 02 | `02-loading-storing-constants.md` | A | `ld` addressing modes, labels, `const`, named storage |
| 03 | `03-flags-comparisons-jumps.md` | A | Flag register, `cp`, `or a`, conditional and unconditional jumps |
| 04 | `04-counting-loops-and-djnz.md` | A | `djnz`, sentinel loops, flag-exit loops, zero-count edge case |
| 05 | `05-data-tables-and-indexed-access.md` | A | Byte/word tables, HL sequential access, IX+d displaced access |
| 06 | `06-stack-and-subroutines.md` | A | `call`/`ret`, the hardware stack, `push`/`pop`, register conventions |
| 07 | `07-a-phase-a-program.md` | A | Phase A capstone; names Phase A costs that Phase B will address |
| 08 | `08-typed-storage-and-assignment.md` | B | Typed locals, `:=` assignment, `succ`/`pred` |
| 09 | `09-structured-control-flow.md` | B | `if`/`else`, `while`, `break`, `continue` |
| 10 | `10-functions-arguments-and-op.md` | B | Typed parameters, typed return values, `op` |

Example files live under `examples/intro/` and are numbered to match their
chapter: `00_first_program.zax` through `10_functions_and_op.zax`.

## Relationship to Volume 2

After completing Chapter 10, the reader is ready to start Volume 2:

- `docs/course/README.md`
