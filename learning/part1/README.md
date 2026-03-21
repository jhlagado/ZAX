# Part 1 — Learn Z80 Programming in ZAX

No prior knowledge of computers or programming assumed.

The first three chapters answer the questions that must be settled before any code makes sense: what is a computer, what is a program, and what does an assembler actually do? Chapters 4–14 teach Z80 programming from the ground up using ZAX.

Continue with [Part 2 — Algorithms and Data Structures in ZAX](../part2/README.md) when you are done.

---

## Chapter table

| Ch | File | What it covers |
|----|------|----------------|
| 1 | [The Computer](01-the-computer.md) | CPU, memory, registers, the fetch-execute cycle, I/O ports |
| 2 | [Machine Code](02-machine-code.md) | Programs as bytes, decoding a real hex program, why raw machine code is fragile |
| 3 | [The Assembler](03-the-assembler.md) | Mnemonics, a ZAX program, what ZAX produces, why ZAX goes further than a basic assembler |
| 4 | [Numbers and Registers](04-numbers-and-registers.md) | Binary, hex, the Z80 register set, first register-to-register moves |
| 5 | [Loading, Storing, Constants](05-loading-storing-constants.md) | LD instruction, immediate values, memory access with labels |
| 6 | [Flags, Comparisons, Jumps](06-flags-comparisons-jumps.md) | Flags register, CP instruction, conditional and unconditional jumps |
| 7 | [Counting Loops and DJNZ](07-counting-loops-and-djnz.md) | DJNZ instruction, counted loops, loop patterns |
| 8 | [Data Tables and Indexed Access](08-data-tables-and-indexed-access.md) | Tables in memory, IX/IY indexed addressing, lookup patterns |
| 9 | [Stack and Subroutines](09-stack-and-subroutines.md) | PUSH, POP, CALL, RET, the system stack, subroutine conventions |
| 10 | [I/O and Ports](10-io-and-ports.md) | IN, OUT, port-mapped I/O, TEC-1 hardware examples |
| 11 | [A Complete Program](11-a-phase-a-program.md) | Putting it all together: a real program from start to finish |
| 12 | [Typed Storage and Assignment](12-typed-storage-and-assignment.md) | ZAX variables, `:=` assignment, `var` declarations, typed storage |
| 13 | [Structured Control Flow](13-structured-control-flow.md) | `if`/`while`/`break`/`continue`, `select`/`case`, structured programming in ZAX |
| 14 | [Functions, Arguments, and Op](14-functions-arguments-and-op.md) | ZAX functions, typed parameters, `op` for inline expansion |

Example files are under `examples/` in this directory. The examples are numbered
starting from `00` and correspond to chapters starting from Chapter 3:
`00_first_program.zax` goes with Chapter 3, `01_register_moves.zax` with
Chapter 4, and so on. Chapters 1 and 2 have no example files — they cover
concepts that precede writing code.

---

## How to compile the examples

```sh
npm run zax -- learning/part1/examples/01_register_moves.zax
```

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
