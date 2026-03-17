# Chapter 01 — Foundations

The unit 1 examples establish the basic voice of ZAX through arithmetic and
number-theory algorithms. No arrays, no records, no pointer operations — just
functions, typed locals, and structured control flow over integer computations.
That constraint is deliberate: it lets you see the core idioms clearly before
the surface gets wider.

---

## Variables and Types

ZAX has four scalar storage types: `byte` (8-bit unsigned), `word` (16-bit
unsigned), `addr` (16-bit, signals a memory address), and `ptr` (16-bit,
signals a pointer to something). In the unit 1 examples only `byte` and `word`
appear — the others become relevant when dealing with arrays and records.

Storage exists in two places: named `data` sections at module scope, and `var`
blocks inside function bodies.

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

Each local occupies a 16-bit slot in the IX-anchored stack frame. The
initializer value is emitted at function entry, before any instructions in the
body run. The `var` block is terminated by its own `end`; a second `end` closes
the function itself.

The compiler allocates and initialises locals before the callee-save push
sequence. Reading the `.asm` output for a framed function, you will see
`LD HL, imm16` / `PUSH HL` pairs for each initialised local at the top of the
prologue.

---

## The `:=` Assignment Operator

`:=` is the typed storage transfer operator. It reads or writes typed storage
paths: module symbols, function locals, record fields, array elements.

```zax
remaining := exponent    ; write argument value into local
hl := result             ; read local into HL
result := hl             ; write HL back into local
```

The left-hand side and the right-hand side are typed storage paths and
registers. The compiler resolves the IX-relative addressing for frame slots and
emits the required load or store instruction sequence.

This is what distinguishes `:=` from `ld`. When you write `ld hl, $FF00` you
are issuing a Z80 instruction directly. When you write `hl := remaining` you
are asking the compiler to emit whatever instruction sequence is required to
transfer the value of `remaining` into HL — which for a frame-local `word`
means an EX DE,HL / LD-through-DE / EX DE,HL pattern, because H and L cannot
be used directly with IX-relative addressing on the Z80.

You write the intent; the compiler handles the lowering. Both forms appear in
the same function body, and they sit next to each other naturally:

```zax
    hl := remaining     ; typed load: read frame local into HL
    ld a, l
    and 1               ; test the low bit of remaining
    if NZ
      mul_u16 result, factor
      result := hl      ; typed store: write HL back to frame local
    end
```

(From `examples/course/unit1/exp_squaring.zax`, lines 58–63.)

The raw `ld a, l` and `and 1` test the low bit of a 16-bit value. That is
pure Z80 work. The `:=` assignments on either side are typed storage transfers.
Both are idiomatic ZAX.

---

## Functions

Every computation in the unit 1 examples lives inside a `func`. The declaration
names the function, lists its parameters with types, and declares the return
register:

```zax
func gcd_iterative(left_input: word, right_input: word): HL
```

The return register declaration — `: HL` here — is load-bearing. It tells the
compiler two things: HL is the value channel through which the result comes
back, and the compiler should preserve AF, BC, and DE across the call. If
you declare `: HL,DE`, the compiler preserves AF and BC; if you declare no
return clause at all, the compiler preserves all four of AF, BC, DE, and HL.

The caller receives the return value in HL and can rely on BC and DE having
survived the call. That guarantee is mechanical and enforced — not a convention
you maintain by hand.

Parameters are passed on the stack, pushed right-to-left before the call,
cleaned up by the caller after return. Inside the callee, parameter names are
frame-bound: `left_input` reads the first argument from `IX+4`, `right_input`
from `IX+6`, and so on. You write parameter names in expressions; the compiler
emits the IX-relative addressing.

A function call looks like this:

```zax
    mul_u16 result, factor
    result := hl
```

The first line calls `mul_u16` with two arguments passed by value (each a
`word` local, read from the frame and pushed). The result comes back in HL.
The second line stores it into `result`.

---

## Basic Control Flow: `if` and `while`

ZAX structured control flow works on the Z80 flag register, which is exactly
what you would use for a conditional branch in raw assembly. The difference is
that the compiler generates the hidden labels and conditional jumps — you write
the condition code keyword, not a `jp` instruction.

`if NZ`, `if Z`, `if C`, `if NC`, `if M`, `if P`, `if PE`, `if PO` — any Z80
condition code is valid. The condition is tested at the `if` keyword using the
current flag state. It is always the programmer's responsibility to establish
the correct flags with a Z80 instruction immediately before the condition:

```zax
    hl := right
    ld a, h
    or l              ; set Z if HL is zero, clear Z otherwise
    if Z
      hl := left
      ret
    end
```

(From `examples/course/unit1/gcd_iterative.zax`, lines 18–23.)

The `or l` instruction sets Z if HL is zero. The `if Z` block then handles the
base case. This is the standard Z80 null-check pattern: OR H with L, or OR A
with itself to test A, then branch on Z or NZ.

`while <cc>` tests the condition on entry and at the back edge after each
iteration. If the condition is false on entry, the body never runs. The body
must re-establish the flags before control reaches the back edge:

```zax
    ld a, 1
    or a              ; establish NZ to enter the loop
    while NZ
      ; ... loop body ...

      ld a, 1
      or a            ; re-establish NZ to continue
    end
```

