[← Foundations](01-foundations.md) | [Part 2](README.md) | [Strings →](03-strings.md)

# Chapter 02 — Arrays and Loops

The Chapter 02 examples introduce arrays and the full loop surface: `while`,
`break`, and `continue`. The algorithms in this chapter — sorting and searching
over small byte arrays — are chosen deliberately. They require indexed storage,
they loop over it repeatedly, and they exit loops early under specific
conditions. That last requirement is what makes `break` and `continue` earn
their place in this chapter.

---

## Arrays

An array in ZAX is declared with a type, a length, and an optional initializer:

```zax
section data vars at $8000
  values: byte[8] = { 9, 4, 6, 2, 8, 1, 7, 3 }
end
```

This declares a module-level `byte` array of eight elements, initialized to the
given values. The storage lives in the named `data` section starting at `$8000`.

`byte[8]` means exactly eight one-byte elements — `sizeof(byte[8]) = 8`.
There is no padding. If you write `word[4]`, you get exactly eight bytes: four
two-byte elements. The compiler tracks exact sizes and uses them to compute
element strides for indexed access.

The Chapter 02 examples give these sizes names rather than repeating the
literal everywhere:

```zax
const ItemCount = 8
const LastIndex = ItemCount - 1
```

`const` values are compile-time expressions. They can reference other `const`
names and use standard arithmetic and bitwise operators. The compiler resolves
them before generating any code. `LastIndex = ItemCount - 1` is not a
subtraction at runtime — it is a constant folded to `7` at compile time.
`const` names can appear in raw instruction operands (`ld b, LastIndex`,
`ld hl, ItemCount`) and inside other `const` expressions. Array size
declarations (`byte[8]`) currently require literal values.

Declaring an array as a function local is not directly supported for variable-
length storage — function `var` blocks only hold scalars. Working arrays for
Chapter 02 algorithms live in named `data` sections at module scope, which is the
normal home for data that persists across function calls.

---

## Array Indexing

To read or write an array element, you put a register inside the square
brackets:

```zax
    l := scan_index       ; load the index into L (an 8-bit register)
    a := values[L]        ; read the element at position L
```

The index register must be one of the valid Z80 register forms: an 8-bit
register (`A`, `B`, `C`, `D`, `E`, `H`, `L`), a 16-bit pair (`HL`, `DE`,
`BC`), or an indirect form like `(HL)`. Computed expressions are not valid
inside `[...]` — you must compute the index into a register first.

For a `byte[]` array with an 8-bit index, L is the natural choice. L is the
low half of HL, which is the register pair the Z80 uses for most memory
addressing. Loading the index into L and leaving H as zero gives you a valid
16-bit address offset with minimal fuss.

This is the register-as-index convention throughout the Chapter 02 examples: load
the index into L (or occasionally B), perform the array access, then advance
the index with `succ` or with an arithmetic instruction.

### Writing Back

The same syntax works for stores:

```zax
    l := left_index
    a := right_value
    values[L] := a        ; write A into values[L]
```

The place expression `values[L]` on the left side of `:=` is a store; the
compiler emits the required address calculation and write instruction.

### The `arr[HL]` vs `arr[(HL)]` Distinction

One indexing detail is worth remembering: `values[HL]` uses HL directly as a
16-bit index into the array. `values[(HL)]` reads a byte from memory at address
HL and uses that byte as the index. These mean different things. The Chapter 02
examples use the direct form: the index is a value held in a register, not
a value pointed to by a register.

---

## The `while` Loop

Chapter 01 introduced `while <cc> ... end`: it checks the condition before each
iteration. If the condition is false on entry, the body never executes. All the
chapter 02 examples use this form because the loop bounds are checked upfront —
every sort and search knows its range before it starts.

ZAX also has a `repeat ... until <cc>` form that runs the body at least once
and tests the condition at the bottom. None of the Chapter 02 examples require
it.

---

## `break` and `continue`

`break` exits the enclosing loop immediately, transferring control to the
statement after the loop's `end`. `continue` skips the remainder of the current
loop iteration and jumps to the back-edge condition check.

Both `break` and `continue` apply to the innermost enclosing loop — `while` or
`repeat`/`until`. They are unconditional by themselves; if you want a
conditional `break`, put the `break` inside an `if` block.

### `break` in `prime_sieve.zax`

