[← Introduction](00-introduction.md) | [Part 2](README.md) | [Arrays and Loops →](02-arrays-and-loops.md)

# Chapter 1 — Foundations

The Chapter 01 examples work with arithmetic and number-theory algorithms.
There are no arrays, records, or pointer operations — just functions, typed
locals, and structured control flow over integer computations. That scope
keeps the working patterns visible before the language grows wider.

---

## Variables and Types

In raw Z80 code, every intermediate value lives in a register or at a
hand-chosen memory address. You track which register holds what, and if you run
out of registers you spill to memory yourself. ZAX typed variables replace that
manual tracking: you give a value a name and a type, and the compiler handles
where it lives.

ZAX has four scalar storage types: `byte` (8-bit unsigned), `word` (16-bit
unsigned), `addr` (16-bit, signals a memory address), and `ptr` (16-bit,
signals a pointer to something). In these examples only `byte` and `word`
appear — the others become relevant when you start working with arrays and
records.

You can declare storage in two places: named `data` sections at module scope,
and `var` blocks inside function bodies.

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

Each local occupies a 16-bit slot in the function's stack frame. The
initializer value is emitted at function entry, before any instructions in the
body run. The `var` block is terminated by its own `end`; a second `end` closes
the function itself.

The compiler allocates and initialises locals before the register-save push
sequence. Reading the `.asm` output for a framed function, you will see
`LD HL, imm16` / `PUSH HL` pairs for each initialised local at the top of the
prologue.

---

## The `:=` Assignment Operator

In raw Z80, moving a value between a register and a named location means writing
the `ld` instruction yourself, with the exact register and address. That works,
but it means you always have to know the address, remember which register holds
what, and keep those details consistent by hand.

`:=` is the way you read or write a named variable without spelling out the
load or store sequence yourself. When you write:

```zax
remaining := exponent
```

you are telling the compiler: "put the value of `exponent` into `remaining`."
The compiler figures out where both of those live (in the function's stack frame,
in a specific register, as a named constant) and emits the right instruction
sequence. You write the intent; the compiler does the mechanical part.

`:=` works in both directions. You can read a local into a register:

```zax
hl := result             ; load the local 'result' into HL
```

Or write a register back into a local:

```zax
result := hl             ; store HL into the local 'result'
```

This is different from `ld`. When you write `ld hl, $FF00` you are writing a
specific Z80 instruction — "load HL with this constant." When you write
`hl := result` you are describing a transfer between a named storage location
and a register, and the compiler works out the instruction to use. For a local
`word` variable, that might take more than one instruction internally, because
the Z80's indexed addressing has constraints. You do not need to know the
details — that is the point.

In practice, both `:=` and `ld` appear in the same function body:

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

The `ld a, l` and `and 1` are raw Z80 instructions — testing a specific bit
of a specific register. The `:=` lines on either side are named transfers to
and from the local `remaining`. Both appear naturally together. Raw instructions
when you are doing register-level work; `:=` when you want to read or write a
named local without tracking the address yourself.

---

## Functions

Every computation in the Chapter 01 examples lives inside a `func`. You have
seen `func` in Volume 1 — here is a quick recap of the parts that matter most
in these examples.

A function declaration names the function, lists its parameters with types, and
says which register carries the result:

```zax
func gcd_iterative(left_input: word, right_input: word): HL
```

`left_input` and `right_input` are the inputs. Both are `word` — a 16-bit
unsigned value. The `: HL` at the end says two things: HL will carry the result
when the function returns, and the compiler will automatically save and restore
AF, BC, and DE around the function body so the caller does not have to worry
about them.

Inside the function, you use the parameter names directly — `left_input`,
`right_input` — with `:=` to read or write them. The compiler handles the
addressing; you just use the name.

Calling a function with arguments looks like this:

```zax
    mul_u16 result, factor
    result := hl
```

`mul_u16` takes two `word` arguments. After it returns, the result is in HL.
The `:=` then stores it into the local `result`.

---

## Basic Control Flow: `if` and `while`

ZAX structured control flow works on the Z80 flag register, which is exactly
what you would use for a conditional branch in raw assembly. The difference is
that the compiler generates the hidden labels and conditional jumps — you write
the condition code keyword, not a `jp` instruction.

`if NZ`, `if Z`, `if C`, `if NC`, `if M`, `if P`, `if PE`, `if PO` — any Z80
condition code is valid. The condition is tested at the `if` keyword using the
current flag state. It is always your responsibility to establish the correct flags with a Z80
instruction immediately before the condition:

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

The `or l` instruction sets Z if HL is zero. The `if Z` block then handles the
base case. This is the standard Z80 null-check pattern: OR H with L, or OR A
with itself to test A, then branch on Z or NZ.

`while <cc>` tests the condition on entry and at the back edge after each
iteration. If the condition is false on entry, the body never runs. The entry
flag rule therefore always applies: flags must correctly represent the loop
condition before the first `while` test, not only at the back edge. The body
must also re-establish the flags before control reaches the back edge:

```zax
    ld a, 1
    or a            ; establish NZ before the first while test
    while NZ
      ; ... loop body ...

      ld a, 1
      or a            ; re-establish NZ for the next iteration
    end
```

`ld a, 1` / `or a` is the reliable way to establish NZ. It appears
at entry and at the back edge whenever the loop condition must be guaranteed.
If Z=1 on entry to a `while NZ` loop, the body never executes regardless of
what is inside it.

---

## `succ` and `pred`

ZAX provides two built-in operations for incrementing and decrementing typed
scalar paths: `succ` and `pred`. They operate on locals, module-scope
variables, record fields, and array elements — any typed scalar storage path.

```zax
    succ index_value    ; increment the word local 'index_value' by 1
    pred remaining      ; decrement the word local 'remaining' by 1
```

These are not function calls; they lower to an efficient read-increment-write
(or read-decrement-write) sequence at the storage path in question. Using
`succ` and `pred` instead of a manual HL-roundtrip sequence keeps the code
concise and the intent visible.

In the Chapter 01 examples, `succ` and `pred` are the standard way to advance or
retreat a counter local. You will see them throughout the loops that drive
counting and iteration.

---

## The Chapter 01 Programs

### Power: repeated multiplication

`power.zax` builds integer power by repeated multiplication of `base`, using
a helper function `mul_u16` to multiply two `word` values by repeated addition.
Both functions share the same loop structure: a `while NZ` loop that counts
down a countdown local, returning early when the count reaches zero.

The `pred` built-in decrements `remaining` at the bottom of each iteration.
This is the first example of a common Chapter 01 pattern: a counting loop with an
explicit zero check at the top and a `pred` decrement at the bottom.

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

    succ index_value
```

(From `learning/part2/examples/unit1/fibonacci.zax`, lines 26–34.)

The `add hl, de` computes the next Fibonacci number. The two `:=` assignments
advance the rolling state. `succ index_value` steps the counter. The loop
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
one before the loop begins. The loop increments the count (`succ count`) each
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
- `succ` and `pred` increment and decrement typed scalar paths.
  They appear wherever a loop counter or accumulator needs stepping.
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
