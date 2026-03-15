# ZAX Algorithms Course — Outline, Goals, and Design Rationale

*Status: proposal / designer briefing*
*Audience: language designer, contributors, course authors*

---

## 1. Purpose

This document proposes a structured course in ZAX built around classic short algorithms from two foundational texts:

- **Kernighan and Ritchie**, *The C Programming Language* (K&R)
- **Niklaus Wirth**, *Algorithms + Data Structures = Programs* (Wirth)

The goal is not to translate C or Pascal into assembly. The goal is to discover — through concrete, well-understood problems — what ZAX can say cleanly, what it says awkwardly, and what it cannot yet say at all.

This is a **language design feedback instrument** as much as it is a course. The algorithm examples should be treated as probes. Each algorithm that resists clean ZAX expression is a signal: either the language is missing a construct, or a current construct has the wrong shape.

---

## 2. Why This Approach

### 2.1 The K&R and Wirth Canon

K&R and Wirth were chosen deliberately. These are not arbitrary examples. They represent a half-century of consensus about which small programs are genuinely instructive — programs that are short enough to hold in your head, varied enough to cover the key patterns of structured programming, and deep enough to reveal whether a language can carry real work.

K&R introduces structured programming at the machine boundary. Its examples — binary search, string operations, the RPN calculator, the storage allocator — are C programs but they are also architecture programs. They care about memory layout, register width, pointer arithmetic, and the cost of an operation.

Wirth goes further into algorithmic structure: sorting families, recursive decomposition, tree traversal, Towers of Hanoi. His examples reveal whether a structured assembler can express non-trivial control flow without collapsing into spaghetti.

Together, they cover the territory that matters for ZAX: programs that are too large for raw assembly but too close to the machine for a high-level language.

### 2.2 Not a Z80 Tutorial

This is not a course about Z80 hardware. Readers are assumed to know the Z80 instruction set and register model. The course is about **using ZAX** to write programs that are:

- readable six months later
- refactorable when requirements change
- inspectable — the reader can trace from source to output binary

### 2.3 Not a Language Survey

The course is not organized around ZAX features. It is organized around **problems**. Feature coverage emerges from the demands of the algorithms. This prevents the course from becoming a reference manual in disguise, and ensures that each feature is introduced in a context where it earns its place.

---

## 3. Course Goals

1. **Demonstrate ZAX as a viable medium for structured systems programming on Z80.** The completed example suite should stand as a body of non-trivial ZAX code that readers can study, run, and modify.

2. **Surface language shortcomings through use.** Each algorithm that fails to express cleanly is a candidate for a language change. The course is the first large-scale ZAX use case. Its friction points feed directly into the language roadmap.

3. **Establish a style.** ZAX code has a distinctive voice — it is assembly, but structured. The examples should model that voice consistently. Future ZAX authors will learn the idiom by reading these examples.

4. **Validate the design decisions already made.** The `move`/`ld` split, typed storage, `select`, `op` — these features exist because design arguments said they were needed. The algorithms will confirm or challenge those arguments with actual code.

5. **Identify the design decisions not yet made.** Missing features will announce themselves as comments, workarounds, or hand-lowered sequences in the examples. These become the input to the next design cycle.

---

## 4. Style Guide for Course Examples

Every example in the course must follow these conventions.

### 4.1 Typed Storage First

All named values live in typed storage — `byte`, `word`, `addr`, records, arrays — declared in `section data` blocks or function `var` blocks. Raw `db`/`dw`/`ds` directives are reserved for literal tables and interface constants, not for working data.

### 4.2 Structured Control Flow Always

Never use conditional jumps to structured labels as a substitute for `if`/`while`/`repeat`/`select`. The only unconditional jumps in an example should be those the reader needs to see — tail calls, dispatch tables, hardware vectors.

### 4.3 Functions for Every Named Operation

Every algorithm has at least one named function. Helper routines that are called from more than one place are always `func` or `op` definitions — never copy-pasted instruction sequences with a comment.

### 4.4 Comments Explain the Algorithm, Not the Instruction

Assembly comments that explain what a single instruction does are noise. Comments in the course examples explain algorithmic decisions: why this loop structure, why this register assignment, what invariant this sequence maintains.

### 4.5 `op` for Reusable Instruction Families

When an idiom recurs across more than one function — a byte-load-and-advance, a compare-and-swap, a rotate-and-mask — it is factored into an `op`. This is the correct use of `op`: not abbreviation, but reusable named instruction families.