This is the recurring idiom for a loop that manages its own exit condition
internally (via `ret` or a structured early exit). The `ld a, 1` / `or a`
sequence before `while` establishes the entry condition; the same sequence at
the bottom of each iteration re-establishes it. The actual exits happen via
early `ret` statements inside the body.

You will see this pattern in nearly every unit 1 function. It is verbose but
transparent: the loop continues until the algorithm explicitly returns.

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

In the unit 1 examples, `succ` and `pred` are the standard way to advance or
retreat a counter local. You will see them throughout the loops that drive
counting and iteration.

---

## The Unit 1 Programs

### Power: repeated multiplication

`power.zax` builds integer power by repeated multiplication of `base`, using
a helper function `mul_u16` to multiply two `word` values by repeated addition.
Both functions share the same loop structure: a `while NZ` loop that counts
down a `remaining` local, returning early when the count reaches zero.

The `pred` built-in decrements `remaining` at the bottom of each iteration.
This is the first example of a common unit 1 pattern: a counting loop with an
explicit zero check at the top and a `pred` decrement at the bottom.

See `examples/course/unit1/power.zax`.

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

(From `examples/course/unit1/gcd_iterative.zax`, lines 26–43.)

`xor a` clears the carry before `sbc hl, de`, so the subtraction result is
exact (no borrow from a prior carry). After the subtraction, C is set if
left < right, Z is set if left == right.

`gcd_recursive.zax` expresses the same algorithm recursively. Each call reduces
one or both operands and recurses. The compiler generates a fresh IX frame for
each call, so the callee's locals are entirely independent of the caller's.
Recursive `func` in ZAX is structurally identical to non-recursive `func` — the
IX frame discipline handles the per-call local state automatically.

See `examples/course/unit1/gcd_iterative.zax` and
`examples/course/unit1/gcd_recursive.zax`.

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

(From `examples/course/unit1/fibonacci.zax`, lines 24–32.)

The `add hl, de` computes the next Fibonacci number. The two `:=` assignments
advance the rolling state. `succ index_value` steps the counter. The loop
exits via an early `ret` when `index_value` reaches `target_count`.

See `examples/course/unit1/fibonacci.zax`.

### Integer square root: Newton iteration

`sqrt_newton.zax` refines a guess iteratively. The initial guess is the input
value itself (a very conservative but safe start). Each iteration computes
`next = (guess + value/guess) / 2`, the standard Newton step for square root.
The helper `div_u16` performs 16-bit unsigned division by repeated subtraction.

The loop runs for a fixed number of iterations (`remaining_iters = 4`) rather
than testing for convergence. This is a deliberate choice for an integer
algorithm: four Newton steps are enough to converge for values in the range
that fits in a `word`.

See `examples/course/unit1/sqrt_newton.zax`.

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

(From `examples/course/unit1/exp_squaring.zax`, lines 56–72.)

The 16-bit right shift uses `srl h` / `rr l`: shift H right with zero fill,
rotate L right through carry (which carries the bit from H). This is the
standard Z80 idiom for a logical right shift of a 16-bit value held in a
register pair.

See `examples/course/unit1/exp_squaring.zax`.

### Decimal digit decomposition

`digits.zax` counts how many decimal digits a value has by dividing
repeatedly by 10. The helper `div_u16` performs unsigned division; the outer
function `decimal_digits` counts divisions until the remaining value is less
than 10.

A notable detail: the initial value of the count local is `1`, not `0`. A
positive integer always has at least one decimal digit, so the count starts at
one before the loop begins. The loop increments the count (`succ count`) each
time division is needed. This is a small example of how initial-value choices
in `var` declarations express algorithmic invariants.

See `examples/course/unit1/digits.zax`.

---

## What This Unit Teaches About ZAX

- `:=` is the interface between typed storage and the Z80 register file. It
  appears constantly alongside raw Z80 mnemonics in the same function body.
- Functions declare their return register. The compiler enforces the
  complementary preservation set. Callers can rely on those registers surviving
  a typed call.
- `while NZ` with an explicit `ld a, 1` / `or a` idiom is the basic loop
  form when the loop body manages its own termination via early `ret`.
- `succ` and `pred` are the idiomatic scalar increment and decrement operators.
  They appear wherever a loop counter or accumulator needs stepping.
- Recursive functions look and work like non-recursive ones. The compiler
  handles the per-call IX frame.

---

## Examples in This Unit

- `examples/course/unit1/power.zax` — integer power by repeated multiplication
- `examples/course/unit1/gcd_iterative.zax` — Euclid's algorithm, iterative
- `examples/course/unit1/gcd_recursive.zax` — Euclid's algorithm, recursive
- `examples/course/unit1/sqrt_newton.zax` — Newton-step integer square root
- `examples/course/unit1/exp_squaring.zax` — exponentiation by squaring
- `examples/course/unit1/fibonacci.zax` — iterative Fibonacci with rolling state
- `examples/course/unit1/digits.zax` — decimal digit count by repeated division

---

## What comes next

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
   adjust the loop accordingly. Which version makes the invariant clearer?

4. `sqrt_newton.zax` uses a fixed iteration count. Modify it to iterate until
   `next_guess == guess` (convergence). What edge cases does the fixed count
   avoid? What does an explicit convergence test expose?
