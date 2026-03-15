# ZAX Algorithms Course — Outline, Goals, and Design Rationale

*Status: proposal / designer briefing*
*Audience: language designer, contributors, course authors*

---

## 1. Purpose

This document proposes a structured course in ZAX built around classic short
algorithms from two foundational texts:

- **Kernighan and Ritchie**, *The C Programming Language* (K&R)
- **Niklaus Wirth**, *Algorithms + Data Structures = Programs* (Wirth)

The goal is not to translate C or Pascal into assembly. The goal is to
discover — through concrete, well-understood problems — what ZAX can say
cleanly, what it says awkwardly, and what it cannot yet say at all.

This is a **language design feedback instrument** as much as it is a course.
The algorithm examples should be treated as probes. Each algorithm that resists
clean ZAX expression is a signal: either the language is missing a construct,
or a current construct has the wrong shape.

---

## 2. Why This Approach

### 2.1 The K&R and Wirth Canon

K&R and Wirth were chosen deliberately. These are not arbitrary examples. They
represent a half-century of consensus about which small programs are genuinely
instructive — programs that are short enough to hold in your head, varied
enough to cover the key patterns of structured programming, and deep enough to
reveal whether a language can carry real work.

K&R introduces structured programming at the machine boundary. Its examples —
binary search, string operations, the RPN calculator, the storage allocator —
are C programs but they are also architecture programs. They care about memory
layout, register width, pointer arithmetic, and the cost of an operation.

Wirth goes further into algorithmic structure: sorting families, recursive
decomposition, tree traversal, Towers of Hanoi. His examples reveal whether a
structured assembler can express non-trivial control flow without collapsing
into spaghetti.

Together, they cover the territory that matters for ZAX: programs that are too
large for raw assembly but too close to the machine for a high-level language.

### 2.2 Not a Z80 Tutorial

This is not a course about Z80 hardware. Readers are assumed to know the Z80
instruction set and register model. The course is about **using ZAX** to write
programs that are:

- readable six months later
- refactorable when requirements change
- inspectable — the reader can trace from source to output binary

### 2.3 Not a Language Survey

The course is not organized around ZAX features. It is organized around
**problems**. Feature coverage emerges from the demands of the algorithms.
This prevents the course from becoming a reference manual in disguise, and
ensures that each feature is introduced in a context where it earns its place.

---

## 3. Course Goals

1. **Demonstrate ZAX as a viable medium for structured systems programming on
   Z80.** The completed example suite should stand as a body of non-trivial ZAX
   code that readers can study, run, and modify.

2. **Surface language shortcomings through use.** Each algorithm that fails to
   express cleanly is a candidate for a language change. The course is the
   first large-scale ZAX use case. Its friction points feed directly into the
   language roadmap.

3. **Establish a style.** ZAX code has a distinctive voice — it is assembly,
   but structured. The examples should model that voice consistently. Future
   ZAX authors will learn the idiom by reading these examples.

4. **Validate the design decisions already made.** Typed storage with value
   semantics, the `ld`-for-typed-access model, `select` dispatch,
   `op` overload resolution, the IX-anchored frame — these features exist
   because design arguments said they were needed. The algorithms will confirm
   or challenge those arguments with actual code.

5. **Identify the design decisions not yet made.** Missing features will
   announce themselves as comments, workarounds, or hand-lowered sequences in
   the examples. These become the input to the next design cycle.

---

## 4. Style Guide for Course Examples

Every example in the course must follow these conventions.

### 4.1 Typed Storage First

All working data lives in typed storage — `byte`, `word`, `addr`, records,
arrays — declared in `section data ... end` blocks or function `var` blocks.
`bin` and `hex` directives are for importing external binary blobs, not for
declaring working data. There are no raw assembler directives (`db`, `dw`,
`ds`) in ZAX; everything is typed.

```zax
; correct — typed declaration in a named section
section data app_state at $8000
  count:  word = 0
  buffer: byte[32]
  mode:   byte = 0
end

; correct — literal byte table as a typed array
section data char_table at $8100
  digits: byte[] = "0123456789"    ; inferred length 10
end
```

Literal tables that are read-only constants belong in their own named `data`
section with a meaningful name. There is no special "constant data" directive —
layout placement and initialization syntax serve that role.

