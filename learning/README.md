# Learning ZAX

Two parts. Read them in order.

If you want the whole learning corpus as one GitHub-readable document, use [Learning Book](BOOK.md).

---

## [Part 1 — Learn Z80 Programming in ZAX](part1/README.md)

No prior knowledge assumed. Starts with what a computer actually is, what a program looks like in memory, and what an assembler does — then teaches Z80 programming from scratch over 14 chapters, working up to ZAX's higher-level features.

> [Start here](part1/README.md)

---

## [Part 2 — Algorithms and Data Structures in ZAX](part2/README.md)

Teaches ZAX through classic short algorithms. Assumes you understand the basic machine model — either from Part 1 or from prior Z80 experience.

Covers sorting, searching, strings, bit patterns, records, recursion, module composition, and pointer structures through real compilable programs.

> [Continue here after Part 1](part2/README.md)

---

## [Appendices — Global Reference](appendices/README.md)

Course-wide lookup material for both parts: number notation, ASCII, registers,
flags, condition codes, addressing forms, prefix families, and a searchable
classic Z80 instruction support table.

> [Use these as reference while reading either part](appendices/README.md)

---

## How examples work

Each part keeps its prose chapters and example source files together:

- `part1/examples/` — compilable `.zax` files for Part 1
- `part2/examples/` — compilable `.zax` files for Part 2

To compile any example:

```sh
npm run zax -- learning/part1/examples/00_first_program.zax
npm run zax -- learning/part2/examples/unit1/fibonacci.zax
```

Run `npm run build` once first to pre-build the compiler, then call `node dist/src/cli.js` directly for faster iteration.
