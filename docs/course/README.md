# ZAX Algorithms Course

This course teaches ZAX through classic short algorithms drawn from Kernighan
and Ritchie's _The C Programming Language_ and Niklaus Wirth's _Algorithms +
Data Structures = Programs_. It is not a language reference and not a Z80
tutorial. It is a guided reading of real ZAX programs, organised around
problems rather than features.

The intended reader knows Z80 assembly. They are new to ZAX and want to
understand what the structured assembler model offers, where it pays off, and
where it still asks something of the programmer.

---

## How to Read This Course

Each chapter is paired with example files under `examples/course/`. Read the
chapter prose first, then open the source files it references. The prose
explains the algorithm, the data model, and the ZAX idioms in play; the source
files show how that all looks in a complete, compilable program.

The chapters introduce syntax as it becomes necessary. They do not survey the
language top-to-bottom. Features earn their introduction by appearing in code
that needs them.

---

## Chapter List

| File | Chapter | Coverage |
|------|---------|----------|
| `00-introduction.md` | Introduction | What ZAX is and why it exists; the structured assembler philosophy; course overview. No code yet. |
| `01-foundations.md` | Foundations | Variables, types, `:=` assignment, functions, basic control flow. Arithmetic and number-theory algorithms from unit 1. |
| `02-arrays-and-loops.md` | Arrays and Loops | Array declaration and indexing, `while`/`repeat`, `break` and `continue`, the register-as-index convention. Sorting and searching algorithms from unit 2. |
| `03-strings.md` | Strings | Pointer-based traversal, null-terminated scanning, `repeat`/`until`. String algorithms from unit 3. |
| `04-bit-patterns.md` | Bit Patterns | Shift idioms, `op` with immediate matchers. Bit-manipulation algorithms from unit 4. |
| `05-records.md` | Records | Typed aggregate state, field access, `sizeof`/`offsetof`. Ring buffer from unit 5. |
| `06-recursion.md` | Recursion | Recursive functions, IX frame discipline, argument passing. Tower of Hanoi and recursive array operations from unit 6. |
| `07-composition.md` | Composition | How a larger program assembles from helper routines, typed storage, and a support module. RPN calculator from unit 7. |
| `08-pointer-structures.md` | Pointer Structures | Pointer fields, typed reinterpretation, traversal patterns, fixed-pool allocation. Linked list and BST from unit 8. |
| `09-gaps-and-futures.md` | Gaps and Futures | Control-flow pressure, language limits, and what comes next. Eight queens from unit 9. |

---

## Chapter and Unit Numbering

Chapter numbers are offset from example unit numbers because chapter 00 is a
course introduction with no corresponding example unit.

- Chapter `00` — course introduction (no example unit)
- Chapter `01` — draws on `examples/course/unit1/`
- Chapter `02` — draws on `examples/course/unit2/`
- Chapter `03` — draws on `examples/course/unit3/`
- ...and so on through chapter `09` and `unit9/`

This offset is consistent throughout. When a chapter says "see
`examples/course/unit2/binary_search.zax`", the `unit2/` directory
corresponds to chapter `02`.