### 4.6 One Clear Register Contract Per Function

Every function documents its register contract in a header comment: which input registers carry arguments beyond the declared parameters, which registers are clobbered, which are preserved. The Z80 has eight-bit registers and calling conventions are not enforced by hardware — the course models discipline.

### 4.7 No Unexplained Magic

Any hand-optimized sequence that diverges from the obvious straightforward implementation must be accompanied by a comment explaining the transformation and its cost rationale. The course teaches optimization as a deliberate act, not a reflex.

---

## 5. Algorithm Catalogue

Algorithms are organized in four tiers by dependency on language features not yet implemented. The tier is a planning signal, not a permanent ranking.

### Tier 1 — Available Now

These algorithms can be written in clean ZAX today using the current normative surface: typed storage, `func`, `if`/`while`/`repeat`/`select`, `op`, `const`, `enum`, arrays, records.

#### 1A: Arithmetic and Number Theory

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Integer power by repeated multiplication | K&R §1.2 | `func`, `while`, `word` parameters |
| Euclid's GCD (iterative) | Wirth Ch.1 | `while`, remainder via subtraction loop |
| Euclid's GCD (recursive) | Wirth Ch.1 | recursive `func`, register discipline |
| Integer square root (Newton step) | Wirth Ch.1 | `while`, convergence test |
| Exponentiation by squaring | Wirth Ch.1 | `if`, halving loop, shift |
| Fibonacci (iterative) | Wirth Ch.1 | `while`, two-variable rolling state |
| Prime sieve of Eratosthenes | Wirth Ch.5 | `byte[]`, nested `for`-style `while`, `select` |
| Decimal digit decomposition | K&R §1.2 | division by 10, character output |

#### 1B: Sorting

Sorting algorithms are a canonical test of structured control flow. The Z80 byte width and limited registers make sort design choices non-trivial and interesting.

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Insertion sort (byte array) | Wirth Ch.2 | `byte[]`, indexed write, `while` with carry flag |
| Shell sort (byte array) | Wirth Ch.2 | variable gap, nested `while`, in-place swap |
| Selection sort | K&R §5.6 | `byte[]`, index tracking, exchange |
| Bubble sort | baseline | nested `while`, swap idiom, `op swap` |
| Counting sort | bit manipulation | `byte[]`, two-pass, offset index |

Note: Quicksort belongs in Tier 2 because clean expression requires a stack for the recursion boundary (see §5.2 below).

#### 1C: Searching

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Linear search (byte array) | K&R §3.3 | `while`, early exit, `select` for result |
| Binary search (sorted byte array) | K&R §3.3 | `word` lo/hi, midpoint, `while` |
| Sentinel linear search | Wirth Ch.2 | array with one extra cell, loop termination |

Binary search on the Z80 is a good example because the midpoint calculation `(lo + hi) / 2` has a natural Z80 expression using `sra` after 16-bit addition.

#### 1D: String Operations

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| String length (`strlen`) | K&R §5.3 | `byte[]`, null-sentinel `while`, counter |
| String copy (`strcpy`) | K&R §5.3 | two `byte[]`, dual-pointer advance, `repeat` |
| String compare (`strcmp`) | K&R §5.3 | character-by-character `while`, three-way result |
| String concatenate (`strcat`) | K&R §5.3 | find end via `strlen`, then copy |
| String reverse (in-place) | K&R §1.9 | front/back index swap, `while` |
| Atoi (string to integer) | K&R §2.7 | `select` for digit test, accumulate |
| Itoa (integer to string) | K&R §3.6 | digit extraction, reverse |

#### 1E: Bit Manipulation

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Population count (byte) | K&R §2.9 | `while`, shift-and-test, accumulate |
| Bit reversal (byte) | classic | `while`, `rla`/`rra` idiom, shift count |
| Parity (byte) | classic | `xor` reduction, `op parity` |
| Highest set bit | classic | `while`, shift |
| Round up to next power of two | K&R §2.9 | shift, decrement, OR reduction |
| Extract bit field | K&R §2.9 | `op getbits`, mask and shift |

#### 1F: Data Structure — Ring Buffer

