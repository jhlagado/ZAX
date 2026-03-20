# Part 2 — Learn Z80 Programming in ZAX

No prior assembly experience required — but read [Part 1](../part1/README.md) first if you have not already. Part 1 establishes the mental model (CPU, memory, machine code, the assembler) that this volume builds on.

This volume teaches Z80 programming from scratch using ZAX as the assembler throughout. By the end you will understand how a Z80 program actually runs — registers, memory, the stack, subroutines — and you will know how to use ZAX's higher-level features to write cleaner code without giving anything up.

After Chapter 11, continue with [Part 3 — Algorithms and Data Structures in ZAX](../part3/README.md).

---

## How this volume is structured

Chapters 1–8 teach raw Z80. You write instructions directly, manage registers by hand, and build programs the way a traditional assembler expects. This is the foundation — understanding what the machine actually does.

Chapter 8 is a complete program that ties all of that together. At the end of it you will have felt the friction: keeping track of which register holds what, writing boilerplate to pass values into subroutines, inventing label names for every loop.

Chapters 9–11 show how ZAX removes that friction. Typed variables, `if`/`while`, and typed function arguments — each one introduced by showing the raw Z80 code it replaces. Nothing is hidden; you can see exactly what the compiler emits.

---

## Chapter table

| Ch | File | Phase | What it covers |
|----|------|-------|----------------|
| 1  | [Numbers and Registers](01-numbers-and-registers.md) | A | Binary and hex, the Z80 register set, register pairs |
| 2  | [Loading, Storing, Constants](02-loading-storing-constants.md) | A | `ld` addressing modes, labels, `const`, named storage |
| 3  | [Flags, Comparisons, Jumps](03-flags-comparisons-jumps.md) | A | Flag register, `cp`, `or a`, conditional and unconditional jumps |
| 4  | [Counting Loops and DJNZ](04-counting-loops-and-djnz.md) | A | `djnz`, sentinel loops, flag-exit loops, zero-count edge case |
| 5  | [Data Tables and Indexed Access](05-data-tables-and-indexed-access.md) | A | Byte/word tables, HL sequential access, IX+d displaced access |
| 6  | [Stack and Subroutines](06-stack-and-subroutines.md) | A | `call`/`ret`, the hardware stack, `push`/`pop`, register conventions |
| 7  | [I/O and Ports](07-io-and-ports.md) | A | Z80 I/O space, `in`/`out`, immediate and register-addressed port forms |
| 8  | [A Complete Program](08-a-phase-a-program.md) | A | Capstone: a full program using everything so far; shows where raw Z80 gets unwieldy |
| 9  | [Typed Storage and Assignment](09-typed-storage-and-assignment.md) | B | Typed locals, `:=` assignment, `succ`/`pred` |
| 10 | [Structured Control Flow](10-structured-control-flow.md) | B | `if`/`else`, `while`, `break`, `continue` |
| 11 | [Functions, Arguments, and Op](11-functions-arguments-and-op.md) | B | Typed parameters, typed return values, `op` |

---

## How to compile the examples

```sh
npm run zax -- learning/part2/examples/00_first_program.zax
```

Example files are under `examples/` in this directory, numbered to match their chapter.

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
