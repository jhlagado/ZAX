# Chapter 09 — Structured Control Flow

This chapter introduces `if`/`else`, `while`, `break`, and `continue`. After
reading it you will be able to replace raw flag-test-and-jump sequences with
`if`/`else`, replace manual loop-label structures with `while`, and use `break`
and `continue` to exit or restart a loop without writing explicit jump targets.

Prerequisites: Chapters 00–08 (all Phase A constructs, typed locals, `:=`).

---

## The cost that Phase B is removing

Chapter 07 identified two specific costs of the raw approach.

The first: label scaffolding. Every branch in Phase A requires at least one
label. `find_max` needed `find_max_loop:` and `find_max_no_update:`. `count_above`
needed `count_above_loop:`, `count_above_skip:`. These labels carry no semantic
information about what the code does. They exist because jumps need targets.

The second: the double `cp c` in `count_above`. A single `cp` sets the carry
flag for less-than and the Z flag for equality. Strictly-greater-than requires
both tests. The Phase A implementation ran `cp c` twice in sequence — once for
the less-than skip, once for the equality skip — because there was no single-
instruction way to express the combined condition.

Structured `if` and `while` address the first cost directly. They do not address
the double-`cp` problem (that requires a different comparison strategy), but they
do make the structure around the comparisons readable.

---

## `if`/`else`: flags without labels

`if <cc>` tests the current Z80 flags at the point where `if` appears. If the
condition is true, the body executes; otherwise it is skipped. `else` provides
an alternative body. The block is closed by `end`.

```zax
cp threshold
if NC               ; carry clear means A >= threshold
  ; body when A >= threshold
else
  ; body when A < threshold
end
```

The compiler emits a conditional jump over the first body and an unconditional
jump over the second, along with the hidden labels needed to make them target the
right locations. The programmer writes the intent; the compiler manages the
targets.

`else` is optional. `if NC ... end` with no `else` branch is valid and is the
direct replacement for the Phase A pattern:

```zax
; Phase A
cp c
jr c, skip
  ; body
skip:

; Phase B
cp c
if NC
  ; body
end
```

Both forms emit the same Z80 instructions. The Phase B form has no `skip:` label
because the compiler generates it internally. The label was bookkeeping; `end`
replaces it.

**Important rule:** `if`/`else`/`end` do not set flags. The condition is always
the state of the flags at the moment `if` is reached. You must establish the
correct flags with a Z80 instruction immediately before `if`, just as you did
before `jr cc` in Phase A.

---

## `while`: a pre-tested loop

`while <cc>` tests the current flags on entry. If the condition is false, the
body never executes. After each iteration, the compiler branches back to the
condition test and re-tests. If the condition is now false, the loop exits.

```zax
ld a, b
or a            ; establish NZ: B is non-zero
while NZ
  ; body
  dec b
  ld a, b
  or a          ; re-establish flags for the back-edge test
end
```

`while` is pre-tested: entry is conditional. This is the same semantics as the
Phase A pattern with the branch at the top of the loop:

```zax
; Phase A pre-tested loop
ld a, b
or a
jr z, loop_exit
loop_top:
  ; body
  dec b
  ld a, b
  or a
  jr nz, loop_top
loop_exit:
```

Both forms check the condition before executing the body even once. `while NZ`
replaces the pair `loop_top:` + `jr nz, loop_top` and the exit label
`loop_exit:`, while keeping the entry check. The programmer writes one `while NZ`
line instead of managing two labels and two jump instructions.

---

## Establishing flags before `while`

`while NZ` does not set flags. It reads them. The flags at the `while` keyword
are exactly whatever instruction last set them.

`ld` instructions on the Z80 do not affect flags. This is the most common mistake:

```zax
; WRONG — ld b, 10 does not set flags
ld b, 10
while NZ          ; tests stale flags from whatever ran before
  dec b
  ld a, b
  or a
end
```

The fix is to establish flags explicitly before the loop. The standard idiom for
a loop over B counts is to copy B into A and `or a`:

```zax
ld b, 10
ld a, b           ; copy B into A
or a              ; sets Z if A is zero, NZ if non-zero (see Chapter 03)
while NZ
  dec b
  ld a, b
  or a            ; re-establish for the back-edge
end
```

The `or a` idiom for flag-establishment was introduced in Chapter 03 and applied
to loop-entry guards in Chapter 04. The same reasoning applies here. Use
`ld a, b / or a` to convert a register value into a flag state before `while`.

The back edge of a `while` loop also tests the condition. Every `continue` or
fall-through to the `end` line re-runs the condition test. That means the loop
body is responsible for re-establishing the flags on every path that does not
exit via `break` or `ret`. If `dec b` is followed by `ld a, b / or a` inside the
body, then the back-edge test sees the correct NZ state for the next iteration.

---

## `break` and `continue`

`break` exits the immediately enclosing loop immediately. Control jumps to the
first instruction after the loop's `end`.

`continue` transfers control to the condition test at the top of the loop, re-
testing `<cc>` with the current flags. For `while`, that means the flags must
be correct for the condition before `continue` executes.

```zax
ld a, b
or a
while NZ
  ld a, (hl)
  or a
  if Z
    break         ; stop as soon as a zero byte is found
  end
  cp 64
  if NC           ; byte >= 64: skip processing, move to next
    inc hl
    dec b
    ld a, b
    or a          ; re-establish flags before continue re-tests while NZ
    continue
  end
  ; ... process byte at HL ...
  inc hl
  dec b
  ld a, b
  or a
end
```