The ring buffer is the canonical embedded data structure: fixed-size, head/tail pointers, modular arithmetic. It appears everywhere in I/O and event systems and is a natural first record example.

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Ring buffer init | embedded classic | `record`, `section data` |
| Ring buffer push | | `record` field access, modular index |
| Ring buffer pop | | `select` on empty, early return |
| Ring buffer full/empty predicates | | field comparison, `func` returning byte |

The ring buffer is the first example where a `record` holds all the state for a data structure. It models a pattern the course uses throughout.

#### 1G: Classic Puzzles and Recursion Showcase

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Towers of Hanoi | Wirth Ch.4 | recursive `func`, depth as parameter |
| Recursive sum of array | Wirth Ch.4 | base case, recursive call, accumulator |
| Reverse array recursively | Wirth Ch.4 | recursive `func`, index passing |

---

### Tier 2 — Needs Design Clarity

These algorithms are implementable but require workarounds that reveal genuine language gaps. They should be written with explicit commentary on what is missing, and the workarounds should be noted as roadmap inputs.

#### 2A: Quicksort

Quicksort requires a recursion stack or an explicit software stack for the partition boundaries. On Z80 this typically means using the hardware stack directly (which the caller must protect) or maintaining a software stack as a `word[]` array.

ZAX gap: no current mechanism for a typed software stack as a first-class construct. The example will implement it as a `word[]` with an explicit stack pointer index, which is clear but verbose. This feeds into the design of a `stack` type or push/pop `op` idiom.

#### 2B: Merge Sort (bottom-up)

Bottom-up merge sort avoids recursion entirely by operating on runs of increasing width. It requires two-buffer operation and careful index arithmetic. The ZAX gap here is not a missing construct but the verbosity of tracking four index variables simultaneously — a candidate for a future `op merge_pass` idiom.

#### 2C: RPN Calculator (K&R §4)

The K&R reverse Polish calculator uses a stack for operands and a hand-written lexer for tokens. The ZAX expression of the stack is natural (a `word[]` with a stack-pointer local). The lexer loop is a candidate for `select` with range cases — which are not yet in the language. The example should be written with `select` for single character dispatch, and a comment noting that range syntax (`case '0'..'9'`) would clean it up.

This is a direct roadmap input for grouped and ranged `select case` (plan item A1/A2).

#### 2D: Word Frequency Count (K&R §6.3)

K&R uses a hash table to count word occurrences. A fixed-size hash table is directly expressible in ZAX as a record array with key and count fields. The gap: ZAX has no string-equality `op` yet in the standard library, and the hash function requires a byte-by-byte loop with XOR or polynomial accumulation. Both are expressible but highlight that a `strings` module with standard `op` definitions would reduce boilerplate across many examples.

---

### Tier 3 — Needs Language Features

These algorithms require features on the roadmap but not yet implemented. They belong in the course as **specification targets**: write the algorithm as you wish ZAX could express it, note the delta from what the compiler currently accepts, and file the gap as a language issue.

#### 3A: Linked List (K&R §6.5)

A singly-linked list requires a node record with a `ptr`-typed `next` field pointing to the same record type. This requires:
- self-referential record types (currently undefined behavior)
- a typed pointer that can be dereferenced to access fields (the typed reinterpretation cast `<Type>base.tail` — plan item D)

The example should be written to show what the ZAX code would look like once these are available. It becomes a design test for the cast syntax proposal.

#### 3B: Binary Search Tree

Similar to linked list, but with two child pointers. Same gaps apply. A BST insert and search pair would be the second self-referential record example. Together with the linked list, these two define the minimum requirements for pointer-to-typed-record resolution in ZAX.

#### 3C: Eight Queens (Wirth Ch.4)

The eight queens problem is a backtracking search over a chessboard. On Z80 it is typically implemented with a byte array for column occupancy and bit arrays for diagonal conflicts. The ZAX expression is nearly complete in Tier 1 — except that the backtracking loop structure benefits from a named `exit` or labeled break, which ZAX does not currently have.

This is a design probe: does ZAX need a labeled exit from structured loops? The eight queens example makes the case concretely.

---

### Tier 4 — Not in Scope for v1

These algorithms are valuable but depend on memory management or OS services that ZAX targets cannot assume.

- **Dynamic memory allocator** (K&R §8.7): requires a heap, which requires an OS or firmware memory map. Expressible in ZAX for embedded targets with a fixed memory arena, but not a standalone example.
- **Hash table with chaining**: requires dynamic node allocation.
- **Heap sort with dynamic structure**: naturally expressible as an in-place array sort (Tier 2), but the tree-visualization form requires dynamic allocation.

