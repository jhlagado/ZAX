# Chapter 09 — Gaps and Futures

`eight_queens.zax` is the final example in the course. It solves the eight-queens
puzzle — placing eight queens on a chessboard so that none threatens any other —
by recursive backtracking. It is not the most complex algorithm in this course;
`bst.zax` has a more intricate data structure, and `rpn_calculator.zax` has more
moving parts. What makes `eight_queens.zax` the right capstone is its
control-flow pressure. It is a backtracking search, and backtracking search puts
maximum stress on the loop escape surface: the algorithm wants to stop searching
the moment a solution is found, and it wants to skip quickly past invalid
positions. Without good loop escape primitives, backtracking search accumulates
manual state.

This chapter reads `eight_queens.zax` as a lens on the current ZAX surface —
what it expresses cleanly and where it still requires workarounds — and connects
those observations to the language's recorded friction and its ongoing design
work.

---

## The Eight Queens Algorithm

The algorithm assigns one queen to each row, trying each column in turn. For each
row, `place_row` iterates over the eight column positions and checks three
constraints: the column must not already be occupied, the forward diagonal must
not already be threatened, and the backward diagonal must not already be
threatened. Column occupation is tracked in `col_used`, a byte array indexed by
column number. The two diagonals are tracked in `diag_sum_used` and
`diag_diff_used`, indexed by `row + col` and `row + col - DiagBias` respectively.
The `DiagBias` constant shifts the difference index into the non-negative range.

When all three constraint arrays say the position is free, `place_row` marks the
position, records the column assignment in `queen_cols`, and recurses into
`place_row row + 1`. When the recursion reaches row 8 — one past the last row —
all eight queens have been placed and the solution is found. The function sets
`found_solution := 1` and returns. On unwind, each level of recursion checks
`found_solution` and returns immediately if it is set, propagating the termination
back to the root call.

---

## `break` and `continue` in Practice

The column loop in `place_row` uses both `break` and `continue` (introduced in
Chapter 02, `prime_sieve.zax`):

```zax
    l := col_index
    a := col_used[L]
    or a
    if NZ
      succ col_index
      ld a, 1
      or a
      continue
    end
```

When a constraint check fails, the column index is advanced with `succ col_index`
and `continue` jumps to the loop test, skipping the remaining checks and the
placement code. There are three such constraint checks, each ending with
`continue`. At the bottom of the loop, if all constraints passed and the recursive
call returned with `found_solution` set, `break` exits the loop immediately:

```zax
    a := found_solution
    or a
    if NZ
      break
    end
```

(From `examples/course/unit9/eight_queens.zax`, lines 109–113.)

Before `break` and `continue` were part of the ZAX surface, the friction log
records that the workaround for this kind of control flow was explicit state
variables and early returns. The `found_solution` flag is still necessary —
because `break` exits only the innermost loop, not the entire recursive call
chain — but the constraint-check skips use `continue` cleanly rather than
nesting `if/else` blocks or duplicating the loop increment.

The friction log entry for Unit 9 marks this as the clearest language signal from
the entire course: structured loop escape was the highest-priority language gap,
and `break` and `continue` have since landed. The `eight_queens.zax` example was
written after that landing; the `continue` in the constraint checks and the
`break` after finding a solution are both using settled, implemented syntax.

---

## Where the Workaround Remains Visible

The `found_solution` flag is the part of the code that a more expressive language
might eliminate. In a language with named exits from nested structures, the
backtracking would propagate termination structurally rather than through a shared
flag. In ZAX, the flag is explicit module state. Every level of recursion checks
it on entry (`if found_solution != 0, ret`) and checks it after the recursive
call. This is correct and readable, but it is a workaround for the absence of a
mechanism to break out of recursion from inside a nested call.

The course roadmap (in `docs/work/course-roadmap.md`) records this as the
"named exit / break from nested loop" gap, specifically noting that `eight_queens`
backtracking requires an explicit flag variable to exit a nested `while`. The
evidence is now written code, not speculation. The issue is open, the evidence is
grounded, but no design has been finalised. Whether the right answer is a named
exit label, a propagated break, or something else is genuinely open.

---

## The Friction Log in Full

Working through the course examples surfaced the following gaps, recorded in
`docs/work/course-roadmap.md`:

**Already addressed**: Structured loop escape — `break` and `continue` — was
the highest-priority signal from `eight_queens.zax` and the broader course. It
is implemented and available on the current surface. The course examples use it.

**Real and grounded, design open**:

- *Named exit from nested structures.* The `found_solution` flag in
  `eight_queens.zax` is a direct workaround for this. The gap is recorded;
  no specific design has been decided.

