# Chapter 04 — Bit Patterns

The unit 4 examples stay close to the machine. Bit manipulation is an area where
the Z80's instruction set is both expressive and directly visible in code: `srl`,
`rr`, `and`, `or`, `xor`, `bit` — these are Z80 mnemonics, and they appear in ZAX
source files without ceremony. What ZAX adds is the surrounding structure: typed
locals that carry the algorithm's state between steps, `if` blocks that branch on
specific bit tests, and the same `while NZ` loop idiom used throughout the course.

The four unit 4 examples are small in code size but dense in algorithm content.
Each one is essentially a single loop that shifts through a byte, testing or
transforming one bit per iteration. Reading them requires understanding what each
Z80 instruction does to the flags and to the registers — the prose here focuses on
the algorithmic structure that those instructions serve.

---

## Counting and Testing Bits

### `popcount.zax`

Population count — counting the set bits in a value — is the canonical bit-loop
example. The algorithm is direct: check the low bit, increment a counter if set,
shift the value right, repeat until nothing remains.

`popcount_demo` in `popcount.zax` holds the working value in a byte local
`working_value` and the count in `count_value`. Each iteration uses `and 1` to
test whether the low bit is set, increments the count via `succ count_value` if
it is, and then shifts right using `srl a`:

```zax
    a := working_value
    and 1
    if NZ
      succ count_value
    end

    a := working_value
    srl a
    working_value := a
```

(From `examples/course/unit4/popcount.zax`, lines 24–32.)

The `srl a` instruction performs a logical right shift of A, shifting in a zero
from the high end and pushing the low bit into the carry. After eight iterations,
`working_value` is zero and the loop exits via the sentinel test at the top.

See `examples/course/unit4/popcount.zax`.

### `parity.zax`

Parity is closely related to population count: it is the low bit of the count.
Rather than counting bits, `parity_demo` maintains a toggle variable that flips
on each set bit. The toggle uses `xor 1` to invert the low bit of `parity_value`:

```zax
    a := working_value
    and 1
    if NZ
      a := parity_value
      xor 1
      parity_value := a
    end

    a := working_value
    srl a
    working_value := a
```

(From `examples/course/unit4/parity.zax`, lines 24–34.)

The `xor 1` flips the low bit of A (which holds `parity_value`) each time a set
bit is encountered. This is the classic XOR-toggle idiom: repeated XOR with 1
alternates between 0 and 1. When the loop ends, `parity_value` is 1 if an odd
number of bits were set, 0 if even — odd parity as a single-bit result.

The loop structure in `parity.zax` is nearly identical to `popcount.zax`. Both
examples share the same shift-and-test skeleton; what differs is the action taken
when a set bit is found.

See `examples/course/unit4/parity.zax`.

---

## Bit Reversal

### `bit_reverse.zax`

Bit reversal mirrors the bit order of a byte: bit 7 becomes bit 0, bit 6 becomes
bit 1, and so on. The algorithm feeds bits from the source into the result one at
a time, building the reversed byte in the opposite order.

`bit_reverse.zax` defines a local `op` named `append_low_bit` that encapsulates
the append step:

```zax
op append_low_bit(reversed_reg: A, source_reg: B)
  add a, a        ; shift result left, making room for the new bit
  bit 0, b        ; test bit 0 of the source
  if NZ
    or 1          ; set bit 0 of result
  end
end
```

(From `examples/course/unit4/bit_reverse.zax`, lines 6–12.)

`add a, a` doubles A, which is identical to a left shift by one position. `bit 0,
b` tests bit 0 of B using the Z80 `BIT` instruction, which sets Z if the bit is
clear and NZ if it is set. The `if NZ` / `or 1` sequence then conditionally sets
the low bit of the result.

The outer loop loads `reversed_value` into A and `source_value` into B, calls
the op, writes back, then shifts `source_value` right by one with `srl a`. This
repeats for eight iterations counted by `bit_count`, decremented with `pred
bit_count` at each step.

The `op` form here is natural: `append_low_bit` takes two specific registers as
operands, and the compiler checks that the call sites provide the right register
bindings. The body is short enough that calling overhead would dominate if it
were a full `func`.

See `examples/course/unit4/bit_reverse.zax`.

---

## Field Extraction

### `getbits.zax`

Field extraction retrieves a contiguous group of bits from a byte, specified by
a starting bit offset and a width. The algorithm has two phases: first shift the
value right by `offset` positions to align the target field to the low end, then
extract `width` bits from that aligned value.

`getbits_demo` in `getbits.zax` performs the right-shift phase in the first
`while NZ` loop, decrementing `offset_value` via `pred offset_value` and shifting
`working_value` right with `srl a` on each iteration:

