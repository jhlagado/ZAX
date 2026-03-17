# Chapter 03 — Strings

The unit 3 examples shift the focus from indexed arrays to pointer-walked memory.
A null-terminated string is just a sequence of bytes with a zero at the end. That
simple convention drives everything in this chapter: every algorithm either walks
until it finds the zero, or copies until it copies the zero.

What changes compared to unit 2 is the register discipline. In unit 2, the index
lived in a typed local and the array base was a fixed symbol; you loaded the index
into L or B and did a single array access. In unit 3, the current position lives
in HL or DE directly — the pointer is the thing that advances. Typed storage paths
appear where they help (buffering a character into a local, storing the running
total of a conversion), but the traversal itself is raw Z80 pointer work: `ld a,
(hl)`, `inc hl`, `ld (de), a`, `inc de`.

---

## The Null-Terminator Loop

The fundamental string idiom in ZAX is the `while NZ` sentinel loop. You load the
address of the string into HL, test the byte at that address, and loop as long as
the byte is non-zero:

```zax
  ld a, (hl)
  or a
  if Z
    ; null terminator reached
    ret
  end
  inc hl
```

The `or a` instruction ORs A with itself — it has no effect on A but sets or clears
the Z flag depending on whether A is zero. `if Z` then handles the terminator.
This is the standard Z80 idiom for testing a byte against zero without disturbing
its value (unlike `cp 0`, which also sets Z but incurs a second immediate operand).
You will see this pattern in every unit 3 example.

The loop structure is the `while NZ` idiom from unit 1, established by `ld a, 1` /
`or a` at entry and re-established at the bottom of each iteration. The actual loop
exit happens via an early `ret` or `break` inside the body when the terminator is
found.

### `strlen.zax`

`strlen_demo` in `strlen.zax` counts bytes from a fixed string until it reaches
the zero terminator. HL holds the current address. The count lives in a typed word
local `count_value`, which cannot be incremented in place directly through a
16-bit register — the example loads it into DE, increments DE, and stores back:

```zax
  de := count_value
  inc de
  count_value := de
```

This is a recognisable friction point documented in the roadmap: there is no
direct `succ`-style increment for a `word` local through a 16-bit path without
routing through a register pair. The `de := count_value` / `inc de` /
`count_value := de` sequence is the current idiom.

See `examples/course/unit3/strlen.zax`.

---

## Copying and Concatenating

When copying a string, two pointers advance together: HL for the source and DE
for the destination. The natural factoring for this is a local `op` that does the
read-write-advance pair atomically.

### `strcpy.zax`

`strcpy.zax` defines a local `op` named `copy_and_advance` that takes HL and DE
as typed register parameters:

```zax
op copy_and_advance(src_ptr: HL, dst_ptr: DE)
  ld a, (hl)
  ld (de), a
  inc hl
  inc de
end
```

After the copy, A holds the byte that was just written. The loop tests `or a`
immediately after the op call — if A is zero, the terminator was just copied and
the copy is complete. This is a tight and readable way to write the copy-including-
terminator loop: copy first, then check what was copied.

The `op` definition here is a local helper, not a shared library function. The
pointer-advance pattern recurs across most unit 3 examples; the roadmap notes it
as a candidate for a shared helper op once the full recurrence is measured.

See `examples/course/unit3/strcpy.zax`.

### `strcat.zax`

`strcat_demo` in `strcat.zax` appends one string to another in two phases. In the
first phase, HL scans the destination string to find its terminator — that position
is where the suffix will be written. The first `while NZ` loop uses `break` to
exit when the terminator is found:

```zax
  while NZ
    ld a, (hl)
    or a
    if Z
      break
    end
    inc hl
    ld a, 1
    or a
  end
```

After `break`, HL points at the zero byte of the destination string. The second
loop then copies the suffix string from DE into that position, character by
character, terminator included. The `break` here is the cleanest way to stop a
scan-to-terminator loop without a special exit flag: the exit condition is
precisely when the zero is found, and `break` expresses that directly.

See `examples/course/unit3/strcat.zax`.

---

## Comparing and Reversing

### `strcmp.zax`

`strcmp_demo` in `strcmp.zax` performs a lexicographic comparison of two strings
by walking both HL and DE simultaneously, comparing one character at a time.
The comparison has three outcomes: left is less (`$FFFF`), strings are equal (`0`),
or left is greater (`1`). Each iteration reads one character from each string,
compares with `cp b`, and takes an early `ret` on any inequality:

```zax
    a := left_char
    b := right_char
    cp b
    if C
      ld hl, $FFFF
      ret
    end
    if NC
      if NZ
        ld hl, 1
        ret
      end
    end

    a := left_char
    or a
    if Z
      ld hl, 0
      ret
    end
    inc hl
    inc de
```

(From `examples/course/unit3/strcmp.zax`, lines 28–51.)

There is a subtlety in the order of checks. The comparison `cp b` happens before
the null test: this means if both characters are zero (both strings ended at the
same point), the `if NC` / `if NZ` block does not fire (because CP sets Z when
they are equal), and control falls through to the `or a` / `if Z` null check,
which returns 0 (equal). If one character is non-zero and the other is zero, the
CP fires first, correctly returning the inequality result.

See `examples/course/unit3/strcmp.zax`.

### `str_reverse.zax`