- *Pointer-typing ergonomics.* `linked_list.zax` and `bst.zax` both require
  `<Type>local.field` at every traversal step. The `ptr` and `addr` types carry
  no type information — there is no `ptr<ListNode>`. Every pointer dereference
  must repeat the type annotation at the use site. The friction is real and
  grounded in multiple examples. The design is not settled. See
  `docs/work/course-roadmap.md` under the pointer-typing ergonomics entry, and
  watch `docs/design/` for live design work as it progresses.

- *Software-stack storage verbosity.* `rpn_calculator.zax` requires bouncing
  values through HL when moving between typed stack storage and other locations.
  Every `pop_word` result must be stored into a local immediately to survive the
  next `pop_word`. The support module interface is workable, but the interaction
  between software-stack operations and frame-local storage is verbose. Whether
  the answer is a library surface improvement or a language feature is not yet
  clear.

**Library gaps, not language gaps**:

- The pointer-advance idiom — `ld dst, (hl)` / `inc hl` — recurs across the
  string examples and could be a shared helper `op` if the pattern broadens.
  This is a library workstream candidate, not a language issue.

- Byte-array swap and load-store helpers are duplicated across the sorting
  examples. Same classification: library candidate once the pattern is measured
  across enough examples.

**Language gaps, not library gaps**:

- Local named-constant initialization: `var` block initializers cannot currently
  reference named constants by name. This is a real readability gap, grounded
  specifically in `binary_search.zax` and `bubble_sort.zax`. It requires a
  language change — the compiler must resolve constant names at `var`-block init
  time — and is not addressable by a library or idiom. Not yet opened at the
  time of writing.

**Style observations**:

- The boundary between `:=` and raw `ld` reflects the intended design: `:=` is
  for typed storage, `ld` is for raw registers and immediates. The friction log
  records this as the expected language boundary, not a gap. Teaching it
  explicitly — as this course does — is the right response.

---

## ZAX's Design Position

After ten units of examples, what is ZAX?

It is a structured assembler. It is not a high-level language that happens to
target Z80. You still choose registers, write mnemonics, manage flags, and
decide what lives in ROM versus RAM. The compiler adds names, typed offsets,
function-frame discipline, and structured control flow. It does not make
architectural decisions for you.

This position is deliberate. The distance between ZAX and raw Z80 assembly is
intentionally short. A reader who knows Z80 can read a ZAX program and
understand exactly what code is being generated. The `.asm` output is
deterministic and inspectable. There is no magic, no hidden passes, no runtime
system.

The course examples also expose where that distance becomes friction. Pointer
traversal requires repeated type annotations. Software-stack code bounces through
HL. Backtracking search uses explicit flags because nested-structure escape is not
yet in the language. These are honest frictions, not pretended ones, and they are
documented as such.

The ongoing design work — recorded in `docs/design/` and tracked in the friction
log — is addressed at these specific points. It does not aim to move ZAX toward
a general systems language. It aims to reduce the mechanical overhead at the
places where that overhead is now measured, while keeping the machine model fully
visible.

The eight-queens example is a good place to end. It is a real program. It
compiles, it runs, it finds a solution. The flag variable is there; so is the
clean use of `break` and `continue`. The gap and the progress both show up in
the same source file. That is an accurate picture of where ZAX is.

---

## What This Unit Teaches About ZAX

- `break` and `continue` are implemented and available on the current surface.
  The eight-queens column loop shows both in a single algorithm: `continue`
  skips failed constraint checks cleanly; `break` exits on a found solution.
- An explicit flag variable is still the necessary mechanism for propagating a
  found result across recursive frames. ZAX has no named exit from nested
  structures; this is a recorded gap, not a design oversight.
- Pointer-typing ergonomics (the `<Type>local.field` repetition from Chapter 08)
  and software-stack verbosity (the `pop_word`/`stack_depth` bouncing from
  Chapter 07) are both grounded, open design issues. See `docs/design/` for
  current work.
- The `.asm` output is deterministic and inspectable throughout. The compiler
  adds no hidden passes or runtime system. That design position is deliberate
  and unchanged.

---

## Examples in This Unit

- `examples/course/unit9/eight_queens.zax` — recursive backtracking search for
  the eight queens problem, using `break`, `continue`, and an explicit solution
  flag

---

## Further Reading

- `docs/work/course-roadmap.md` — the friction log, stream classification, and
  issue-ready sequence that this chapter draws from
- `docs/design/` — live design work on the open gaps identified above
- `docs/spec/zax-spec.md` — the normative language surface
