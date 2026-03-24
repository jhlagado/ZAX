[← I/O and Ports](08-io-and-ports.md) | [Part 1](README.md) | [Typed Storage and Assignment →](10-typed-storage-and-assignment.md)

# Chapter 9 — A Complete Program

This chapter builds a complete program using everything from Chapters 3–7:
a data table, a DJNZ loop, subroutines called from the loop, conditional
branches, and push/pop register preservation. By the end you will be able to
follow and write a complete raw Z80 program in ZAX. You will also be able to
see the specific places where writing raw Z80 gets unwieldy — which is exactly
what Chapters 10–13 address.

Prerequisites: Chapters 3–7.

---

## The program: find the maximum value in a byte table

The capstone program solves two related problems on the same byte table:

1. Find the maximum value in the table.
2. Count how many entries are strictly greater than 64.

These two problems are separate enough to justify two subroutines, but share
the same data. The structure — a data table, subroutines that receive a pointer
and a length, results stored to named RAM, a `main` that orchestrates the calls
— is what a complete raw Z80 program looks like.

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

Chapter 7 established that the return clause on a `func` declaration controls
which registers the compiler saves and restores. Both `find_max` and
`count_above` return their result in A, so both are declared `func ...: AF` —
which tells ZAX not to save and restore AF, leaving A intact for the caller.

---

## `main`: the calling sequence

```zax
export func main()
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
values after each call. Nothing in the language tells the caller that HL was modified —
you find out by reading the function, or by running the program and getting
wrong results. The caller has to handle it manually.

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
maximum) with C (the current element). The rule from Chapter 4: carry is set
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
do it before the loop touches B. The `push bc / ld d, 0 / pop bc` block saves
B and C, performs the initialization, and restores them.

In this specific case, `ld d, 0` does not actually disturb B or C, so the
push/pop buys nothing mechanically. But the push/pop is here because you cannot
name your variables in raw Z80 — you have to pick a register, and you cannot
easily see at a glance which registers are already in use for what. When you
cannot name things, you save everything and hope.

The double `cp c` in the loop body is another cost. A single `cp c` sets carry
when A < C and clears it when A >= C, but "greater than" requires distinguishing
A == C from A > C. One `cp` gives the less-than test; a second `cp` is needed
to isolate the equality case. This is correct but redundant: the same comparison
is performed twice for each element.

---

## What works well

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
no overhead between what you wrote and what the CPU executes.

---

## What gets harder as programs grow

These are not complaints about the Z80. They are the specific things that get
tedious once programs grow past a handful of subroutines.

**Label names are structural noise.** Every loop needs at least two labels: the
top-of-loop label and the skip label for the conditional update. Every
if-like branch needs at least one label for the not-taken path. None of these
carry meaning about what the code is doing — they are just targets for jumps.
The programmer has to invent names for them, place them correctly, and make sure
every branch reaches the right one. In a ten-line subroutine this is fine. In a
program with twenty subroutines it becomes work that has nothing to do with the
actual problem.

**The push/pop in `count_above` is there because registers have no names.**
The subroutine needs to set D to zero, but B and C already hold inputs. The push/
pop saves B and C temporarily so D can be initialized safely. What you really
want is a variable called `count` that belongs to this function and does not
collide with anything else. Without named variables, registers are shared
workspace, and sharing means saving.

**Re-loading HL before the second call is invisible until it breaks.** `find_max`
walks HL through the table and leaves it pointing past the end. Nothing in the
call interface tells the caller this will happen. You find out by reading the
function body carefully, or by running the program and seeing wrong output.

**The double `cp c` exists because there is no greater-than test.** `cp` gives
you less-than (carry flag) and equal (zero flag). To test strictly greater-than,
you need both. So the comparison runs twice. A structured `if value > threshold`
would generate the same two instructions automatically, and the reader would see
the intent instead of the mechanism.

---

## What the next chapters address

Chapters 10–13 each fix one of the problems above.

**ZAX functions** (Chapter 10) replace register-passing conventions with named parameters and local variables. The compiler builds an IX-relative stack frame; you access every value with standard `ld a, (ix+name+0)` instructions. No push/pop needed to protect inputs while you initialize something else.

**Structured control flow** (Chapter 11) replaces labels and jumps with `if`/`else` and `while`/`break`/`continue`. The compiler generates the same conditional branches — you just do not write the labels.

**Typed assignment** (Chapter 12) introduces `:=`, which automates the IX-relative loads and stores you wrote by hand in Chapters 10–11. The compiler picks registers, handles word-sized slots, and checks types.

**Op macros** (Chapter 13) let you name a short instruction sequence and expand it inline at every call site, with no frame overhead.

None of this hides the machine. Everything translates to the same Z80 instructions as before. What changes is that the source shows the intent, and the compiler writes the scaffolding.

Chapter 10 starts there.

---

## Summary

- A complete ZAX program has a data section, a vars section, a `main` function,
  and one or more helper subroutines.
- Subroutines receive inputs in registers and return results in registers.
  Document which registers each function reads and which it modifies.
- The caller must reload any register that the callee modified before the next
  call. Nothing enforces this.
- Loop labels, skip labels, and conditional branch labels are structural noise:
  they give jumps a target, but carry no meaning about what the code does. The
  programmer has to manage them correctly.
- Push/pop pairs appear when a function needs to initialize a register that
  already holds an input. The real problem is not having named variables.
- Chapters 10–13 — ZAX functions, `if`/`while`, `:=`, and `op` — each address
  one of these problems, while generating the same Z80 output.

## What Comes Next

Chapter 10 introduces the first ZAX-specific feature beyond the program shell:
functions with named parameters and local variables, accessed through raw
IX-relative addressing.

---

[← I/O and Ports](08-io-and-ports.md) | [Part 1](README.md) | [Functions and the IX Frame →](10-functions-and-the-ix-frame.md)