### 4.2 Structured Control Flow Always

Never use conditional jumps to structured labels as a substitute for
`if`/`while`/`repeat`/`select`. The only labels in an example are those the
reader genuinely needs to see — `djnz` loop anchors, computed dispatch targets.
Avoid `jp cc, label` anywhere a structured construct would serve.

```zax
; correct — structured selection
ld a, mode
select A
  case Mode.Idle
    ld a, 0
  case Mode.Run
    ld a, 1
  else
    ld a, $FF
end

; correct — structured loop with test inside
repeat
  ld a, (hl)
  inc hl
  or a           ; sets Z if zero byte
until Z
```

### 4.3 Functions for Every Named Operation

Every algorithm has at least one named function. Helper routines that are
called from more than one place are always `func` or `op` definitions — never
copy-pasted instruction sequences with a comment header.

### 4.4 Comments Explain the Algorithm, Not the Instruction

Assembly comments that explain what a single instruction does are noise.
Comments in the course examples explain algorithmic decisions: why this loop
structure, why this register assignment, what invariant this sequence
maintains.

```zax
; BAD — comments explain the instruction, not the algorithm
ld hl, count     ; load count into HL
inc hl           ; increment HL
ld count, hl     ; store HL back into count

; GOOD — comment explains the invariant
; advance count past the current element before yielding to caller
ld hl, count
inc hl
ld count, hl
```

### 4.5 `op` for Reusable Instruction Families

When an idiom recurs across more than one function — a byte-load-and-advance,
a compare-and-swap, a rotate-and-mask — it is factored into an `op`. This is
the correct use of `op`: not abbreviation, but named, overloadable instruction
families with compiler-enforced operand matching.

```zax
; a recurring pattern factored into an op
op advance_byte(dst: reg8, src: mem8)
  ld dst, src
  inc hl
end
```

### 4.6 Explicit Return Register and Preservation

Every `func` that returns a value must declare its return register explicitly.
The compiler enforces the complementary preservation set — the programmer
should not re-document what the signature already states.

```zax
; return register declared in signature — compiler preserves AF, BC, DE
func sum(a: word, b: word): HL
  ld hl, a
  ld de, b
  add hl, de
end

; void function — compiler preserves AF, BC, DE, HL
func clear(buf: addr, len: word)
  ld hl, buf
  ld b, len
  ld a, 0
  repeat
    ld (hl), a
    inc hl
    dec b
  until Z
end
```

Comments should explain register *choices* — why BC holds the counter rather
than DE, why the accumulator is loaded into L before extending — not the
preservation rules the signature already declares.

### 4.7 No Unexplained Magic

Any hand-optimized sequence that diverges from the obvious straightforward
implementation must be accompanied by a comment explaining the transformation
and its cost rationale. The course teaches optimization as a deliberate act,
not a reflex.

---

## 5. Algorithm Catalogue

Algorithms are organized in four tiers by dependency on language features not
yet implemented. The tier is a planning signal, not a permanent ranking.

### Tier 1 — Available Now

These algorithms can be written in clean ZAX today using the current normative
surface: typed storage, `func`, `if`/`while`/`repeat`/`select`, `op`, `const`,
`enum`, arrays, records.

#### 1A: Arithmetic and Number Theory

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Integer power by repeated multiplication | K&R §1.2 | `func`, `while`, `word` params, return `HL` |
| Euclid's GCD (iterative) | Wirth Ch.1 | `while`, `if NZ`, subtraction-loop remainder |
| Euclid's GCD (recursive) | Wirth Ch.1 | recursive `func`, IX frame across calls |
| Integer square root (Newton step) | Wirth Ch.1 | `while`, convergence test with `sbc hl, de` |
| Exponentiation by squaring | Wirth Ch.1 | `if`, halving via `sra`, shift-and-multiply |
| Fibonacci (iterative) | Wirth Ch.1 | `while`, two-variable rolling state in locals |
| Decimal digit decomposition | K&R §1.2 | division-by-10, character offset, `repeat` |

Note: Fibonacci already has a reference implementation in
`examples/language-tour/02_fibonacci_args_locals.zax`. That file is the style
baseline for Unit 0.

The prime sieve of Eratosthenes belongs in Tier 1B because it requires a
byte array large enough to expose the array-index and loop interaction clearly —
it is listed there.

