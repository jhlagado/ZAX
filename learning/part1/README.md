# Part 1 — Learn Z80 Programming in ZAX

No prior knowledge of computers or programming assumed.

The first two chapters describe the machine and what a program looks like as raw bytes. Chapter 3 introduces assembly language and the ZAX program structure. Chapters 4–9 teach raw Z80 programming. Chapters 10–13 introduce ZAX-specific features: functions with IX frames, structured control flow, typed assignment, and op macros.

Continue with [Part 2 — Algorithms and Data Structures in ZAX](../part2/README.md) when you are done.

---

## Learning arc

Chapters 1 and 2 cover the machine before any code: how the CPU fetches and executes bytes, what a program looks like as raw hex, and why raw hex is unmanageable to write by hand. Chapter 3 introduces the Z80 instruction set and the ZAX source format. Chapters 4 through 8 extend it — flags and branches, counted loops, data tables, the stack and subroutines, port I/O. By Chapter 8 you can write raw Z80 programs that read hardware and manage memory directly.

Chapter 9 is a hinge. A complete program, built from the techniques from Chapters 3–7, exposes the friction in raw Z80 programming: labels accumulate, the same IX offset appears across several instructions, every subroutine entry begins with push/pop sequences to protect caller registers. The code works. The friction is real.

Chapters 10 through 13 each address one of those friction points. Chapter 10 introduces ZAX functions with IX frames — typed parameters and locals replace bare offset arithmetic. Chapter 11 replaces the `jr`/`jp` label machinery with `if`, `while`, and `select`. Chapter 12 adds `:=` for loads and stores to frame slots, collapsing multi-instruction sequences to one line. Chapter 13 introduces `op` macros for instruction sequences you name and inline.

By Chapter 9 you can read and write any raw Z80 program. By Chapter 13 you can write ZAX functions that compile to tight Z80 and read almost like a high-level language — while retaining access to every raw instruction when you need it.

---

## Chapter table

| Ch | File | What it covers |
|----|------|----------------|
| 1 | [The Computer](01-the-computer.md) | CPU, memory, registers, the fetch-execute cycle |
| 2 | [Machine Code](02-machine-code.md) | Programs as bytes, decoding a real hex program, why raw machine code is fragile |
| 3 | [Assembly Language](03-assembly-language.md) | LD instruction, ZAX program structure, signed/unsigned, constants, named storage |
| 4 | [Flags, Comparisons, Jumps](04-flags-comparisons-jumps.md) | Flags register, CP instruction, conditional and unconditional jumps |
| 5 | [Counting Loops and DJNZ](05-counting-loops-and-djnz.md) | DJNZ instruction, counted loops, loop patterns |
| 6 | [Data Tables and Indexed Access](06-data-tables-and-indexed-access.md) | Tables in memory, HL sequential access, IX indexed access, EX DE,HL, LDIR |
| 7 | [Stack and Subroutines](07-stack-and-subroutines.md) | PUSH, POP, CALL, RET, the system stack, subroutine conventions |
| 8 | [I/O and Ports](08-io-and-ports.md) | IN, OUT, port-mapped I/O, TEC-1 hardware examples |
| 9 | [A Complete Program](09-a-phase-a-program.md) | Putting it all together: a real program from start to finish |
| 10 | [Functions and the IX Frame](10-functions-and-the-ix-frame.md) | ZAX `func`, typed parameters, locals, raw IX-relative access |
| 11 | [Structured Control Flow](11-structured-control-flow.md) | `if`/`while`/`break`/`continue`, `select`/`case` |
| 12 | [Typed Assignment](12-typed-assignment.md) | `:=` operator, `step`, the convenience layer over raw IX access |
| 13 | [Op Macros and Pseudo-opcodes](13-op-macros-and-pseudo-opcodes.md) | `op` for inline expansion, synthetic 16-bit register moves |

Example files are under `examples/` in this directory. Examples `00` through `02`
accompany Chapter 3. From `03` onward, each example corresponds to the next
chapter: `03_flag_tests_and_jumps.zax` goes with Chapter 4,
`04_djnz_loops.zax` with Chapter 5, and so on. Chapters 1 and 2 have no
example files — they cover concepts that precede writing code.

---

## How to compile the examples

```sh
npm run zax -- learning/part1/examples/01_register_moves.zax
```

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
