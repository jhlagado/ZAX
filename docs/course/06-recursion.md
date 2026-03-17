# Chapter 06 — Recursion

The unit 6 examples show recursive decomposition using the same `func` construct
that has appeared throughout the course. There is nothing structurally new in how
ZAX handles recursion: every `func` call — whether the callee is a different
function or the same function calling itself — generates a fresh IX frame. The
compiler does not distinguish recursive from non-recursive calls. The disciplined
consequence is that each invocation has its own independent locals, and the
programmer does not need to think about saving state across the recursive boundary.

What changes in unit 6 is the algorithmic shape. These examples do not loop over
a flat array or advance a pointer; they reduce a problem into a smaller version of
itself, recurse, and combine the result on the way back. That "on the way back"
structure — work done after the recursive call returns — is what makes the call
stack load-bearing in a way it was not in the iterative examples.

---

## The IX Frame Under Recursion

Every `func` with a `var` block gets a fresh IX frame on entry. The compiler emits
`push ix` / `ld ix, 0` / `add ix, sp` to anchor the frame, allocates space for
the declared locals below IX, then emits the callee-save pushes for the registers
the function will clobber.

In a recursive function, each call to itself pushes a new frame on top of the
previous one. When the base case returns, the innermost frame is popped and the
previous frame's IX is restored. Each level sees its own `var` block values,
completely independent.

The unit 1 chapter noted that recursive functions look and work like non-recursive
ones. Unit 6 demonstrates this at greater depth: `hanoi_count` calls itself twice
per invocation and stores both results in frame locals, `array_sum_recursive`
calls itself once and adds to the result on unwind, and `array_reverse_recursive`
calls itself with a narrower range at each level. None of these require any
special syntax for recursion.

---

## Counting: Towers of Hanoi

### `hanoi.zax`

The Towers of Hanoi problem asks how many moves are required to transfer a stack
of `n` disks from one peg to another using a spare peg. The recurrence is:

- `hanoi(0) = 0` (no disks, no moves)
- `hanoi(n) = 2 * hanoi(n - 1) + 1` (move n-1 disks aside, move the bottom disk, move n-1 disks back)

`hanoi_count` in `hanoi.zax` implements this directly. The base case returns zero
when `disks_count` is zero. Otherwise, it decrements `disks_count` into a local
`reduced_count` using `pred`, makes two recursive calls with the pegs permuted,
and combines the results:

```zax
  reduced_count := disks_count
  pred reduced_count

  hanoi_count reduced_count, source_peg, target_peg, spare_peg
  left_count := hl

  hanoi_count reduced_count, spare_peg, source_peg, target_peg
  right_count := hl

  hl := left_count
  inc hl
  de := right_count
  add hl, de
```

(From `examples/course/unit6/hanoi.zax`, lines 20–33.)

Both recursive calls return in HL. Each result is stored immediately into a local
— `left_count := hl` and `right_count := hl` — before the next call overwrites
HL. This is the essential pattern for preserving return values across multiple
recursive calls: store into a typed local, not into a register.

The final combine step loads `left_count` into HL, increments it by one (the move
of the bottom disk), then adds `right_count` via DE. `inc hl` is a raw Z80
instruction; `de := right_count` and `add hl, de` mix a typed load with a raw
arithmetic instruction — a normal pairing in ZAX.

See `examples/course/unit6/hanoi.zax`.

---

## Accumulating on Unwind: Recursive Array Sum

### `array_sum_recursive.zax`

Summing an array recursively demonstrates the structure where the accumulation
happens on the way back up, not on the way down. `sum_from` computes the sum of
`numbers[index_value..]` by reading the current element, recursing on the tail,
and adding the current element to the result as it unwinds:

```zax
func sum_from(index_value: byte): HL
  ...
  l := index_value
  a := numbers[L]
  current_value := a

  next_index := index_value
  succ next_index

  sum_from next_index

  a := current_value
  ld e, a
  ld d, 0
  add hl, de
end
```

(From `examples/course/unit6/array_sum_recursive.zax`, lines 25–37.)

The recursive call `sum_from next_index` returns the sum of everything after the
current element in HL. The current element, saved in `current_value` before the
call, is then zero-extended into DE and added to HL. Each level contributes its
element to the running total as the call stack unwinds.

The zero-extension — `ld e, a` / `ld d, 0` — is a recurring Z80 pattern for
promoting an 8-bit byte value into a 16-bit DE pair for use with `add hl, de`.
There is no ZAX operator for this; the two raw instructions are the idiom.