#### 1B: Sorting and Searching

Sorting algorithms are a canonical test of structured control flow. The Z80
byte width and limited registers make sort design choices concrete and
interesting.

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Insertion sort (byte array) | Wirth Ch.2 | `byte[]`, indexed write, `while NC` inner loop |
| Shell sort (byte array) | Wirth Ch.2 | variable gap in local, nested `while`, in-place swap |
| Selection sort | K&R §5.6 | `byte[]`, min-index tracking, exchange |
| Bubble sort | baseline | nested `while`, swap `op`, pass-completion flag |
| Counting sort | technique | `byte[]` two-pass, offset-index, no comparisons |
| Prime sieve (Eratosthenes) | Wirth Ch.5 | `byte[256]`, nested `while`, constant-stride marking |
| Linear search (byte array) | K&R §3.3 | `while`, early exit via local flag or `djnz` |
| Binary search (sorted byte array) | K&R §3.3 | `word` lo/hi locals, midpoint via `sra`, `while` |
| Sentinel linear search | Wirth Ch.2 | array with one extra cell, single-test `repeat` |

Binary search on the Z80 is a good example because the midpoint calculation
`(lo + hi) >> 1` has a natural Z80 expression: `add hl, de` then `sra h` /
`rr l` for arithmetic right-shift of a 16-bit value.

#### 1C: String Operations

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| String length (`strlen`) | K&R §5.3 | `byte[]`, null-sentinel `repeat ... until Z` |
| String copy (`strcpy`) | K&R §5.3 | two `addr` locals, dual-pointer `repeat` |
| String compare (`strcmp`) | K&R §5.3 | character-by-character `while`, three-way result |
| String concatenate (`strcat`) | K&R §5.3 | call `strlen` to find end, then copy |
| String reverse (in-place) | K&R §1.9 | `addr` front/back, `while`, swap via `A` |
| Atoi (string to integer) | K&R §2.7 | `select A` for digit test, 16-bit accumulate |
| Itoa (integer to string) | K&R §3.6 | digit extraction loop, reverse result |

String operations expose how ZAX handles the common Z80 pointer-advance idiom.
The pattern `ld a, (hl) / inc hl` recurs throughout; it is a natural `op`
candidate:

```zax
op fetch_advance(dst: reg8)
  ld dst, (hl)
  inc hl
end
```

String operations also surface the first practical need for `addr` locals that
persist a pointer across loop iterations — the same pattern seen in
`examples/ZAX-quick-guide.md` §1.4.

#### 1D: Bit Manipulation

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Population count (byte) | K&R §2.9 | `while`, `rra` / carry test, accumulate in `B` |
| Bit reversal (byte) | classic | `while`, `rla`/`rra` shift pair, 8-iteration loop |
| Parity (byte) | classic | `xor` reduction, `op parity` over `reg8` |
| Highest set bit position | classic | `while`, `srl A`, count-down in `B` |
| Round up to next power of two | K&R §2.9 | `dec hl` / `or`-reduction / `inc hl` |
| Extract bit field | K&R §2.9 | `op getbits(val: reg8, offset: imm8, width: imm8)` |

The bit manipulation group is where `op` with `imm8` matchers pays off.
`getbits` is a natural fit for an op that accepts fixed-width operands and
expands to a shift-and-mask sequence parameterized at compile time.

#### 1E: Data Structure — Ring Buffer

The ring buffer is the canonical embedded data structure: fixed-size, head/tail
pointers, modular arithmetic. It appears everywhere in I/O and event systems
and is the first complete record example.

```zax
const RingSize = 16

type Ring
  buf:  byte[16]    ; sizeof = 16; sizeof(Ring) = pow2(16+2+2+2) = 32
  head: byte
  tail: byte
  len:  byte
end

section data io_ring at $8200
  rx_ring: Ring = 0    ; zero-initialize all fields
end
```

| Algorithm | ZAX Features Exercised |
|---|---|
| Ring buffer init | `record`, `section data`, zero-initializer |
| Ring buffer push | field access, modular index via `and RingSize-1` |
| Ring buffer pop | `select` on empty predicate, early return |
| Ring buffer full/empty predicates | `func` returning `byte`, field comparison |