The prime sieve uses `break` in two places: once to exit the outer factor loop
when the factor exceeds the stop threshold, and once to exit the inner multiple-
marking loop when the multiple exceeds the array limit.

The outer loop:

```zax
  while NZ
    a := factor_index
    cp StopFactor
    if NC
      break               ; factor >= StopFactor: no more composites to mark
    end

    l := factor_index
    a := is_prime[L]
    or a
    if Z
      succ factor_index
      ld a, 1
      or a
      continue            ; this factor is already composite: skip to next
    end
    ...
```

(From `learning/part2/examples/unit2/prime_sieve.zax`, lines 21–37.)

The `break` fires when `factor_index >= StopFactor` (the `cp` instruction sets
carry when A < StopFactor; `if NC` means carry is not set, so A >= StopFactor).
At that point, every composite number up to the limit has been marked and the
outer loop has nothing more to do. Without `break`, the loop would need an
explicit boolean flag — a local set to 0 or 1 — and the condition test at the
top of `while` would check that flag instead of the `ld a, 1` / `or a` pattern.
With `break`, the exit condition is expressed exactly where it arises.

### `continue` in `prime_sieve.zax`

The `continue` in the outer loop skips the marking pass for a factor that has
already been marked composite. If `is_prime[factor_index]` is zero (already
composite), there is no point computing its multiples — they were already
marked by a smaller factor. The `continue` advances `factor_index` with `succ`
and re-enters the loop, re-establishing the `NZ` condition before jumping to
the back edge:

```zax
    if Z
      succ factor_index
      ld a, 1
      or a
      continue            ; jump to the while NZ condition check
    end
```

Note the `ld a, 1` / `or a` before `continue`. The back edge of the `while NZ`
loop tests the flag state at that point. After `continue`, control returns to
the condition test at the top of the `while`. The `or a` with A set to 1
ensures the condition reads NZ (non-zero), so the loop continues rather than
exits. If you omit this, the loop exits immediately on the `continue` because
the `or a` from `is_prime[L]` left Z set.

### `break` in the inner loop

The inner loop marks multiples of the current factor composite. It also uses
`break` to exit when the multiple index exceeds the sieve limit:

```zax
    while NZ
      a := multiple_index
      cp Limit
      if NC
        break             ; multiple_index >= Limit: done marking this factor
      end

      l := multiple_index
      ld a, 0
      is_prime[L] := a

      a := multiple_index
      b := factor_index
      add a, b
      multiple_index := a

      ld a, 1
      or a
    end
```

(From `learning/part2/examples/unit2/prime_sieve.zax`, lines 43–63.)

The structure is the same as the outer break: test the bound, `break` when
exceeded. The loop body marks the current multiple composite, then advances
`multiple_index` by `factor_index` (each multiple is one factor step further).
The `ld a, 1` / `or a` re-establishes NZ for the next iteration.

### `break` in `selection_sort.zax`

The `find_min_index` helper in `selection_sort.zax` uses `break` to exit the
scan loop once it has passed the last valid index:

```zax
  while NZ
    a := current_index
    b := last_index
    cp b
    if NC
      if NZ
        break             ; current_index > last_index: scan complete
      end
    end
    ...
    succ current_index
    ld a, 1
    or a
  end
```

(From `learning/part2/examples/unit2/selection_sort.zax`, lines 54–82, condensed.)

The condition `if NC` / `if NZ` tests for `current_index > last_index`: `cp b`
sets NC when A >= B, and the nested `if NZ` excludes the equal case. When
both conditions are true — the index has gone past the last valid position —
the scan is complete and `break` exits the loop immediately.

---

## The Sorting Examples

### Bubble sort

Bubble sort repeatedly walks adjacent pairs through the array, swapping any
pair that is out of order. Each pass pushes the largest unsorted element to its
final position. The pass bound (`pass_last`) shrinks by one after each pass.

The outer function `bubble_sort` drives the pass sequence; the inner function
`bubble_pass` performs one pass. Each function has its own `while NZ` loop.
`bubble_pass` exits early via `ret` when `inner_index` reaches `last_index`.

```zax
func bubble_pass(last_index: byte)
  ...
  while NZ
    a := inner_index
    b := last_index
    cp b
    if NC
      ret               ; inner_index >= last_index: pass complete
    end
    ...
    succ inner_index
    ld a, 1
    or a
  end
end
```

