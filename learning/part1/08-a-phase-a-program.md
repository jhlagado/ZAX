[← I/O and Ports](07-io-and-ports.md) | [Part 1](README.md) | [Typed Storage and Assignment →](09-typed-storage-and-assignment.md)

# Chapter 08 — A Phase A Program

This chapter builds a complete Phase A program using every construct from
Chapters 00–06: a data table, a DJNZ loop, subroutines called from the loop,
conditional branches, and push/pop register preservation. After reading it you
will be able to follow and write a complete raw Z80 program in ZAX. You will
also be able to identify the points where the raw approach imposes bookkeeping
overhead that Phase B will later remove.

Prerequisites: Chapters 00–06 (all Phase A constructs).

---

## The program: find the maximum value in a byte table

The capstone program solves two related problems on the same byte table:

1. Find the maximum value in the table.
2. Count how many entries are strictly greater than 64.

These two problems are separate enough to justify two subroutines, but share
the same data, which demonstrates the full Phase A pattern: a data table in
ROM, subroutines that receive a table pointer and length, results stored to
named RAM, and a `main` that orchestrates the calls.

The example is `learning/part1/examples/08_phase_a_capstone.zax`.

---

## Reading the program top to bottom

```zax
const TableLen = 8

section data rom at $8000
  values: byte[8] = { 23, 47, 91, 5, 67, 12, 88, 34 }
end

section data vars at $8020
  max_val:   byte = 0
  above_64:  byte = 0
end
```

`TableLen` is a compile-time constant. The assembler substitutes 8 wherever
`TableLen` appears. The data section at `$8000` holds the eight values the
program will process. The vars section at `$8020` holds the two result bytes.

---

## The return clause and register survival

Chapter 06 established that the return clause on a `func` declaration controls
which registers the compiler saves and restores. Both `find_max` and
`count_above` return their result in A, so both are declared `func ...: AF` —
which tells ZAX not to save and restore AF, leaving A intact for the caller.

---

## `main`: the calling sequence

```zax
export func main(): void
  ld hl, values
  ld b, TableLen
  call find_max
  ld (max_val), a

  ld hl, values
  ld b, TableLen
  ld c, 64
  call count_above
  ld (above_64), a
end
```

`main` has no logic of its own. It sets up registers, calls a subroutine, stores
the result, then repeats for the second task. The calling sequence is entirely
explicit: every register used to pass arguments is loaded immediately before each
`call`.

The table base address `values` must be loaded into HL again before each call
because `find_max` advances HL past the end of the table. HL holds different
values after each call. This is typical of Phase A programs: the caller must
reload any register that the callee modified, and there is no language mechanism
to enforce or signal that.

---

## `find_max`: a simple counted loop with a conditional update

```zax
func find_max(): AF
  ld a, 0
find_max_loop:
  ld c, (hl)
  cp c
  jr nc, find_max_no_update
  ld a, c
find_max_no_update:
  inc hl
  djnz find_max_loop
end
```

`find_max` scans the table and returns the largest byte in A. The loop body uses
C as a temporary to hold the current element. `cp c` compares A (the running
maximum) with C (the current element). The rule from Chapter 03: carry is set
when A is less than C. `jr nc` skips the `ld a, c` update when A is already
greater than or equal to C. After eight iterations, A = 91 (`$5B`), the largest
value in the table.

This subroutine uses B (via DJNZ) and C (as a temporary). The label comment at
the top of a real program would say "Clobbers: A, B, C, HL" — all four are
modified by the time the function returns.

---

## `count_above`: the cost of manual register discipline

```zax
func count_above(): AF
  push bc
  ld d, 0
  pop bc
count_above_loop:
  ld a, (hl)
  cp c
  jr c, count_above_skip
  cp c
  jr z, count_above_skip
  inc d
count_above_skip:
  inc hl
  djnz count_above_loop
  ld a, d
end
```

`count_above` receives the table base in HL, the length in B, and the threshold
in C. It counts entries strictly greater than C and returns the count in A.

It needs a separate counter, D, to accumulate the count. But D must be
initialized to zero before the loop. This creates a problem: the only way to
zero D without disturbing B and C — which carry the function's inputs — is to
do it before the loop touches B. The `push bc / ld d, 0 / pop bc` block is the
Phase A solution to this problem. It saves B and C, performs the initialization,
and restores them.

In this specific case, `ld d, 0` does not actually disturb B or C, so the
push/pop buys nothing mechanically. But this pattern is extremely common in
Phase A programs: a subroutine needs to initialize a register, the programmer
is uncertain which registers are live, and the safest move is to save and
restore. The push/pop pair exists because the programmer cannot name their
variables and cannot see at a glance which registers are in use for which
purpose.

The double `cp c` in the loop body is another cost. A single `cp c` sets carry
when A < C and clears it when A >= C, but "greater than" requires distinguishing
A == C from A > C. One `cp` gives the less-than test; a second `cp` is needed
to isolate the equality case. This is correct but redundant: the same comparison
is performed twice for each element.

