[← Introduction](00-introduction.md) | [Part 2](README.md) | [Arrays and Loops →](02-arrays-and-loops.md)

# Chapter 1 — Foundations

Arithmetic and number theory make good first examples for this part of the course: the algorithms are self-contained, the results are easy to verify by hand, and they use every ZAX feature that later chapters build on — without arrays, records, or pointer operations complicating the picture. Working through power, GCD, Fibonacci, square root, and decimal digit count gives you a solid footing before the data structures start getting interesting.

---

## Variables and Types

ZAX has three scalar storage types: `byte` (8-bit unsigned), `word` (16-bit unsigned), and `addr` (16-bit, for memory addresses). In these examples only `byte` and `word` appear — `addr` becomes relevant when you start working with arrays and records.

A `var` block declares function-local scalars with optional initializers:

```zax
func power(base: word, exponent: word): HL
  var
    result:    word = 1
    remaining: word = 0
  end
  ...
end
```

Each local occupies a 16-bit slot in the IX stack frame. The `var` block is closed by its own `end`; a second `end` closes the function. *(Part 1 Chapter 11 covers the full frame layout.)*

---

## The `:=` Assignment Operator

`:=` assigns from right to left between typed storage and a register. The compiler resolves names to frame offsets and emits the right instruction sequence — including multi-instruction sequences for word-sized locals. *(Part 1 Chapter 13 covers the full detail.)*

In practice, `:=` and raw Z80 instructions appear together in the same function body:

```zax
    hl := remaining     ; typed load: read frame local into HL
    ld a, l
    and 1               ; test the low bit of remaining
    if NZ
      mul_u16 result, factor
      result := hl      ; typed store: write HL back to frame local
    end
```

(Adapted from `learning/part2/examples/unit1/exp_squaring.zax`, lines 60–66.)

Raw instructions for register-level work; `:=` when you want to read or write a named local without tracking the address yourself. Both appear freely in the same body.

---

## Functions

A function declaration names the function, lists parameters with types, and declares the return register:

```zax
func gcd_iterative(left_input: word, right_input: word): HL
```

`: HL` means HL carries the result and the compiler saves/restores AF, BC, and DE. Parameters are accessed by name via `:=`. Calling a function with arguments:

```zax
    mul_u16 result, factor
    result := hl
```

`mul_u16` takes two `word` arguments; after it returns the result is in HL and `:=` stores it into a local.

---

## Basic Control Flow: `if` and `while`

Any Z80 condition code is valid: `if NZ`, `if Z`, `if C`, `if NC`, `if M`, `if P`, `if PE`, `if PO`. The compiler generates the hidden labels and jumps; you write the condition and the body. Flags must be established by a Z80 instruction immediately before the `if` or `while`. *(Part 1 Chapters 5 and 12 cover the full rules.)*

A concrete pattern from these examples: testing whether a 16-bit value is zero:

```zax
    hl := right
    ld a, h
    or l              ; set Z if HL is zero, clear Z otherwise
    if Z
      hl := left
      ret
    end
```

(Adapted from `learning/part2/examples/unit1/gcd_iterative.zax`, lines 20–26.)

`or l` ORs H and L together; Z is set if the result is zero, clear otherwise. The `if Z` block handles the base case. `while <cc>` tests the same condition on entry and at the back edge — the flag-before-branch rule applies at both points. The body is responsible for re-establishing the correct flags before control reaches the back edge.

---

## `step`

`step path` increments a typed scalar by one. `step path, amount` adds any signed compile-time integer. The amount must be a literal or a `const` — not a runtime variable.

```zax
    step index_value         ; +1
    step remaining, -1       ; -1
    step offset, 4           ; +4
```

`step` is the standard way to advance or retreat a counter local throughout these loops. *(Part 1 Chapter 13 covers `step` in full.)*

---

## The Chapter 01 Programs

### Power: repeated multiplication

`power.zax` builds integer power by repeated multiplication of `base`, using
a helper function `mul_u16` to multiply two `word` values by repeated addition.
Both functions share the same loop structure: a `while NZ` loop that counts
down a countdown local, returning early when the count reaches zero.

`step remaining, -1` decrements `remaining` at the bottom of each iteration.
This is the first example of a common pattern in this chapter: a counting loop with an
explicit zero check at the top and a decrement at the bottom.

See `learning/part2/examples/unit1/power.zax`.

### GCD: iterative and recursive

`gcd_iterative.zax` implements Euclid's algorithm by subtraction: at each step,
replace the larger of two values with the difference. The loop continues until
the two values are equal (difference is zero) or one of them reaches zero.

The ZAX structure for this is a `while NZ` loop containing nested `if` blocks
for the three cases (right is zero, values are equal, one is larger):

```zax
    hl := left
    de := right
    xor a
    sbc hl, de          ; signed subtract: sets C if left < right, Z if equal
    if Z
      hl := left
      ret
    end
    if NC
      left := hl        ; left was larger: left := left - right
    end
    if C
      ; right was larger: right := right - left
      hl := right
      de := left
      xor a
      sbc hl, de
      right := hl
    end
```

(Adapted from `learning/part2/examples/unit1/gcd_iterative.zax`, lines 28–45.)

`xor a` clears the carry before `sbc hl, de`, so the subtraction result is
exact (no borrow from a prior carry). After the subtraction, C is set if
left < right, Z is set if left == right.

`gcd_recursive.zax` expresses the same algorithm recursively. Each call reduces
one or both operands and recurses. The compiler generates a fresh IX frame for
each call, so the callee's locals are entirely independent of the caller's.
Recursive `func` in ZAX works exactly like non-recursive `func` — the compiler
creates a fresh stack frame for each call, so each level gets its own locals
automatically.