`break` does not need to re-establish flags — it exits the loop entirely. But
`continue` does: because `continue` jumps back to the `while NZ` condition test,
the flags must correctly represent the intended condition at the moment
`continue` executes.

`break` and `continue` only affect the immediately enclosing loop. If you have
nested `while` loops, `break` exits the inner one. There is no labeled-loop form
in the current language.

---

## Phase A vs Phase B: the same two loops

The example file `examples/intro/09_structured_control.zax` rewrites
`find_max` and `count_above` from Chapter 07 using `while` and `if`. Here are
the two versions side by side.

**`find_max` — Phase A:**

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
  ret
end
```

Labels: `find_max_loop:` (loop top) and `find_max_no_update:` (skip target).
The jump `jr nc, find_max_no_update` is the only thing connecting the test
to the effect — a reader must trace the label to understand the structure.

**`find_max_cf` — Phase B:**

```zax
func find_max_cf(): AF
  var
    running_max: byte = 0
  end
  ld a, b
  or a
  while NZ
    ld a, (hl)
    cp running_max
    if NC
      running_max := a
    end
    inc hl
    dec b
    ld a, b
    or a
  end
  a := running_max
  ret
end
```

No labels. `while NZ` expresses "loop while B is non-zero." `if NC` expresses
"update if the current byte is not less than the running maximum." The condition
and the consequence are adjacent and visually nested.

The Phase B version uses `dec b` instead of `djnz` because the `while` loop
already handles the branch-back. `djnz` was the Phase A idiom for "decrement B
and loop." With `while`, the explicit loop structure is already present; `dec b`
alone is enough.

**Flag behavior: `djnz` vs `dec b`.** `djnz` does not affect the Z flag — it
uses its own internal decrement-and-branch without touching the flag register.
`dec b`, by contrast, does set the Z flag (as well as S, H, and P/V). When
using `dec b` to drive a `while NZ` loop, the `dec b / ld a, b / or a`
back-edge sequence is needed because `or a` re-establishes the Z flag from the
current value of A (which was just loaded from B). This extra step is required
because `dec b` alone sets Z correctly, but the back-edge test in the `while`
loop reads the flags at the `end` line, and any instruction between `dec b` and
`end` may have changed them. The `ld a, b / or a` sequence ensures the final
flag state before the back-edge test reflects B's value, not whatever a previous
instruction left in the flags. Phase A-aware readers will notice that `djnz`
cannot be directly replaced by `dec b / jr nz` in a `while` loop without this
extra flag-establishment step.

**`count_above` — Phase A:**

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
  ret
end
```

The push/pop and the double `cp c` are both present. The skip label serves both
jump instructions; a reader must check both to understand when the counter is
incremented.

**`count_above_cf` — Phase B:**

```zax
func count_above_cf(): AF
  var
    cnt: byte = 0
  end
  ld a, b
  or a
  while NZ
    ld a, (hl)
    cp c
    if NC
      cp c
      if NZ
        succ cnt
      end
    end
    inc hl
    dec b
    ld a, b
    or a
  end
  a := cnt
  ret
end
```

The push/pop is gone (typed local `cnt` carries the count). The double `cp c` is
still present — the comparison logic itself has not changed, because "strictly
greater than" still requires two tests — but the outer `if NC / inner if NZ`
nesting makes the structure explicit: "if not-less-than, then if not-equal, then
count it." The skip label is gone.

---

## The example: `examples/intro/09_structured_control.zax`

The example file contains `main`, `find_max_cf`, and `count_above_cf`. It uses
the same table and produces the same results as `07_phase_a_capstone.zax`:
maximum = 91, above-64 count = 3. The only difference is in how the subroutine
bodies are written.

Read both files simultaneously. For each subroutine, compare:

- the number of user-defined labels
- where the loop exit point is expressed
- where the conditional skip is expressed
- where the counter initialization is

In Phase A each of those concerns requires at least one label and one explicit
jump instruction. In Phase B each is expressed by the structured keyword that
carries it.

---

## What This Chapter Teaches

- `if <cc> ... end` tests the current flags at `if`. If the condition is true,
  the body executes. `else` provides an alternative body. No user labels are
  needed.
- `while <cc> ... end` is pre-tested: the body runs zero or more times depending
  on the flag state at entry. The back edge re-tests the same condition after
  each iteration.
- `while` does not set flags. Flags must be established by a Z80 instruction
  immediately before `while`. Use `ld a, b / or a` to convert a register value
  into a flag state before a `while NZ` loop.
- The body of a `while` loop is responsible for re-establishing the flags before
  each back-edge test. Any path that reaches `end` without a `break` or `ret`
  will re-test the condition with the current flags.
- `break` exits the immediately enclosing loop. Flags do not need to be set
  before `break`.
- `continue` restarts from the condition test. Flags must be correct for the
  condition before `continue` executes in a `while` loop.
- Structured control flow does not hide the machine. Each `if`/`else`/`end` and
  `while`/`end` lowers to the same conditional jumps and labels that Phase A
  programs use. The compiler manages the labels; the programmer manages the flags.

## What Comes Next

Chapter 10 introduces function arguments in the ZAX style and the `op`
construct. The reader will see how typed parameters remove the register-passing
conventions that Phase A programs document in comments, and how `op` provides
a lightweight named-operation form that expands inline without a function frame.
