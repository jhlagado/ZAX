# Part 2 — Algorithms and Data Structures in ZAX

Status: complete Volume 2 course

This course teaches ZAX through classic short algorithms. It is not a language reference and not a Z80 tutorial. It is a guided reading of real ZAX programs, organised around problems rather than features.

The intended reader either:
- already knows Z80 assembly and is learning ZAX, or
- has completed [Part 1](../part1/README.md) and is ready for larger examples.

**New to Z80?** Start with [Part 1](../part1/README.md) first.

---

## Chapter table

| Ch | File | What it covers |
|----|------|----------------|
| 00 | [Introduction](00-introduction.md) | What ZAX is, why it exists, the structured assembler philosophy. No code. |
| 01 | [Foundations](01-foundations.md) | Variables, `:=` assignment, functions, `while`/`if`, `succ`/`pred`. Arithmetic and number-theory algorithms. |
| 02 | [Arrays and Loops](02-arrays-and-loops.md) | Array indexing with register operands, `break` and `continue`, the register-as-index convention. Sorting and searching. |
| 03 | [Strings](03-strings.md) | Null-terminated strings, byte-by-byte traversal, `while NZ` sentinel loops with early `break`. String algorithms. |
| 04 | [Bit Patterns](04-bit-patterns.md) | Z80 shift and logic idioms, counter-driven loops, local `op` for recurring register patterns. Bit manipulation. |
| 05 | [Records](05-records.md) | Typed aggregate state, field access, `sizeof`/`offsetof`, non-power-of-two strides. Ring buffer. |
| 06 | [Recursion](06-recursion.md) | Recursive functions, IX frame per call, preserving return values across multiple calls. Hanoi, recursive reverse and sum. |
| 07 | [Composition](07-composition.md) | `import`, module-qualified calls, `select`/`case` dispatch, software-stack discipline. RPN calculator. |
| 08 | [Pointer Structures](08-pointer-structures.md) | Typed reinterpretation (`<Type>local.field`), unions, null-sentinel traversal, static pointer wiring. Linked list, BST, register-pair overlay. |
| 09 | [Gaps and Futures](09-gaps-and-futures.md) | Control-flow pressure, recorded language gaps, design status. Eight queens capstone. |

Chapter numbers are offset from example unit numbers because Chapter 00 is a course introduction with no corresponding example unit. Chapter 01 draws on `examples/unit1/`, Chapter 02 on `examples/unit2/`, and so on.

---

## How to compile the examples

```sh
npm run zax -- learning/part2/examples/unit1/fibonacci.zax
```

Example files are under `examples/` in this directory, organised by unit.

---

## Editorial standard

All prose in this volume is held to [`docs/work/course-writing-standard.md`](../../docs/work/course-writing-standard.md).
