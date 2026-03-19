# Part 2 — Algorithms and Data Structures in ZAX

**New to Z80?** Start with [Part 1](../part1/README.md) first.

This part is for readers who already understand the Z80 basics — either from Part 1 or from prior Z80 experience. Each chapter works through a real algorithm or data structure in ZAX, covering one area of the language as it comes up naturally.

---

## Chapter table

| Ch | File | What it covers |
|----|------|----------------|
| 00 | [Introduction](00-introduction.md) | What ZAX is and why it exists. No code. |
| 01 | [Foundations](01-foundations.md) | Variables, `:=` assignment, functions, `while`/`if`, `succ`/`pred`. Arithmetic algorithms. |
| 02 | [Arrays and Loops](02-arrays-and-loops.md) | Array indexing, `break` and `continue`. Sorting and searching. |
| 03 | [Strings](03-strings.md) | Null-terminated strings, byte-by-byte traversal, sentinel loops. String algorithms. |
| 04 | [Bit Patterns](04-bit-patterns.md) | Shift and logic instructions, `op` for reusable register patterns. Bit manipulation. |
| 05 | [Records](05-records.md) | Structs, field access, `sizeof`/`offsetof`. Ring buffer. |
| 06 | [Recursion](06-recursion.md) | Recursive functions, the IX stack frame, preserving return values. Tower of Hanoi, recursive reverse and sum. |
| 07 | [Composition](07-composition.md) | `import`, module-qualified calls, `select`/`case`. RPN calculator. |
| 08 | [Pointer Structures](08-pointer-structures.md) | Typed reinterpretation, unions, linked list, binary search tree. |
| 09 | [Gaps and Futures](09-gaps-and-futures.md) | What ZAX can't yet do, known language gaps, eight queens capstone. |

Chapter 00 is an introduction with no example file. Chapter 01's examples are in `examples/unit1/`, Chapter 02's in `examples/unit2/`, and so on.

---

## How to compile the examples

```sh
npm run zax -- learning/part2/examples/unit1/fibonacci.zax
```

Example files are under `examples/` in this directory, organised by unit.

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