(From `learning/part2/examples/unit2/bubble_sort.zax`, lines 44–78, condensed.)

The comparison and conditional swap use the same L-as-index pattern as the
other sorting examples: load the index into L, read `values[L]`, compare,
swap if out of order.

See `learning/part2/examples/unit2/bubble_sort.zax`.

### Insertion sort

Insertion sort works by maintaining a sorted prefix of the array. For each new
element (the `hold_value`), it finds the correct insertion position in the
prefix and shifts elements right to make room.

The Chapter 02 version implements this recursively through the helper
`insert_hole`, which walks leftward through the prefix comparing adjacent
elements. The recursion depth is bounded by the array length; for short arrays
this is fine. The function exits early via `ret` in two cases: when the scan
reaches index 0 (nowhere further left to shift), or when it finds an element
that is already in the correct relative order.

```zax
func insert_hole(scan_index: byte, hold_value: byte)
  ...
  a := left_value
  b := hold_value
  cp b
  if C                  ; left_value < hold_value: correct position found
    l := scan_index
    a := hold_value
    values[L] := a
    ret
  end
  ...
  insert_hole prior_index, hold_value   ; recurse one step left
end
```

(From `learning/part2/examples/unit2/insertion_sort.zax`, lines 34–54, condensed.)

The comparison `cp b` sets C when `left_value < hold_value`, meaning the left
element is already smaller than what we are inserting. The `if C` block writes
the held value at the current position and returns. Otherwise, the left element
shifts right and the recursion continues one step leftward.

See `learning/part2/examples/unit2/insertion_sort.zax`.

### Selection sort

Selection sort finds the minimum element of the unsorted suffix on each pass
and exchanges it with the element at the current outer index. The helper
`find_min_index` scans from `start_index` to `last_index` tracking the index
of the smallest value seen.

The break example from `find_min_index` is shown in the `break` section above.
After `find_min_index` returns the minimum index in HL (with the index in L),
the outer loop swaps the minimum into position if it is not already there:

```zax
    find_min_index outer_index, LastIndex
    ld a, l
    min_index := a

    a := min_index
    b := outer_index
    cp b
    if NZ
      swap_values outer_index, min_index
    end

    succ outer_index
```

(From `learning/part2/examples/unit2/selection_sort.zax`, lines 104–115.)

The `if NZ` skips the swap when the minimum is already at `outer_index` (no
work needed). This pattern — compare, then conditionally call a helper inside
an `if` block — appears throughout the course.

See `learning/part2/examples/unit2/selection_sort.zax`.

---

## The Searching Examples

### Linear search

`linear_search.zax` scans `values` from index 0 upward, comparing each element
against `target_value`. The loop exits via early `ret` in two cases: when the
element matches (returning the index), or when the scan exhausts the array
(returning `$FFFF` as a not-found sentinel).

```zax
    l := scan_index
    a := values[L]
    probe_value := a

    a := target_value
    b := probe_value
    cp b
    if Z
      ld h, 0
      a := scan_index
      ld l, a
      ret               ; found: return index in HL
    end

    succ scan_index
```

(From `learning/part2/examples/unit2/linear_search.zax`, lines 28–42.)

When the match is found, the index needs to be in HL (the return register). The
function loads 0 into H and `scan_index` into L, forming a 16-bit index value.
`ld h, 0` is a raw Z80 instruction; `ld l, a` transfers A into L. The result is
then in HL for the `ret`.

See `learning/part2/examples/unit2/linear_search.zax`.

### Binary search

Binary search divides the sorted array in half repeatedly, narrowing the search
range by comparing the target against the middle element.

The midpoint calculation uses the standard Z80 technique for a 16-bit arithmetic
right shift: add `low_index` and `high_index` into HL, then shift right with
`srl h` / `rr l`. This gives `(low + high) / 2` without overflow for values
that fit in 16 bits:

```zax
    hl := low_index
    de := high_index
    add hl, de
    srl h
    rr l              ; HL = (low_index + high_index) / 2
    mid_index := hl
```

(From `learning/part2/examples/unit2/binary_search.zax`, lines 37–42.)

After computing the midpoint, the function reads `values[L]` (using L as the
low byte of `mid_index`) and compares against `target_value`. If C is set
(target is less than probe), the search continues in the left half by setting
`high_index := mid_index - 1` via `pred`. If NC and NZ (target is greater than
probe), it continues in the right half with `succ` on `low_index`. The loop
exits when the search interval closes (`low_index > high_index`), returning
`$FFFF` as not-found.

