# Learning ZAX

Three parts. Read them in order.

---

## [Part 1 — The Computer](part1/README.md)

No prior knowledge assumed. Covers what a computer actually is, what a program looks like in memory, and what an assembler does. Three short chapters. Establishes the mental model that everything else builds on.

→ [Start here](part1/README.md)

---

## [Part 2 — Learn Z80 Programming in ZAX](part2/README.md)

No prior assembly experience required, but read Part 1 first. Starts from scratch — bytes, registers, memory, the stack, subroutines — and works up to ZAX's higher-level features over 11 chapters.

→ [Continue here after Part 1](part2/README.md)

---

## [Part 3 — Algorithms and Data Structures in ZAX](part3/README.md)

Teaches ZAX through classic short algorithms. Assumes you understand the basic machine model — either from Parts 1 and 2 or from prior Z80 experience.

Covers sorting, searching, strings, bit patterns, records, recursion, module composition, and pointer structures through real compilable programs.

→ [Continue here after Part 2](part3/README.md)

---

## How examples work

Each part keeps its prose chapters and example source files together:

- `part2/examples/` — compilable `.zax` files for Part 2
- `part3/examples/` — compilable `.zax` files for Part 3

To compile any example:

```sh
npm run zax -- learning/part2/examples/00_first_program.zax
npm run zax -- learning/part3/examples/unit1/fibonacci.zax
```

Run `npm run build` once first to pre-build the compiler, then call `node dist/src/cli.js` directly for faster iteration.
