# Part 1 — Learn Z80 Programming in ZAX

Status: complete Volume 1 course
Audience: hobbyist / retro learner first, determined absolute beginner second

This is the first volume of the two-volume ZAX teaching path. It teaches Z80 programming from the machine model upward, using ZAX as the assembler surface throughout. No prior assembly experience assumed.

After completing Chapter 11, continue with [Part 2 — Algorithms and Data Structures in ZAX](../part2/README.md).

---

## Phase A and Phase B

**Phase A** (Chapters 00–08) stays close to ordinary Z80 programming. The reader writes raw instructions, manages registers by hand, invents loop labels, and calls subroutines with register-passing conventions documented only in comments. Chapter 07 covers the Z80 I/O model. Chapter 08 is the Phase A capstone: a complete program that uses every Phase A construct and names the points where the raw approach creates overhead.

**Phase B** (Chapters 09–11) introduces the higher-level ZAX surface as justified relief from that overhead. Each Phase B construct is introduced by showing exactly which Phase A cost it removes.

---

## Chapter table

| Ch | File | Phase | What it covers |
|----|------|-------|----------------|
| 00 | [What a Computer Is Doing](00-what-a-computer-is-doing.md) | A | Bytes, addresses, machine code, the ZAX module shell |
| 01 | [Numbers and Registers](01-numbers-and-registers.md) | A | Binary and hex, the Z80 register set, register pairs |
| 02 | [Loading, Storing, Constants](02-loading-storing-constants.md) | A | `ld` addressing modes, labels, `const`, named storage |
| 03 | [Flags, Comparisons, Jumps](03-flags-comparisons-jumps.md) | A | Flag register, `cp`, `or a`, conditional and unconditional jumps |
| 04 | [Counting Loops and DJNZ](04-counting-loops-and-djnz.md) | A | `djnz`, sentinel loops, flag-exit loops, zero-count edge case |
| 05 | [Data Tables and Indexed Access](05-data-tables-and-indexed-access.md) | A | Byte/word tables, HL sequential access, IX+d displaced access |
| 06 | [Stack and Subroutines](06-stack-and-subroutines.md) | A | `call`/`ret`, the hardware stack, `push`/`pop`, register conventions |
| 07 | [I/O and Ports](07-io-and-ports.md) | A | Z80 I/O space, `in`/`out`, immediate and register-addressed port forms |
| 08 | [A Phase A Program](08-a-phase-a-program.md) | A | Phase A capstone; names Phase A costs that Phase B will address |
| 09 | [Typed Storage and Assignment](09-typed-storage-and-assignment.md) | B | Typed locals, `:=` assignment, `succ`/`pred` |
| 10 | [Structured Control Flow](10-structured-control-flow.md) | B | `if`/`else`, `while`, `break`, `continue` |
| 11 | [Functions, Arguments, and Op](11-functions-arguments-and-op.md) | B | Typed parameters, typed return values, `op` |

---

## How to compile the examples

```sh
npm run zax -- learning/part1/examples/00_first_program.zax
```

Example files are under `examples/` in this directory, numbered to match their chapter.

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