Note: `sizeof(Ring)` is rounded to the next power of two. With 16-byte `buf`
and three `byte` fields the field sum is 19; `pow2(19) = 32`. Designers should
note this padding when the ring is embedded in a larger record or array. The
`--type-padding-warn` flag will flag it.

#### 1F: Classic Puzzles and Recursion

| Algorithm | Source | ZAX Features Exercised |
|---|---|---|
| Towers of Hanoi | Wirth Ch.4 | recursive `func`, depth as `byte` param |
| Recursive array sum | Wirth Ch.4 | base case test, recursive call, `HL` accumulator |
| Recursive array reverse | Wirth Ch.4 | index passing, recursive `func`, `addr` params |

Towers of Hanoi is the cleanest recursion showcase. With no local state beyond
the arguments, the IX frame cost is minimal and the structure of the recursion
is legible. The output action (recording or printing a move) is a natural
`extern func` hook for a BIOS call or a trace buffer append.

---

### Tier 2 — Needs Design Clarity

These algorithms are implementable but require workarounds that reveal genuine
language gaps. They should be written with explicit commentary on what is
missing, and the workarounds should be noted as roadmap inputs.

#### 2A: Quicksort

Quicksort requires a recursion stack or an explicit software stack for the
partition boundaries. On Z80 this typically means using the hardware stack
directly (which the caller must protect) or maintaining a software stack as a
`word[]` array.

ZAX gap: no current first-class construct for a typed software push/pop stack.
The example will implement it as a `word[]` with an explicit `sp_idx` local,
which is clear but verbose. This feeds into the design of a `stack` type or
push/pop `op` idiom.

```zax
; workaround pattern — explicit software stack using a word array
const StackDepth = 16

section data sort_state at $8300
  stk:    word[16]
  stk_sp: byte = 0
end

op push_word(val: reg16)
  ld a, stk_sp
  ld l, a
  ld h, 0
  ld stk[HL], val      ; store into stk[stk_sp]
  inc a
  ld stk_sp, a
end
```

The awkwardness of this idiom — especially keeping `stk_sp` in sync and
indexing a global array from inside a function that also has its own IX frame —
is the precise friction the course should expose and measure.

#### 2B: Merge Sort (bottom-up, iterative)

Bottom-up merge sort avoids recursion by operating on runs of increasing width.
It requires two buffers and careful index arithmetic. The ZAX gap here is not a
missing construct but the verbosity of tracking four index variables
simultaneously. A `merge_pass` op idiom or an abstraction over the double-index
advance pattern would help. This is a design probe for whether `op` with
multiple `ea` parameters can carry enough state to be useful as a loop
abstraction.

#### 2C: RPN Calculator (K&R §4)

The K&R reverse Polish calculator uses a stack for operands and a hand-written
lexer for tokens. The ZAX expression of the operand stack is natural (a `word[]`
with a stack-pointer local, cf. §2A above). The lexer loop is a candidate for
`select` with range cases — which ZAX does not yet support.

```zax
; what we can write today — individual cases
select A
  case '+'
    ; add
  case '-'
    ; subtract
  case '='
    ; print
  else
    ; digit or error — needs range test, not available yet
end
```

The desired expression would be:

```zax
select A
  case '0'..'9'      ; range case — not yet in language
    ; accumulate digit
  case '+', '-', '*', '/'
    ; operator
end
```

This is a direct roadmap input for grouped and ranged `select case`. The RPN
calculator is the best motivating example because the single-character dispatch
is the whole inner loop of the calculator.

#### 2D: Word Frequency Count (K&R §6.3)

K&R uses a hash table to count word occurrences. A fixed-size hash table is
directly expressible in ZAX as a record array with key and count fields. The
gaps are:

1. String comparison as an `op` (no standard ops library yet).
2. The hash function requires a byte-by-byte loop — expressible but highlights
   that a `strings` module with standard `op` definitions would reduce
   boilerplate across many examples.

---

### Tier 3 — Needs Language Features

These algorithms require features on the roadmap but not yet implemented. They
belong in the course as **specification targets**: write the algorithm as you
wish ZAX could express it, note the delta from what the compiler currently
accepts, and file the gap as a language issue.

#### 3A: Linked List (K&R §6.5)

