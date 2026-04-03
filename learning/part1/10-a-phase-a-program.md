[← I/O and Ports](09-io-and-ports.md) | [Part 1](README.md) | [Functions and the IX Frame →](11-functions-and-the-ix-frame.md)

# Chapter 10 — A Complete Program

This chapter builds a complete program using the techniques from Chapters 3–9:
a data table, a DJNZ loop, subroutines called from the loop, conditional
branches, and push/pop register preservation. Chapter 9 covered I/O and ports —
a separate hardware concern. This capstone focuses on data operations in memory,
which is where the friction points in raw Z80 programming are most visible.
The two subroutines that result expose exactly those friction points — the
problems Chapters 11–14 address.

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

Chapter 8 established that the return clause on a `func` declaration controls
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
values after each call. Nothing in the language tells you that HL was modified —
I say this directly, because it only surfaces as a bug once a program grows large
enough. You find out by reading the function, or by running the program and
getting wrong results.

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
C as a temporary to hold the current element. Apply the flag-before-branch check
on `cp c` / `jr nc`: `cp c` establishes the flag, `jr nc` reads it immediately
— nothing changes the flag between them. Carry clear after `cp c` means A ≥ C,
so `jr nc` skips the update and the running maximum is left alone. `ld a, c`
runs only when carry was set — meaning A was less than C and C is a new maximum.
After eight iterations, A = 91 (`$5B`), the largest value in the table.

This subroutine uses B (via DJNZ) and C (as a temporary). The label comment at
the top of a real program would say "Clobbers: A, B, C, HL" — all four are
modified by the time the function returns.

---

## `count_above`: the cost of manual register discipline

`count_above` works. It also contains code that does nothing, for a reason worth understanding directly.

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

It needs a separate counter, D, to accumulate the count. D must be initialised
to zero before the loop. That sounds trivial — `ld d, 0` — but the programmer
writing this code has B and C already in use as inputs. Can `ld d, 0` disturb B
or C? A moment's thought says no — `ld d, 0` only touches D. But the
`push bc / ld d, 0 / pop bc` sequence is here anyway. The programmer was not
sure, saved BC to be safe, and moved on.

This is the real cost of register-only programming: **you cannot trust your own
reasoning about what a register holds at any given moment.** With three inputs
and a counter all living in different registers, keeping a correct mental model
of register ownership requires ongoing effort. When that effort lapses — even
briefly — the instinct is to save everything and restore it, whether or not it
was at risk. The push/pop pair is not a bug; it is the programmer's hedge
against uncertainty. In a longer function with more registers in flight, that
hedge is often correct. Here it happens to be unnecessary.

The double `cp c` in the loop body is a separate cost of a different kind.
`cp c` sets carry when A < C, and sets Z when A == C. To test "strictly greater
than" you need both: carry clear *and* Z clear. The raw code tests them with two
separate `cp c` / `jr` pairs — the comparison runs twice per element. This is
not a mistake; it is what the instruction set requires when you have no
structured greater-than operator. The code is correct and the cost is small. But
the intent — "skip unless A > C" — is not visible until you trace both branches.

---

## What works well

The program has real strengths at the raw level:

The data layout is explicit. You placed `values` at `$8000` and
`max_val` and `above_64` at `$8020`. The two regions do not overlap, and you
know exactly what lives at each address — nothing is allocated behind your back.

The register usage is explicit. Tracing through `main`, you can follow
exactly which registers carry which values at each line. The compiler adds
nothing you did not write.

The subroutine call cost is explicit. Every `call` costs a stack push, and you
can count those pushes. No calling machinery is hidden.

For a short, performance-sensitive routine — a counted loop over a small table
— the raw approach produces code that maps directly to Z80 instructions with
no overhead between what you wrote and what the CPU executes.

---

## What gets harder as programs grow

These are the specific things that get tedious once programs grow past a handful of subroutines.

**Label names are structural noise.** Every loop needs at least two labels: the
top-of-loop label and the skip label for the conditional update. Every
if-like branch needs at least one label for the not-taken path. None of these
carry meaning about what the code is doing — they are only targets for jumps.
You have to invent names for them, place them correctly, and make sure
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
would generate the same two instructions automatically, and you would see
the intent instead of the mechanism.

---

## What the next chapters address

Chapters 11–14 each fix one of the problems above.

**ZAX functions** (Chapter 11) replace register-passing conventions with named parameters and local variables. The compiler builds an IX-relative stack frame; you access every value with standard `ld a, (ix+name+0)` instructions. No push/pop needed to protect inputs while you initialize something else.

**Structured control flow** (Chapter 12) replaces labels and jumps with `if`/`else` and `while`/`break`/`continue`. The compiler generates the same conditional branches — you just do not write the labels.

**Typed assignment** (Chapter 13) introduces `:=`, which automates the IX-relative loads and stores you wrote by hand in Chapters 11–12. The compiler picks registers, handles word-sized slots, and checks types.

**Op macros** (Chapter 14) let you name a short instruction sequence and expand it inline at every call site, with no frame overhead.

None of this hides the machine. Everything translates to the same Z80 instructions as before. What changes is that the source shows the intent, and the compiler writes the scaffolding.

---

## Summary

- A complete ZAX program has a data section, a vars section, a `main` function,
  and one or more helper subroutines.
- Subroutines receive inputs in registers and return results in registers.
  Document which registers each function reads and which it modifies.
- The caller must reload any register that the callee modified before the next
  call. Nothing enforces this.
- Loop labels, skip labels, and conditional branch labels are structural noise:
  they give jumps a target, but carry no meaning about what the code does. You
  have to manage them correctly.
- Push/pop pairs appear when a function needs to initialize a register that
  already holds an input. The real problem is not having named variables.
- Chapters 11–14 — ZAX functions, `if`/`while`, `:=`, and `op` — each address
  one of these problems, while generating the same Z80 output.

---

## Exercises

**1. Trace `find_max` by hand.** The table is `{ 23, 47, 91, 5, 67, 12, 88, 34 }`. Step through `find_max` iteration by iteration, recording the value of A (the running maximum) and C (the current element) after each `ld c, (hl)`. Fill in the table:

| Iteration | C (current) | A before cp | Update A? | A after |
|-----------|-------------|-------------|-----------|---------|
| 1 | 23 | 0 | yes | 23 |
| 2 | 47 | 23 | ? | ? |
| 3 | 91 | ? | ? | ? |
| … | … | … | … | … |

What is A when the loop exits? Does it match the expected result (91)?

**2. The invisible side effect.** `main` reloads `ld hl, values` before calling `count_above`. Why? What value would HL hold after `find_max` returns if you did not reload it? What would `count_above` scan if HL were not reloaded, and what result would `above_64` receive?

**3. Find the redundancy.** The `count_above` function runs `cp c` twice in the loop body. Explain in one sentence why each `cp c` is there and what flag it is testing. Could you combine them into a single test using a different jump? *(Hint: after the first `jr c, skip`, you know A is ≥ C. What additional condition do you need to check?)*

**4. Add a third task.** Extend the program to also count entries that are strictly less than 32, storing the count in a new variable named `below_32`. Write just the additional subroutine and the three lines in `main` that call it. Identify which registers carry each argument and what you must reload before the call.

---

[← I/O and Ports](09-io-and-ports.md) | [Part 1](README.md) | [Functions and the IX Frame →](11-functions-and-the-ix-frame.md)