`str_reverse_demo` reverses a string in place using inward-moving left and right
pointers. The first pass scans DE forward to find the last character position
(the byte before the terminator). The second pass swaps characters at HL and DE,
then advances HL forward and retreats DE backward, stopping when HL >= DE.

The pointer comparison in the second loop uses `xor a` / `sbc hl, de` to compute
HL - DE, then tests NC to detect when the left pointer has caught up to or passed
the right pointer. This is the standard Z80 idiom for a signed 16-bit comparison:
clear carry with `xor a`, subtract with `sbc hl, de`, and branch on the carry or
no-carry result.

See `examples/course/unit3/str_reverse.zax`.

---

## Character Arithmetic: `atoi` and `itoa`

The conversion examples are where character arithmetic appears. A decimal digit
character occupies the ASCII range `'0'` through `'9'` — values `$30` through
`$39`. The digit value is recovered by subtracting `'0'`, and a digit is produced
by adding `'0'`. This is raw Z80 arithmetic applied to byte values; ZAX requires
no special syntax for it.

### `atoi.zax`

`atoi_demo` converts a decimal string to a word by accumulating a running total.
For each digit character, subtract `'0'` to get the numeric value, multiply the
running total by 10, then add the new digit. The multiply-by-ten is factored into
a local helper `times_ten` that uses the shift-and-add identity `10x = 2(4x + x)`:

```zax
func times_ten(value_word: word): HL
  push de
  hl := value_word
  ld d, h
  ld e, l
  add hl, hl    ; HL = 2x
  add hl, hl    ; HL = 4x
  add hl, de    ; HL = 5x
  add hl, hl    ; HL = 10x
  pop de
end
```

(From `examples/course/unit3/atoi.zax`, lines 10–20.)

The scan pointer advances through `succ scan_ptr` rather than `inc hl` because the
pointer is kept in a typed local (`scan_ptr: word`) rather than held continuously
in HL. The loop reloads `scan_ptr` into HL at the start of each iteration. This
is a natural tradeoff: keeping the pointer in a typed local lets the function call
`times_ten` and `succ` without worrying about HL being clobbered by the call.

See `examples/course/unit3/atoi.zax`.

### `itoa.zax`

`itoa_demo` inverts the process: it extracts digits from a word value by dividing
repeatedly by 10. Because division produces least-significant digits first, the
digits accumulate into a scratch buffer in reverse order. A second pass then
copies them into the output buffer in forward order.

The division uses the `div_u16` helper — the same repeated-subtraction routine
that appears in the unit 1 arithmetic examples — and `times_ten` is used again to
recover the digit: the remainder from `remaining - quotient * 10` gives the raw
digit value. Adding `'0'` converts it to an ASCII character.

The reversal pass uses `pred write_index` to walk backward through the scratch
buffer and `succ read_index` to fill the output buffer forward. These `pred` and
`succ` calls work on typed byte locals in the `var` block.

See `examples/course/unit3/itoa.zax`.

---

## What This Unit Teaches About ZAX

- The null-terminator loop — `ld a, (hl)` / `or a` / `if Z` — is the fundamental
  string traversal idiom. You will use it in every string-processing function.
- Pointer traversal in ZAX is raw Z80: `ld a, (hl)`, `inc hl`, `ld (de), a`,
  `inc de`. ZAX does not abstract over pointer advance; typed storage paths appear
  where they add clarity, not where the traversal is inherently register-level.
- `break` is the clean exit from a scan-to-terminator loop when the exit condition
  is exactly "found the zero." `strcat.zax` shows the natural shape: loop body
  reads and tests, `break` exits when the condition is met.
- Character arithmetic is ordinary Z80 arithmetic on byte values. `sub '0'`
  extracts a digit value; `add a, '0'` produces an ASCII digit character.
- A local `op` can capture a repeated register pattern (as in `copy_and_advance`)
  without the overhead of a function call and frame.

---

## Examples in This Unit

- `examples/course/unit3/strlen.zax` — byte count to null terminator
- `examples/course/unit3/strcpy.zax` — copy with a local `op` for advance
- `examples/course/unit3/strcmp.zax` — dual-pointer lexicographic comparison
- `examples/course/unit3/strcat.zax` — scan to end, then copy suffix
- `examples/course/unit3/str_reverse.zax` — in-place reversal with converging pointers
- `examples/course/unit3/atoi.zax` — decimal string to word
- `examples/course/unit3/itoa.zax` — word to decimal string, via reversed digits

---

## Exercises

1. `strlen.zax` increments `count_value` by loading into DE, incrementing DE, and
   storing back. Could the count be tracked directly in a byte register across
   iterations without a typed local at all? What would you give up?

2. In `strcpy.zax`, the loop copies the terminator and then immediately tests `or a`
   on the just-copied zero. Could the test happen before the copy instead? What
   would change about when HL and DE are advanced?

3. `strcmp.zax` returns `$FFFF` for "left is less". The calling convention uses HL
   as the return register. If the caller needs to distinguish all three outcomes
   (less, equal, greater), how does it extract the result reliably from HL?

4. `atoi.zax` does not validate that each character is actually in the `'0'`–`'9'`
   range before subtracting `'0'`. Add a bounds check and decide what the function
   should return on invalid input. Does this change the loop structure?
