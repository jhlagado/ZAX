[← Pointer Structures](08-pointer-structures.md) | [Part 2](README.md)

# Chapter 9 — Gaps and Futures

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
      step col_index
      ld a, 1
      or a
      continue
    end
```

When a constraint check fails, the column index is advanced with `step col_index`
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

(From `learning/part2/examples/unit9/eight_queens.zax`, lines 109–113.)

Before `break` and `continue` were part of the ZAX surface, the friction log
records that the workaround for this kind of control flow was explicit state
variables and early returns. The `found_solution` flag is still necessary —
because `break` exits only the innermost loop, not the entire recursive call
chain — but the constraint-check skips use `continue` cleanly rather than
nesting `if/else` blocks or duplicating the loop increment.

Structured loop escape — `break` and `continue` — was the highest-priority
language gap identified during the course. Both are now implemented. The
`eight_queens.zax` example uses `continue` in the constraint checks and `break`
after finding a solution.

---

## Where the Workaround Remains Visible

The `found_solution` flag is explicit module state. Every level of recursion
checks it on entry and again after the recursive call returns. This is correct,
but it is a workaround: the flag exists because ZAX has no way to break out of
a recursive call chain from inside a nested frame. In a language with named
exits from nested structures, the termination would propagate structurally
instead of through a shared flag.

No design has been finalised. Whether the right answer is a named exit label,
a propagated break, or something else is an open question.

---

## The Friction Log in Full

Working through the course examples surfaced the following gaps.

**Already addressed**: Structured loop escape — `break` and `continue` — was
the highest-priority gap identified from `eight_queens.zax` and the broader
course. It is now implemented. The course examples use it.

**Design open**:

- _Named exit from nested structures._ The `found_solution` flag in
  `eight_queens.zax` is a direct workaround for this. The gap is recorded;
  no specific design has been decided.

- _Pointer type annotation._ `linked_list.zax` and `bst.zax` both require
  `<Type>local.field` at every traversal step. The `addr` type carries no type
  information — there is no `addr<ListNode>`. Every dereference must repeat the
  type annotation at the use site. The design is not settled. See `docs/design/`
  for live design work as it progresses.

- _Software-stack storage verbosity._ `rpn_calculator.zax` requires storing
  every `pop_word` result into a local immediately to survive the next
  `pop_word`. The support module interface works, but the interaction between
  software-stack operations and frame-local storage is repetitive. Whether the
  answer is a library surface change or a language feature is not yet clear.

**Language gaps, not library gaps**:

- _Local named-constant initialisation._ `var` block initialisers cannot
  currently reference named constants by name. This is a readability gap
  grounded in `binary_search.zax` and `bubble_sort.zax`. It requires a
  compiler change and cannot be worked around in a library.

**Where ZAX stands after these examples**:

You still choose registers, write mnemonics, manage flags, and decide what
lives in ROM versus RAM. The compiler adds names, typed offsets, function frames,
and structured control flow. The `.asm` output is deterministic:
every source line maps to a predictable instruction sequence that you can read
and verify. The gaps above are the places where the current surface still
requires manual workarounds. They are recorded as such, and design work on them
is tracked in `docs/design/`.

The eight-queens example ends the course at the right point. It is a real
program — it compiles, runs, and finds a solution. The `found_solution` flag
is the workaround; `break` and `continue` are the progress. Both show up in
the same source file.

---

## Summary

- `break` and `continue` are implemented and available on the current surface.
  The eight-queens column loop shows both in a single algorithm: `continue`
  skips failed constraint checks cleanly; `break` exits on a found solution.
- An explicit flag variable is still the necessary mechanism for propagating a
  found result across recursive frames. ZAX has no named exit from nested
  structures; this is a recorded gap, not a design oversight.
- The `<Type>local.field` repetition from Chapter 08 and the `pop_word`/`stack_depth`
  bouncing from Chapter 07 are both known design issues. See `docs/design/` for
  current work.
- The `.asm` output is deterministic and inspectable throughout. The compiler
  adds no hidden passes or runtime system. That design position is deliberate
  and unchanged.

---

## Examples in This Chapter

- `learning/part2/examples/unit9/eight_queens.zax` — recursive backtracking search for
  the eight queens problem, using `break`, `continue`, and an explicit solution
  flag

---

## Exercises

1. `place_row` uses three separate `continue` statements to skip failed
   constraint checks. Each one advances `col_index` with `step` and
   re-establishes NZ before jumping to the loop test. What would happen if the
   `step col_index` were omitted from one of the three `continue` paths? Trace
   the column loop behaviour for a column that fails the first constraint check.

2. The `found_solution` flag is module-level state. `main` resets it to zero
   before calling `place_row`. What happens if that reset is removed and `main`
   is called twice in sequence? Trace the second call's behaviour from the entry
   of `place_row` when `found_solution` is already 1.

3. `place_row` marks the three constraint arrays (`col_used`, `diag_sum_used`,
   `diag_diff_used`) before recursing and unmarks them on backtrack. If the
   marking step runs but the unmark step is skipped — say, the function returns
   early before reaching the unmark — what happens to the search for later
   columns on the same row? Identify the specific code path where this could
   occur.

4. The eight-queens solution terminates as soon as one solution is found.
   Modify `place_row` to count all solutions rather than stopping at the first.
   What changes in the termination condition, the flag variable, and the
   `found_solution` check after the recursive call?

---

## Further Reading

- `docs/design/` — live design work on the open gaps identified above
- `docs/spec/zax-spec.md` — the normative language surface

---

[← Pointer Structures](08-pointer-structures.md) | [Part 2](README.md)