---

## 6. How Examples Feed the Roadmap

Every example that requires a workaround is a language signal. The course treats these signals as first-class outputs. Each workaround should be documented with:

1. **What the workaround is**: the actual code that was written.
2. **What the desired expression would be**: the code that would be written if the language had the missing feature.
3. **The estimated language cost**: how large a parser/lowering/spec change would be needed.
4. **The priority signal**: is this a common pattern across many examples, or a one-off?

This produces a ranked list of language gaps, grounded in actual use rather than speculation. The list supplements and validates the existing roadmap streams.

### Known Roadmap Connections

| Example Gap | Roadmap Item |
|---|---|
| RPN calculator case ranges | Select/case ranges (Stream A, plan items A1–A3) |
| Linked list, BST | Typed pointer cast `<Type>base.tail` (Stream D, plan items D1–D2) |
| Eight queens exit | Labeled break / named exit — not yet on roadmap; course will surface this |
| Word frequency string ops | Standard `op` library — not yet on roadmap |
| Quicksort software stack | Stack-typed local — not yet on roadmap |
| Self-referential records | Recursive type declaration — not yet on roadmap |

---

## 7. Relationship to ZAX's Contribution

ZAX occupies a specific and defensible position in the programming language landscape: it is a structured assembler — not a systems language (no type inference, no allocation, no runtime), not raw assembly (not a flat instruction stream). Very few tools have occupied this position seriously.

The algorithms course makes this position concrete. A reader who works through the course will understand:

- where the structured assembler model is natural and powerful
- where it differs from C at the machine boundary
- what a programmer gains by accepting the discipline ZAX imposes

This is how ZAX becomes a genuine contribution to the software field, even as a small project: not by being comprehensive, but by being *precise about what it is* — and by having a body of worked examples that demonstrate its scope and limits honestly.

The K&R and Wirth canon provides the calibration baseline. These algorithms are known. Their properties are understood. When ZAX expresses them cleanly, readers can see exactly what the language has added over raw assembly. When ZAX expresses them awkwardly, the gap is precisely located. There is no ambiguity about whether the friction is algorithmic or linguistic.

---

## 8. Course Structure (Proposed)

The course is organized into units of increasing structural complexity. Each unit introduces one or two ZAX constructs through the demands of its algorithms; it never introduces constructs in a vacuum.

| Unit | Title | Algorithms | ZAX Constructs Introduced |
|---|---|---|---|
| 0 | Foundations | Arithmetic, power, Fibonacci, GCD | `func`, `const`, `while`, return register |
| 1 | Arrays and Loops | Sorting (insertion, bubble, selection), binary search | `byte[]`, indexed access, `select` |
| 2 | String Model | strlen, strcpy, strcmp, atoi/itoa | null-sentinel loops, `repeat`, `op` |
| 3 | Bit Patterns | Population count, bit reversal, parity, field extract | Shift idioms, `op` for instruction families |
| 4 | Records | Ring buffer | `record`, `section data`, multiple fields |
| 5 | Recursion | Towers of Hanoi, recursive search | Recursive `func`, stack discipline |
| 6 | Composition | RPN calculator | All of the above: `op`, `record`, `select`, `func` |
| 7 | Gaps and Futures | Linked list, BST (design exercises) | Specification target exercises |

Unit 7 is intentionally incomplete. It is a design dialogue between the course author and the language — a record of what comes next.

---

## 9. Next Steps

1. **Write Unit 0 in full** — arithmetic and number theory. This establishes the example style and validates the style guide against actual code.

2. **Review Unit 0 examples against the compiler** — run every example, inspect output, confirm that clean ZAX produces clean Z80.

3. **Document the first friction point** — whatever resists clean expression in Unit 0 becomes the first roadmap input from the course.

4. **Commission Unit 1** — once Unit 0 is stable, sort algorithms follow as the first array-heavy unit.

Unit 0 is the right place to start because its algorithms are the simplest, the register contracts are clear, and the ZAX surface needed is fully implemented. Success in Unit 0 confirms the foundation; friction in Unit 0 means something more fundamental needs attention before the course can proceed.

---

*This document is a planning and design input. It is not a specification. It does not define language behavior. Its purpose is to orient the designer, inform contributors, and establish the course as a deliberate language feedback mechanism.*