A singly-linked list requires a node record with a `ptr`-typed `next` field
pointing back to the same record type. This requires:

- Self-referential record type declarations (currently a compile error in v0.2).
- A typed dereference of the `ptr` field to access subsequent node fields —
  some form of typed pointer cast.

The example should be written to show what the ZAX code would look like once
these are available. It becomes a design test for whatever typed-pointer-cast
syntax is proposed.

#### 3B: Binary Search Tree

Similar to linked list, but with two child pointers. Same gaps apply. A BST
insert and search pair is the second self-referential record example. Together
with the linked list, these two define the minimum requirements for
pointer-to-typed-record field access in ZAX. They also probe whether ZAX needs
a `null` sentinel value or whether address zero is sufficient.

#### 3C: Eight Queens (Wirth Ch.4)

The eight queens problem is a backtracking search over a chessboard. On Z80 it
is typically implemented with a byte array for column occupancy and bit arrays
for diagonal conflicts. The ZAX expression is nearly complete in Tier 1 —
except that the backtracking loop structure benefits from a named exit or
labeled break out of a nested `while`, which ZAX does not currently support.

```zax
; what we must write today — exit via flag + while test
ld found, 0
ld col, 0
ld a, 0
or a
while NZ           ; awkward: must pre-set flag and use or a
  ; ... backtrack body ...
  ; to "break" we must set found, 1 and then force the while condition false
  ; this leaks control flow state into a flag variable
end
```

The desired expression would be a `break` or labeled exit:

```zax
while NZ
  ; ... backtrack body ...
  ; exit when done
end
```

This is a concrete design probe: does ZAX need a labeled exit or `break`
statement? The eight queens example makes the case with real code.

---

### Tier 4 — Not in Scope for v1

These algorithms are valuable but depend on memory management or OS services
that ZAX targets cannot assume.

- **Dynamic memory allocator** (K&R §8.7): requires a heap, which requires an
  OS or firmware memory map. Expressible in ZAX for embedded targets with a
  fixed memory arena, but not a standalone portable example.
- **Hash table with chaining**: requires dynamic node allocation.
- **Heap sort with dynamic structure**: naturally expressible as an in-place
  array sort (Tier 1B), but the tree-visualization form requires dynamic
  allocation.

---

## 6. How Examples Feed the Roadmap

Every example that requires a workaround is a language signal. The course
treats these signals as first-class outputs. Each workaround should be
documented with:

1. **What the workaround is**: the actual code that was written.
2. **What the desired expression would be**: the code that would be written if
   the language had the missing feature.
3. **The estimated language cost**: how large a parser/lowering/spec change
   would be needed.
4. **The priority signal**: is this a common pattern across many examples, or a
   one-off?

This produces a ranked list of language gaps, grounded in actual use rather
than speculation. The list supplements and validates the existing roadmap
streams.

### Known Roadmap Connections

| Example Gap | Roadmap Status |
|---|---|
| RPN calculator case ranges | Select/case ranges — on roadmap |
| Linked list, BST self-referential types | Recursive type declarations — roadmap gap |
| Linked list, BST typed pointer dereference | Typed pointer cast — roadmap gap |
| Eight queens labeled exit | `break` / named exit — not yet on roadmap; course surfaces this |
| Word frequency string ops | Standard `op` library — not yet on roadmap |
| Quicksort software stack | Stack-typed local or push/pop op idiom — not yet on roadmap |

---

## 7. A Note on ZAX Syntax in Examples

All course examples must be written against the current normative surface
(`docs/zax-spec.md`). The key surface facts that differ from classical
assembler conventions:

**Typed storage uses `ld` with value semantics.** There are no separate
`move`/`store` keywords. `ld hl, count` reads the 16-bit value stored in
`count`; `ld count, hl` writes HL back. The compiler inserts the IX-relative
or absolute load/store sequence.

```zax
section data state at $8000
  count: word = 0
end

func bump(): void
  ld hl, count    ; reads word at 'count' into HL
  inc hl
  ld count, hl    ; writes HL back to 'count'
end
```

**Record fields and array elements use the same `ld` surface.** `ld a, ring.head`
reads the byte field; `ld ring.head, a` writes it. For array elements,
`ld a, buf[B]` reads the element at index B.

