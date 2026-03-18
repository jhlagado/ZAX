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

## Where to Start

**New to Z80?** This course assumes Z80 knowledge. Read a Z80 primer first,
then return to Chapter 00.

**Know Z80 but new to ZAX?** Start at Chapter 00 for the design rationale,
then Chapter 01 for the first working code. If you want to dive straight into
code, Chapter 01 is self-contained.

**Already familiar with ZAX basics?** Jump to whichever chapter covers the
pattern you are working with. Each chapter's "What This Unit Teaches" section
gives a quick summary of what it covers.

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

## How to Compile and Run the Examples

The examples require the ZAX compiler. To compile a single file:

```
npm run zax -- examples/course/unit1/power.zax
```

`npm run zax` builds the compiler from source and passes arguments to the CLI.
Run `npm run build` once to pre-build, then invoke `node dist/src/cli.js`
directly for subsequent runs. The compiler emits a flat binary, an optional
Intel HEX file, a symbol listing, and a debug map — run it with `--help` to
see output options.

There is no test harness for the course examples; they are intended to be read,
compiled, and inspected. The `.asm` output (if your build is configured to emit
it) shows the generated assembly for each source file.

---

## Chapter List

| File | Chapter | What it covers |
|------|---------|----------------|
| `00-introduction.md` | Introduction | What ZAX is, why it exists, the structured assembler philosophy. No code. |
| `01-foundations.md` | Foundations | Variables, `:=` assignment, functions, `while`/`if`, `succ`/`pred`. Arithmetic and number-theory algorithms. |
| `02-arrays-and-loops.md` | Arrays and Loops | Array indexing with register operands, `break` and `continue`, the register-as-index convention. Sorting and searching. |
| `03-strings.md` | Strings | Null-terminated strings, byte-by-byte traversal, `while NZ` sentinel loops with early `break`. String algorithms. |
| `04-bit-patterns.md` | Bit Patterns | Z80 shift and logic idioms, counter-driven loops, local `op` for recurring register patterns. Bit manipulation. |
| `05-records.md` | Records | Typed aggregate state, field access, `sizeof`/`offsetof`, non-power-of-two strides. Ring buffer. |
| `06-recursion.md` | Recursion | Recursive functions, IX frame per call, preserving return values across multiple calls. Hanoi, recursive reverse and sum. |
| `07-composition.md` | Composition | `import`, module-qualified calls, `select`/`case` dispatch, software-stack discipline. RPN calculator. |
| `08-pointer-structures.md` | Pointer Structures | Typed reinterpretation (`<Type>local.field`), null-sentinel traversal, static pointer wiring. Linked list and BST. |
| `09-gaps-and-futures.md` | Gaps and Futures | Control-flow pressure, recorded language gaps, design status. Eight queens capstone. |

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