The base case returns `ld hl, 0` when `index_value == ItemCount`, providing the
zero that the deepest level adds to. Every other level adds one element to that
running total on the way back.

See `examples/course/unit6/array_sum_recursive.zax`.

---

## Structural Recursion: In-Place Array Reversal

### `array_reverse_recursive.zax`

Reversing an array in place by recursion is a structural example: swap the
endpoints, then recurse on the interior. The recursion terminates when the
two indices meet or cross, at which point there is nothing left to swap.

`reverse_range` takes a `left_index` and `right_index`. If `left_index >= right_index`,
it returns immediately. Otherwise, it swaps the two endpoints, advances the
left index with `succ next_left`, retreats the right index with `pred next_right`,
and recurses:

```zax
func reverse_range(left_index: byte, right_index: byte)
  ...
  a := left_index
  b := right_index
  cp b
  if NC
    ret
  end

  swap_values left_index, right_index

  next_left := left_index
  succ next_left

  next_right := right_index
  pred next_right

  reverse_range next_left, next_right
end
```

(From `examples/course/unit6/array_reverse_recursive.zax`, lines 41–56.)

The termination test uses `cp b` with `if NC`: `cp b` subtracts B from A and sets
NC when A >= B. This is the same signed comparison idiom seen throughout the
course. When `left_index >= right_index`, the function returns without doing work.

The helper `swap_values` is a separate `func` that reads both elements into locals
and writes them back in reversed positions. It has its own IX frame and its own
`var` block. Calling a helper inside a recursive function adds depth to the call
stack, but each frame is independent.

After the swap, the locals `next_left` and `next_right` are used rather than
passing the incremented/decremented values directly. This is the same pattern
from `hanoi.zax`: compute the adjusted values into locals before passing them as
arguments, because argument expressions are evaluated before the frame is set up
for the call.

See `examples/course/unit6/array_reverse_recursive.zax`.

---

## What This Unit Teaches About ZAX

- Recursive functions use no special syntax. Each call — self or otherwise —
  generates a fresh IX frame with independent locals. The call stack depth is the
  recursion depth.
- Return values in HL must be captured into a typed local before the next call
  can overwrite HL. `left_count := hl` followed by a second recursive call is the
  standard pattern.
- `succ` and `pred` on frame locals correctly advance arguments for the recursive
  call. The incremented value is computed and stored before it is passed, not
  computed in place inside the argument list.
- `ld e, a` / `ld d, 0` is the idiom for zero-extending a byte into DE for use
  with `add hl, de`. This appears wherever an 8-bit element value needs to be
  added into a 16-bit accumulator in HL.
- The recursion depth is bounded by the algorithm. `hanoi_count 4` produces four
  levels of double-recursive calls. On a real Z80, the stack must be large enough
  to hold all frames. That is the programmer's responsibility.

---

## Examples in This Unit

- `examples/course/unit6/hanoi.zax` — Towers of Hanoi move count, double recursion
- `examples/course/unit6/array_sum_recursive.zax` — array sum by tail recursion
  and accumulation on unwind
- `examples/course/unit6/array_reverse_recursive.zax` — in-place reversal by
  structural recursion on a shrinking index range

---

## What comes next

Chapter 07 shows how a larger program is assembled from multiple source files.
The RPN calculator imports a support module and dispatches on token kind using
`select`. The pattern of storing intermediate results into typed locals before
the next call — visible in `hanoi.zax` here — reappears throughout the
calculator's operator arms.

---

## Exercises

1. `hanoi_count` stores both recursive results in `word` locals before combining
   them. What would happen if the second recursive call were made before storing
   the first result into `left_count`? Trace the frame state.

2. `array_sum_recursive.zax` recurses on the tail of the array and adds the head
   element on unwind. Rewrite it to recurse on the head (increment nothing, process
   `numbers[0]`, recurse with index 1) and accumulate on the way down instead.
   Does the result change? Does the code structure change?

3. The `reverse_range` base case returns when `left_index >= right_index`. For an
   array of odd length, the two indices will meet exactly at the middle element.
   For an even length, they will cross. Trace both cases for a four-element and
   five-element array.

4. `array_reverse_recursive.zax` uses a helper `swap_values` as a separate `func`.
   Could the swap be inlined into `reverse_range` without a helper? What would
   the frame depth change be, and would that affect correctness?