```zax
ld a, ring.head           ; read byte field
ld ring.buf[B], a         ; write element at register index B
```

**There are no `db`, `dw`, or `ds` assembler directives.** Literal byte tables
are typed `byte[]` declarations in `section data ... end` blocks.

**Functions declare return registers explicitly.** `func foo(): HL` returns a
16-bit value in HL; `func foo(): HL,DE` returns a 32-bit value split across
HL and DE. The compiler generates the callee-save epilogue for all registers
not in the return set.

**`op` bodies are typed, not textual.** An `op` with `dst: reg8` and
`src: mem8` matches `ld A, (count)` and emits the correct instruction at that
call site. The operands are AST nodes, not source text.

---

## 8. Relationship to ZAX's Contribution

ZAX occupies a specific and defensible position in the programming language
landscape: it is a structured assembler — not a systems language (no type
inference, no allocation, no runtime), not raw assembly (not a flat instruction
stream). Very few tools have occupied this position seriously.

The algorithms course makes this position concrete. A reader who works through
the course will understand:

- where the structured assembler model is natural and powerful
- where it differs from C at the machine boundary
- what a programmer gains by accepting the discipline ZAX imposes

This is how ZAX becomes a genuine contribution to the software field, even as a
small project: not by being comprehensive, but by being *precise about what it
is* — and by having a body of worked examples that demonstrate its scope and
limits honestly.

The K&R and Wirth canon provides the calibration baseline. These algorithms are
known. Their properties are understood. When ZAX expresses them cleanly,
readers can see exactly what the language has added over raw assembly. When ZAX
expresses them awkwardly, the gap is precisely located. There is no ambiguity
about whether the friction is algorithmic or linguistic.

---

## 9. Course Structure (Proposed)

The course is organized into units of increasing structural complexity. Each
unit introduces one or two ZAX constructs through the demands of its
algorithms; it never introduces constructs in a vacuum.

| Unit | Title | Algorithms | ZAX Constructs Introduced |
|---|---|---|---|
| 0 | Foundations | Arithmetic, power, Fibonacci, GCD | `func`, `const`, `while`, return register |
| 1 | Arrays and Loops | Sorting (insertion, bubble, selection), binary search, prime sieve | `byte[]`, indexed access, `select` |
| 2 | String Model | strlen, strcpy, strcmp, atoi/itoa | null-sentinel loops, `repeat`, `op fetch_advance` |
| 3 | Bit Patterns | Population count, bit reversal, parity, field extract | Shift idioms, `op` with `imm8` matchers |
| 4 | Records | Ring buffer | `record`, `section data`, `type`, `sizeof` / `offsetof` |
| 5 | Recursion | Towers of Hanoi, recursive sum, recursive reverse | Recursive `func`, IX frame discipline |
| 6 | Composition | RPN calculator | All of the above: `op`, `record`, `select`, `func` |
| 7 | Gaps and Futures | Linked list, BST, eight queens (design exercises) | Specification target exercises |

Unit 7 is intentionally incomplete. It is a design dialogue between the course
author and the language — a record of what comes next.

---

## 10. Next Steps

1. **Write Unit 0 in full** — arithmetic and number theory. The existing
   `examples/language-tour/02_fibonacci_args_locals.zax` sets the style
   baseline. Unit 0 must match that style and compile clean.

2. **Review Unit 0 examples against the compiler** — run every example, inspect
   the `.asm` output, confirm that clean ZAX produces readable Z80.

3. **Document the first friction point** — whatever resists clean expression in
   Unit 0 becomes the first roadmap input from the course. It is expected to be
   minor; the Unit 0 algorithms are the simplest.

4. **Commission Unit 1** — once Unit 0 is stable, sorting and searching follow
   as the first array-heavy unit. The sorting algorithms are where the register
   pressure of the Z80 becomes interesting.

Unit 0 is the right place to start because its algorithms are the simplest, the
register contracts are clear, and the ZAX surface needed is fully implemented.
Success in Unit 0 confirms the foundation; friction in Unit 0 means something
more fundamental needs attention before the course can proceed.

---

*This document is a planning and design input. It is not a specification. It
does not define language behavior. Its purpose is to orient the designer,
inform contributors, and establish the course as a deliberate language feedback
mechanism.*
