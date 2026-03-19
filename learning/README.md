# Learning ZAX

Two volumes. Read them in order.

---

## [Part 1 — Learn Z80 Programming in ZAX](part1/README.md)

No prior assembly experience needed. Starts from scratch — bytes, registers, memory, the stack, subroutines — and works up to ZAX's higher-level features over 12 chapters.

→ [Start here if you are new to Z80 programming](part1/README.md)

---

## [Part 2 — Algorithms and Data Structures in ZAX](part2/README.md)

Teaches ZAX through classic short algorithms. Assumes the reader already understands the basic machine model — either from Part 1 or from prior Z80 experience.

Covers sorting, searching, strings, bit patterns, records, recursion, module composition, and pointer structures through real compilable programs.

→ [Start here if you already know Z80 assembly](part2/README.md)

---

## How examples work

Each part keeps its prose chapters and example source files together:

- `part1/examples/` — compilable `.zax` files for Volume 1
- `part2/examples/` — compilable `.zax` files for Volume 2

To compile any example:

```sh
npm run zax -- learning/part1/examples/00_first_program.zax
npm run zax -- learning/part2/examples/unit1/fibonacci.zax
```

Run `npm run build` once first to pre-build the compiler, then call `node dist/src/cli.js` directly for faster iteration.