```zax
  while NZ
    a := offset_value
    or a
    if Z
      ld a, 0
      or a
    end
    if NZ
      a := working_value
      srl a
      working_value := a
      pred offset_value
      ld a, 1
      or a
    end
  end
```

(From `examples/course/unit4/getbits.zax`, lines 16–34, condensed.)

The second `while NZ` loop extracts `width` bits using a growing bit mask. On
each iteration, `bit_mask` doubles via `add a, a` (the same left-shift idiom from
`bit_reverse.zax`), and the corresponding bit is ORed into `result_value`:

```zax
    a := working_value
    and 1
    if NZ
      a := result_value
      b := bit_mask
      or b
      result_value := a
    end

    a := working_value
    srl a
    working_value := a

    a := bit_mask
    add a, a
    bit_mask := a

    pred width_value
```

(From `examples/course/unit4/getbits.zax`, lines 46–65.)

The `bit_mask` starts at 1 and doubles each iteration — it tracks which bit
position in the result the current source bit maps to. After `width` iterations,
`result_value` holds the extracted field.

See `examples/course/unit4/getbits.zax`.

---

## Patterns Common to All Four Examples

Looking across the unit 4 examples, several ZAX patterns recur:

**The shift-and-test skeleton.** Every example loops over a fixed number of bit
positions, shifting a working value right by one at each step and acting on the
low bit. The loop body is a few instructions around `srl a`, `and 1`, and a
conditional action.

**The `while NZ` idiom with a counter.** Counting loops in unit 4 use `while NZ`
with a byte counter decremented by `pred`. The loop exits when the counter reaches
zero — the `or a` on the counter value sets Z, which terminates the loop. This
is the same counter-driven `while NZ` pattern introduced in unit 1.

**Local `op` for a recurring register step.** Both `bit_reverse.zax` and
`strcpy.zax` (unit 3) define local `op` definitions for a recurring two-or-three
instruction sequence that operates on named registers. The `op` form is the right
tool when a small sequence has a clear input/output register contract and appears
in a tight loop.

**Typed locals as algorithm state, raw Z80 for the bit work.** In every unit 4
example, the algorithmic state — the working value, the counter, the accumulating
result — lives in typed byte locals in the `var` block. The actual bit operations
(`srl`, `and`, `xor`, `bit`, `or`) operate on A and B directly. The `:=`
assignments move values between the typed locals and the register file as needed.
This boundary between typed storage and raw instruction work is the central ZAX
idiom, and unit 4 shows it at its most concentrated.

---

## What This Unit Teaches About ZAX

- Bit algorithms are expressed using Z80 bit-manipulation instructions directly:
  `srl`, `rr`, `and`, `or`, `xor`, `bit`. ZAX provides no higher-level bitwise
  abstractions. The instructions appear as mnemonics.
- The `while NZ` idiom with `pred` decrement works for counting loops just as
  well as for sentinel loops. When the counter hits zero, `or a` sets Z and the
  loop exits.
- A local `op` captures a recurring register-level pattern without function call
  overhead. The compiler verifies that the operand register bindings at call sites
  match the op's parameter declarations.
- Typed byte locals hold algorithm state between loop iterations. Raw Z80 work
  happens in registers. The `:=` operator shuttles values between them.

---

## Examples in This Unit

- `examples/course/unit4/popcount.zax` — count set bits by shift and test
- `examples/course/unit4/parity.zax` — XOR-toggle odd parity
- `examples/course/unit4/bit_reverse.zax` — bit order reversal with a local `op`
- `examples/course/unit4/getbits.zax` — two-phase bit-field extraction

---

## What comes next

Chapter 05 introduces typed aggregate state: records and arrays of records.
The byte and word scalars that have carried algorithm state throughout the
course are grouped into named types with automatic offset computation. The
ring buffer example applies the same modular-index discipline used in the
counter-driven loops here, now over a struct array rather than a scalar.

---

## Exercises

1. `popcount.zax` exits the loop when `working_value` reaches zero. This is
   efficient for sparse values (few set bits) but not for values with many set
   bits. Could you write a version that always runs exactly eight iterations using
   `pred bit_count` as the loop counter? Compare code size.

2. In `parity.zax`, `xor 1` is used to toggle `parity_value`. The Z80 has a `CPL`
   instruction that inverts all bits of A. Could `CPL` be used instead of `xor 1`?
   What are the differences in what each produces?

3. `bit_reverse.zax` uses a local `op` named `append_low_bit`. Rewrite the loop
   body to inline the op — remove the `op` definition and write the three
   instructions directly in the loop. Does the resulting code feel more or less
   readable? What does the op definition buy you?

4. `getbits.zax` uses two separate `while NZ` loops for the two phases. Could both
   phases be combined into one loop? What invariant would the combined loop need
   to maintain?