See `learning/part2/examples/unit1/gcd_iterative.zax` and
`learning/part2/examples/unit1/gcd_recursive.zax`.

### Fibonacci: rolling state

`fibonacci.zax` maintains two locals — `prev_value` and `curr_value` — that
carry consecutive Fibonacci values across iterations. A third local
`index_value` counts up to the target. At each step, the next value is computed
from the sum of the current pair, then the pair advances one position:

```zax
    hl := prev_value
    de := curr_value
    add hl, de
    next_value := hl

    prev_value := curr_value
    curr_value := next_value

    step index_value
```

(From `learning/part2/examples/unit1/fibonacci.zax`, lines 26–34.)

The `add hl, de` computes the next Fibonacci number. The two `:=` assignments
advance the rolling state. `step index_value` steps the counter. The loop
exits via an early `ret` when `index_value` reaches `target_count`.

See `learning/part2/examples/unit1/fibonacci.zax`.

### Integer square root: Newton iteration

`sqrt_newton.zax` refines a guess iteratively. The initial guess is the input
value itself (a very conservative but safe start). Each iteration computes
`next = (guess + value/guess) / 2`, the standard Newton step for square root.
The helper `div_u16` performs 16-bit unsigned division by repeated subtraction.

The loop runs for a fixed number of iterations (`remaining_iters = 4`) rather
than testing for convergence. This is a deliberate choice for an integer
algorithm: four Newton steps are enough to converge for values in the range
that fits in a `word`.

See `learning/part2/examples/unit1/sqrt_newton.zax`.

### Exponentiation by squaring

`exp_squaring.zax` computes power more efficiently than repeated multiplication
by halving the exponent at each step. If the current exponent bit is odd,
multiply the running result by the current factor; then square the factor and
halve the exponent:

```zax
    hl := remaining
    ld a, l
    and 1             ; test the low bit of the exponent
    if NZ
      mul_u16 result, factor
      result := hl
    end

    mul_u16 factor, factor
    factor := hl

    hl := remaining
    srl h
    rr l              ; halve: logical right shift of 16-bit pair HL
    remaining := hl
```

(Adapted from `learning/part2/examples/unit1/exp_squaring.zax`, lines 60–74, condensed.)

The 16-bit right shift uses `srl h` / `rr l`: shift H right with zero fill,
rotate L right through carry (which carries the bit from H). This is the
standard Z80 way to shift a 16-bit register pair one place to the right.

See `learning/part2/examples/unit1/exp_squaring.zax`.

### Decimal digit decomposition

`digits.zax` counts how many decimal digits a value has by dividing
repeatedly by 10. The helper `div_u16` performs unsigned division; the outer
function `decimal_digits` counts divisions until the remaining value is less
than 10.

A notable detail: the initial value of the count local is `1`, not `0`. A
positive integer always has at least one decimal digit, so the count starts at
one before the loop begins. The loop increments the count (`step count`) each
time division is needed. Starting at 1 reflects that assumption directly — the
`var` declaration records the guarantee, not just an arbitrary starting point.

See `learning/part2/examples/unit1/digits.zax`.

---

## Summary

- `:=` is the interface between typed storage and the Z80 register file. It
  appears constantly alongside raw Z80 mnemonics in the same function body.
- Functions declare their return register. The compiler enforces the
  complementary preservation set. Callers can rely on those registers surviving
  a typed call.
- `while NZ` is the basic loop form. Entry flags always matter: a stale Z=1
  on entry skips the loop body entirely. Establish NZ with `ld a, 1` / `or a`
  before the first `while NZ`, and re-establish it at the back edge.
- `step path` increments a typed scalar by one; `step path, amount` adds any
  signed compile-time integer. Both appear wherever a counter or accumulator
  needs advancing.
- Recursive functions look and work like non-recursive ones. The compiler
  handles the per-call IX frame.

---

## Examples in This Chapter

- `learning/part2/examples/unit1/power.zax` — integer power by repeated multiplication
- `learning/part2/examples/unit1/gcd_iterative.zax` — Euclid's algorithm, iterative
- `learning/part2/examples/unit1/gcd_recursive.zax` — Euclid's algorithm, recursive
- `learning/part2/examples/unit1/sqrt_newton.zax` — Newton-step integer square root
- `learning/part2/examples/unit1/exp_squaring.zax` — exponentiation by squaring
- `learning/part2/examples/unit1/fibonacci.zax` — iterative Fibonacci with rolling state
- `learning/part2/examples/unit1/digits.zax` — decimal digit count by repeated division

---

## What Comes Next

Chapter 02 extends the foundation with arrays and the full loop-control surface:
`break` and `continue`. The algorithms there sort and search small byte arrays,
which requires indexed storage, multi-pass loops, and early exits — three things
that build directly on the typed storage and control flow introduced here.

---

## Exercises

1. In `gcd_iterative.zax`, both the iterative and recursive forms use the
   subtraction form of Euclid's algorithm rather than the modulo form. The
   modulo form converges faster for inputs with a large ratio. Modify
   `gcd_iterative.zax` to use `div_u16` for the remainder step. Does the
   loop structure change meaningfully?

2. `fibonacci.zax` uses four locals. Could it be rewritten using three, with
   one less `word` slot? What is the tradeoff in readability?

3. In `digits.zax`, the initial value of `count` is 1. Change it to 0 and
   adjust the loop accordingly. Which version is easier to read?

4. `sqrt_newton.zax` uses a fixed iteration count. Modify it to iterate until
   `next_guess == guess` (convergence). What edge cases does the fixed count
   avoid? What does an explicit convergence test expose?

---

[← Introduction](00-introduction.md) | [Part 2](README.md) | [Arrays and Loops →](02-arrays-and-loops.md)
