# Part 1 — Learn Z80 Programming in ZAX

No prior knowledge of computers or programming assumed.

The first two chapters describe the machine and what a program looks like as raw bytes. Chapter 3 introduces assembly language and the ZAX program structure. Chapters 4–10 teach raw Z80 programming. Chapters 11–14 introduce ZAX-specific features: functions with IX frames, structured control flow, typed assignment, and op macros.

Continue with [Part 2 — Algorithms and Data Structures in ZAX](../part2/README.md) when you are done.

---

## Learning arc

Chapters 1 and 2 cover the machine before any code: how the CPU fetches and executes bytes, what a program looks like as raw hex, and why raw hex is unmanageable to write by hand. Chapter 3 introduces assembly language and the ZAX source format. Chapter 4 extends `ld` to cover memory access forms and explains how the Z80 represents signed and unsigned values. Chapters 5 through 9 extend the instruction set further — flags and branches, counted loops, data tables, the stack and subroutines, port I/O. By Chapter 9 you can write raw Z80 programs that read hardware and manage memory directly.

Chapter 10 is a hinge. A complete program, built from the techniques from Chapters 3–9, exposes the friction in raw Z80 programming: labels accumulate, the same IX offset appears across several instructions, every subroutine entry begins with push/pop sequences to protect caller registers. The code works. The friction is real.

Chapters 11 through 14 each address one of those friction points. Chapter 11 introduces ZAX functions with IX frames — typed parameters and locals replace bare offset arithmetic. Chapter 12 replaces the `jr`/`jp` label machinery with `if`, `while`, and `select`. Chapter 13 adds `:=` for loads and stores to frame slots, collapsing multi-instruction sequences to one line. Chapter 14 introduces `op` macros for instruction sequences you name and inline.

By Chapter 10 you can read and write any raw Z80 program. By Chapter 14 you can write ZAX functions that compile to tight Z80 and read almost like a high-level language — while retaining access to every raw instruction when you need it.

---

## Chapter table

| Ch | File | What it covers |
|----|------|----------------|
| 1 | [The Computer](01-the-computer.md) | CPU, memory, registers, the fetch-execute cycle |
| 2 | [Machine Code](02-machine-code.md) | Programs as bytes, decoding a real hex program, why raw machine code is fragile |
| 3 | [Assembly Language](03-assembly-language.md) | ZAX program structure, `ld` (register-to-register and immediate), constants, named storage |
| 4 | [Memory Access and Data](04-memory-access-and-data.md) | `(HL)`, `(BC)`, `(DE)`, direct memory access, LD forms table, signed/unsigned values |
| 5 | [Flags, Comparisons, Jumps](05-flags-comparisons-jumps.md) | Flags register, `cp` instruction, conditional and unconditional jumps |
| 6 | [Counting Loops and DJNZ](06-counting-loops-and-djnz.md) | `djnz` instruction, counted loops, loop patterns |
| 7 | [Data Tables and Indexed Access](07-data-tables-and-indexed-access.md) | Tables in memory, HL sequential access, IX indexed access, `ex de, hl`, `ldir` |
| 8 | [Stack and Subroutines](08-stack-and-subroutines.md) | `push`, `pop`, `call`, `ret`, the system stack, subroutine conventions |
| 9 | [I/O and Ports](09-io-and-ports.md) | `in`, `out`, port-mapped I/O, TEC-1 hardware examples |
| 10 | [A Complete Program](10-a-phase-a-program.md) | Putting it all together: a real program from start to finish |
| 11 | [Functions and the IX Frame](11-functions-and-the-ix-frame.md) | ZAX `func`, typed parameters, locals, raw IX-relative access |
| 12 | [Structured Control Flow](12-structured-control-flow.md) | `if`/`while`/`break`/`continue`, `select`/`case` |
| 13 | [Typed Assignment](13-typed-assignment.md) | `:=` operator, `step`, the convenience layer over raw IX access |
| 14 | [Op Macros and Pseudo-opcodes](14-op-macros-and-pseudo-opcodes.md) | `op` for inline expansion, synthetic 16-bit register moves |

Example files are under `examples/` in this directory. Examples `00` and `01`
accompany Chapter 3; example `02` accompanies Chapter 4. From `03` onward,
each example corresponds to the next chapter: `03_flag_tests_and_jumps.zax`
goes with Chapter 5, `04_djnz_loops.zax` with Chapter 6, and so on. Chapters
1 and 2 have no example files — they cover concepts that precede writing code.

---

## How to compile the examples

```sh
npm run zax -- learning/part1/examples/01_register_moves.zax
```

---

## Hardware and emulator setup

### Target system

The course is platform-agnostic. The programs in Part 1 target a Z80 with ROM starting at `$0000` and RAM starting at `$8000` — the same memory map described in Chapter 1. They do not rely on any specific hardware beyond that. Port I/O examples in Chapter 9 use TEC-1 port addresses as concrete numbers, but the concepts apply to any Z80 system.

### Emulator

You need a Z80 emulator that shows you registers and memory at each step. Any emulator that exposes these will work. Two options that fit the course:

- **FUSE** (free, cross-platform): a reference-accurate Z80 emulator with a debugger interface.
- **ZEsarUX** (free, cross-platform): a multi-machine emulator that includes a full Z80 debugger with memory inspection, step mode, and watchpoints.

For the TEC-1 I/O examples specifically, the **TEC-1 emulator** available at [git.io/tec1](https://github.com/jhlagado/tec-1) provides accurate port behaviour and a display panel matching the real hardware.

Any emulator will do for Chapters 1–8 and 10–14. Port behaviour matters only in Chapter 9.

### Verifying a program ran correctly

After assembling and loading a program into the emulator:

1. **Single-step the first several instructions** using the emulator's step mode. Confirm each register holds the value you expect before moving to the next instruction.
2. **Check memory at the target address** after the program halts. For the Chapter 3 example `00_first_program.zax`, address `$8000` should contain `$08` after the program runs. For the Chapter 4 example `02_constants_and_labels.zax`, `$8000` should hold `$0A`, `$8001` should hold `$34`, and `$8002` should hold `$12`.
3. **Inspect the flags register** whenever a jump goes the wrong way. The emulator's register panel shows each flag bit; compare what you see to what Chapter 5 says the instruction should produce.

If the program does not halt or produces wrong values, the debugging steps in Chapter 3 ("When Your Program Does the Wrong Thing") give a systematic method for tracing the failure.

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
