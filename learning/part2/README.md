# Part 2 — Algorithms and Data Structures in ZAX

**New to Z80?** Start with [Part 1](../part1/README.md) first.

This part is for readers who already understand the Z80 basics — either from Part 1 or from prior Z80 experience. Each chapter works through a real algorithm or data structure in ZAX, covering one area of the language as it comes up naturally.

---

## Chapter table

| Ch | File | What it covers |
|----|------|----------------|
| 1  | [Foundations](01-foundations.md) | Variables, `:=` assignment, functions, `while`/`if`, `succ`/`pred`. Arithmetic algorithms. |
| 2  | [Arrays and Loops](02-arrays-and-loops.md) | Array indexing, `break` and `continue`. Sorting and searching. |
| 3  | [Strings](03-strings.md) | Null-terminated strings, byte-by-byte traversal, sentinel loops. String algorithms. |
| 4  | [Bit Patterns](04-bit-patterns.md) | Shift and logic instructions, `op` for reusable register patterns. Bit manipulation. |
| 5  | [Records](05-records.md) | Structs, field access, `sizeof`/`offsetof`. Ring buffer. |
| 6  | [Recursion](06-recursion.md) | Recursive functions, the IX stack frame, preserving return values. Tower of Hanoi, recursive reverse and sum. |
| 7  | [Composition](07-composition.md) | `import`, module-qualified calls, `select`/`case`. RPN calculator. |
| 8  | [Pointer Structures](08-pointer-structures.md) | Typed reinterpretation, unions, linked list, binary search tree. |
| 9  | [Gaps and Futures](09-gaps-and-futures.md) | What ZAX can't yet do, known language gaps, eight queens capstone. |

Each chapter's examples are in a matching subdirectory: Chapter 1's examples
are in `examples/unit1/`, Chapter 2's in `examples/unit2/`, and so on.

---

## How to compile the examples

```sh
npm run zax -- learning/part2/examples/unit1/fibonacci.zax
```

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