---

## Where Phase A is direct

The program has real strengths at the raw level:

The data layout is explicit. The programmer placed `values` at `$8000` and
`max_val` and `above_64` at `$8020`. The two regions do not overlap, and the
programmer knows exactly what lives at each address. There is no hidden
allocation.

The register usage is explicit. A reader who traces through `main` can follow
exactly which registers carry which values at each line. There is no compiler-
invisible magic.

The subroutine call cost is explicit. Every `call` costs a stack push, and the
programmer can count those pushes. There is no invisible calling machinery.

For a short, performance-sensitive routine — a counted loop over a small table
— the raw approach produces code that maps directly to Z80 instructions with
no overhead between what the programmer wrote and what the CPU executes.

---

## Where Phase A is laborious

These are not complaints. They are the specific points where Phase A imposes
costs that Phase B addresses.

**Label scaffolding is bookkeeping the programmer manages manually.** Every
loop needs a minimum of two labels: the top-of-loop label and the skip label
for the conditional update. Every if-like branch needs at least one label for
the not-taken path. A loop with an early-exit condition needs three labels.
None of these labels carry meaning about what the code does — they are
structural markers that exist to give jumps a target. The programmer must invent
names for them, place them correctly, and ensure that every branch targets the
right one.

**The push/pop pair in `count_above` exists only because of register naming
pressure.** The subroutine needs to set D to zero, but it is receiving inputs
in B and C and cannot afford to disturb them. The push/pop pair is the tool
available. A language that lets the programmer name a variable — `count` —
independently of a specific register would make the initialization straightforward
and would not require saving and restoring a register that was already holding
the right value.

**Re-loading HL before the second call is necessary but invisible.** `find_max`
advances HL as a side effect. Nothing in the function signature says "HL is
clobbered." The caller finds out only by reading the function body, or by
running the program and observing that the second call produced wrong results.
A language that tracks which registers a function modifies would make this
explicit at the call site.

**The double `cp c` in the body is a symptom of not having a greater-than test.**
`cp` produces less-than and equal information through the C and Z flags. Strictly
greater-than requires combining both. A language with a structured comparison —
`if A > threshold` — would lower this to the correct two-instruction sequence
automatically, and the programmer would see the intent rather than the
implementation.

---

## What Phase B solves

Phase B introduces three constructs that each address one or more of the costs
above.

**Typed storage and `:=`** let the programmer name a variable — `count`,
`running_max` — and assign values to it without choosing a register. The compiler
assigns the storage. The push/pop pair in `count_above` exists because D had to
be initialized in a register-conscious way; with named typed storage, the
initialization is `count := 0` and the compiler handles placement.

**Structured `if`** replaces the label-test-jump skeleton for conditional blocks.
`if NC / ... / end` emits the same flag test and conditional branch that
`cp c / jr nc, skip_label / ... / skip_label:` produces, but without the
programmer-managed label. The intent — "execute this block if no carry" — is
visible in the source rather than embedded in the target name of a jump.

**Structured `while`** replaces the loop-top label, the loop body, and the
branch-back jump. `while NZ / ... / end` is a pre-tested loop: the flags are
checked on entry and the body runs zero or more times depending on the condition.
This is equivalent to the pattern with the branch at the top:
`jp Z, exit / body / jp loop_top / exit:`. The `jr nz, loop_top` form placed
at the bottom of a loop is a post-tested loop — the body always runs at least
once — which is a different semantic. `while NZ` removes the need to name the
top-of-loop label or manage the exit label by hand.

None of these constructs hide the machine. They each lower to the same Z80
instructions that Phase A programs use. The difference is that the structured
forms carry the intent in the source, and the compiler manages the scaffolding.

Phase B starts in Chapter 09.

---

## What This Chapter Teaches

- A complete Phase A ZAX program has a data section, a vars section, a `main`
  function, and one or more helper subroutines.
- Subroutines receive inputs in registers and return results in registers.
  Document which registers each function reads and which it modifies.
- The caller must reload any register that the callee modified before the next
  call. Nothing enforces this; the programmer is responsible.
- Label scaffolding (loop-top labels, skip labels) is mechanical bookkeeping
  with no semantic content. The programmer must manage it correctly.
- Push/pop pairs appear in subroutines to resolve register naming pressure
  when a function needs to initialize a register that also carries an input.
- Phase B — typed storage, `if`, and `while` — addresses each of these costs
  while producing the same Z80 output.

## What Comes Next

Chapter 09 introduces typed storage and `:=`, the first Phase B construct, and
shows how it eliminates register-naming pressure for local values.

---

[← I/O and Ports](07-io-and-ports.md) | [Part 1](README.md) | [Typed Storage and Assignment →](09-typed-storage-and-assignment.md)