`pred` and `succ` on `high_index` and `low_index` are the concise way to
narrow the search bounds by one step in either direction.

See `learning/part2/examples/unit2/binary_search.zax`.

### Prime sieve

The sieve of Eratosthenes marks all composite numbers in a flag array. It is
the most algorithmically interesting Chapter 02 example because it has nested loops
and uses both `break` and `continue` — the full loop-control surface.

The outer loop iterates over candidate factors from 2 to `StopFactor`. For each
prime factor, the inner loop marks all multiples of that factor as composite.
`break` exits each loop when its bound is exceeded; `continue` skips the inner
marking pass for factors already known to be composite.

The complete structure is shown across the `break` and `continue` examples
above. Reading `prime_sieve.zax` in full is the best way to see how the two
constructs interact with the nested loop structure.

See `learning/part2/examples/unit2/prime_sieve.zax`.

---

## Summary

- Arrays are declared with exact sizes. There is no hidden padding. A `byte[8]`
  is eight bytes.
- `const` values are compile-time expressions. They can reference other `const`
  names and use arithmetic operators. `const LastIndex = ItemCount - 1` folds
  to a literal at compile time; the subtraction does not appear in the emitted
  code.
- The index inside `[...]` must be a register. Load the index into a register
  before the access. L is the natural choice for 8-bit indexing into `byte[]`
  arrays.
- `break` exits the current loop at the point where the exit condition is
  known. It replaces an explicit flag variable that would otherwise track
  whether the loop should continue. When you use `break`, re-establishing flags
  before `continue` (or at the loop back edge) is your responsibility.
- `continue` skips the remainder of the current iteration and jumps to the
  condition test. It requires that flags be correct for the loop condition at
  the point of the jump. Establishing those flags immediately before `continue`
  is the pattern used in `prime_sieve.zax`.
- `succ` and `pred` work on index locals just as they work on counter locals.
  They appear wherever `low_index`, `high_index`, or `scan_index` needs
  stepping by one.

---

## Examples in This Chapter

- `learning/part2/examples/unit2/bubble_sort.zax` — repeated adjacent-swap passes
- `learning/part2/examples/unit2/insertion_sort.zax` — sorted insertion into a growing prefix
- `learning/part2/examples/unit2/selection_sort.zax` — minimum-selection with `break`-terminated scan
- `learning/part2/examples/unit2/linear_search.zax` — sequential scan with early return
- `learning/part2/examples/unit2/binary_search.zax` — divide-and-conquer with `pred`/`succ` bound narrowing
- `learning/part2/examples/unit2/prime_sieve.zax` — nested loops with `break` and `continue`

---

## What Comes Next

Chapter 03 moves from indexed arrays to pointer-walked memory. The string
algorithms there advance HL and DE directly rather than loading an index into L
— a different traversal approach built on the same `while NZ` loop structure
used here. `break` reappears in the scan-to-terminator pattern; `continue` does
not, because string traversal rarely needs to skip iterations rather than exit.

---

## Exercises

1. In `prime_sieve.zax`, the `continue` before the inner loop requires
   `ld a, 1` / `or a` to re-establish NZ before jumping to the condition test.
   What would happen if those two instructions were removed? Try tracing the
   flag state manually.

2. `linear_search.zax` returns `$FFFF` as the not-found sentinel. The calling
   convention uses HL as the return register. Modify `linear_search` to return
   a `byte` result in L — `$FF` for not-found, 0-based index for found — and
   update `main` accordingly. What changes in the return-register declaration?

3. The bubble sort in `bubble_sort.zax` does not track whether any swaps
   occurred during a pass. A classic optimization is to exit early if a pass
   produces no swaps (the array is already sorted). Add a `swapped` local to
   `bubble_pass` that tracks this, and modify `bubble_sort` to call a function
   that returns whether any swaps happened. Does `break` make the outer loop
   structure cleaner or not?

4. `binary_search.zax` uses `word` locals for `low_index` and `high_index`
   because the midpoint calculation uses 16-bit arithmetic. Could those locals
   be `byte` instead, with the midpoint calculation adjusted? What would change
   in the register usage and arithmetic?

---

[← Foundations](01-foundations.md) | [Part 2](README.md) | [Strings →](03-strings.md)
