[← Functions and the IX Frame](11-functions-and-the-ix-frame.md) | [Part 1](README.md) | [Typed Assignment →](13-typed-assignment.md)

# Chapter 12 — Structured Control Flow

Every loop you have written so far ends with a label you invented, a conditional jump back to it, and the quiet discipline of remembering which flag the jump tests and what instruction last set it. Every branch is a `jp nz, some_label` with the name `some_label` doing all the work of explaining intent. The code is correct, but reading it requires following the labels rather than reading the structure.

This chapter removes that overhead. `if`/`else`, `while`, `repeat...until`, `break`, and `continue` compile to the same conditional jumps and labels you have been writing by hand — the compiler generates the boilerplate, and you write what the code means.

---

## What structured control flow replaces

Chapter 10 ended with two specific annoyances in the raw code.

The first: invented labels everywhere. Every branch needs at least one label.
`find_max` needed `find_max_loop:` and `find_max_no_update:`. `count_above`
needed `count_above_loop:`, `count_above_skip:`. These labels say nothing about
what the code does — they only give jumps somewhere to point.

The second: the double `cp c` in `count_above`. A single `cp` sets carry for
less-than and Z for equal. Strictly-greater-than needs both. So the raw version
ran `cp c` twice — once for the less-than skip, once for the equality skip —
because there was no single way to express the combined condition.

`if` and `while` fix the first problem directly. The double-`cp` stays — that
needs a different comparison strategy — but the structure around it becomes
readable.

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
right locations. You write the intent; the compiler manages the targets.

`else` is optional. `if NC ... end` with no `else` branch is the direct
replacement for the raw pattern:

```zax
; raw
cp c
jr c, skip
  ; body
skip:

; structured
cp c
if NC
  ; body
end
```

Both forms emit the same Z80 instructions. The structured form has no `skip:`
label because the compiler generates it internally.

**Important rule:** `if`/`else`/`end` do not set flags. The condition is always
the state of the flags at the moment `if` is reached. You must establish the
correct flags with a Z80 instruction immediately before `if`, just as you did
before `jr cc` in the raw chapters.

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

`while` is pre-tested: the body only runs if the condition is true on entry.
This works the same as the raw pattern with the branch at the top of the loop:

```zax
; raw pre-tested loop
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
`loop_exit:`, while keeping the entry check. You write one `while NZ` line instead of managing two labels and two jump instructions.

---

## Establishing flags before `while`

`while NZ` does not set flags. It reads them. The flags at the `while` keyword
are exactly whatever instruction last set them.

`ld` instructions on the Z80 do not affect flags — this catches almost everyone at some point. The trap is using `while` immediately after `ld`:

```zax
; WRONG — ld b, 10 does not set flags
ld b, 10
while NZ          ; tests stale flags from whatever ran before
  dec b
  ld a, b
  or a
end
```

The fix is to establish flags explicitly before the loop. To drive a `while NZ`
loop from B, copy B into A and `or a`:

```zax
ld b, 10
ld a, b           ; copy B into A
or a              ; sets Z if A is zero, NZ if non-zero (see Chapter 5)
while NZ
  dec b
  ld a, b
  or a            ; re-establish for the back-edge
end
```

The `or a` pattern for flag-establishment was introduced in Chapter 5 and applied
to loop-entry guards in Chapter 6. The same reasoning applies here. Use
`ld a, b / or a` to convert a register value into a flag state before `while`.

The back edge of a `while` loop is a conditional branch — apply the
flag-before-branch check every time you write one: which instruction last set
the flag? Does anything between that instruction and the back-edge test touch
that flag? Every `continue` or fall-through to the `end` line re-runs the
condition test, so the loop body is responsible for re-establishing the flags on
every such path. If `dec b` is followed by `ld a, b / or a` inside the body,
the back-edge test sees the correct NZ state for the next iteration.

---

## `repeat ... until`: a post-tested loop

`while` is pre-tested: if the condition is false on entry, the body never runs.
Sometimes you need the opposite — the body must always run at least once, and
the condition is only checked at the end. `repeat ... until <cc>` is the
post-tested form.

```zax
repeat
  ; body
until <cc>
```

The body always executes at least once. After the body, the compiler tests the
current flags against `<cc>`. If the condition is true, the loop exits. If
false, the body runs again.

Compare the two forms side by side:

```zax
; while: pre-tested — body may run zero times
ld a, b
or a
while NZ
  ; body
  dec b
  ld a, b
  or a
end

; repeat...until: post-tested — body always runs at least once
repeat
  ; body
  dec b
  ld a, b
  or a
until Z
```

In the `while` form, if B is already zero when the loop is reached, the body
does not execute. In the `repeat...until` form, the body runs once before the
check, so B always decrements at least once.

**Establishing flags before `until`.** `until` reads the flags at the moment
the `until` keyword is reached. The body is responsible for establishing the
correct flags on every path that falls through to `until`. The same rules that
apply to the `while` back edge apply here: `ld` instructions do not set flags,
so use `or a` or a comparison instruction before `until` to be sure the flags
are correct.

**Z80 idiom match.** Many Z80 patterns are naturally post-tested. Reading from
a hardware port until a ready bit clears, processing bytes in a buffer until a
sentinel is found, or running a loop that must execute at least one iteration —
all of these map onto `repeat ... until` more directly than onto `while`.

`break` and `continue` work inside `repeat ... until` the same way they do
inside `while`: `break` exits the loop, and `continue` jumps to the `until`
condition test.

---

## `break` and `continue`

`break` exits the immediately enclosing loop immediately. Control jumps to the
first instruction after the loop's closing `end` (for `while`) or `until` (for
`repeat`).

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

`break` and `continue` target the immediately enclosing loop — the same rule as C.
No labels are needed. In nested loops, `break` always exits the innermost one and
`continue` restarts the innermost one. An outer loop is unaffected until execution
reaches its own condition test or its own `break`.

```zax
ld a, b
or a
while NZ           ; outer loop
  ld a, c
  or a
  while NZ         ; inner loop
    ld a, (hl)
    or a
    if Z
      break        ; exits the inner while only
    end
    inc hl
    dec c
    ld a, c
    or a
  end              ; after break, control resumes here
  dec b
  ld a, b
  or a
end
```

After the inner `break`, control transfers to the instruction after the inner
`end`. The outer `while` continues normally, testing the outer condition on
the next iteration.

---

## Multi-way branching: `select` and `case`

`if`/`else` handles two branches: the condition is true or it is not. When you
need to branch on three or more distinct values, chained `if`/`else` becomes a
ladder of `cp` + conditional jump pairs. `select` is the structured alternative.

`select` takes a register (or other selector value), tests it against a series
of `case` constants, and runs the matching body. If no case matches and an
`else` arm is present, the `else` body runs. After any arm finishes, control
transfers to after the enclosing `end`. There is no fallthrough between cases.

The same logic written in raw Z80, using `cp` + `jp z`:

```zax
; raw: test A against three operator characters
ld a, (op_byte)
cp $2B              ; '+'
jp z, handle_plus
cp $2D              ; '-'
jp z, handle_minus
jp unknown_op
handle_plus:
  ; ...
  jp after_dispatch
handle_minus:
  ; ...
  jp after_dispatch
unknown_op:
  ; ...
after_dispatch:
```

The same logic as a `select`:

```zax
; structured: select on A
ld a, (op_byte)
select A
  case $2B          ; '+'
    ; handle +
  case $2D          ; '-'
    ; handle -
  else
    ; unknown operator
end
```

The `select` form names the intent directly: "dispatch on the value of A."
Each `case` line states the value being tested. The `else` arm handles the
no-match case. No jump targets, no labels.

Three rules from the spec apply here. First, `select` evaluates the selector
once at the `select` keyword. The selector is not re-evaluated for each case.
Second, each `case` must be a compile-time constant or range — runtime
expressions are not allowed. Third, when the selector is `A`, the compiler's
dispatch sequence may modify A and flags, so do not rely on A still holding
the selector value inside a case body. When the selector is any other register,
that register is preserved across dispatch.


---

## Before and after: the same two loops

The example file `learning/part1/examples/10_structured_control.zax` rewrites
`find_max` and `count_above` from Chapter 10 using `while` and `if`. Here are
the two versions side by side.

The inline listings below are adapted from that example file. The shipped file
already uses `:=` and `step` in a few places where the final code is clearer,
but the chapter keeps the raw IX-relative forms in the listings so you can
focus on the control-flow rewrite before Chapter 13 introduces the assignment
surface explicitly.

**`find_max` — raw (Chapter 10):**

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

Labels: `find_max_loop:` (loop top) and `find_max_no_update:` (skip target).
The jump `jr nc, find_max_no_update` is the only thing connecting the test
to the effect — you must trace the label to understand the structure.

**`find_max_cf` — with `while` and `if`:**

```zax
func find_max_cf(tbl: addr, len: byte): AF
  var
    running_max: byte = 0
  end
  ld l, (ix+tbl+0)
  ld h, (ix+tbl+1)
  ld b, (ix+len+0)
  ld a, b
  or a
  while NZ
    ld a, (hl)
    cp (ix+running_max+0)
    if NC
      ld (ix+running_max+0), a
    end
    inc hl
    dec b
    ld a, b
    or a
  end
  ld a, (ix+running_max+0)
end
```

No labels. `while NZ` expresses "loop while B is non-zero." `if NC` expresses
"update if the current byte is not less than the running maximum." The condition
and the consequence are adjacent and visually nested. Every frame access uses
the raw IX-relative form from Chapter 11.

This version uses `dec b` instead of `djnz` because `while` already handles
the branch-back. `djnz` fused decrement-and-branch into one instruction; with
`while`, the branch is already there, so `dec b` alone is enough.

**Flag behavior: `djnz` vs `dec b`.** `djnz` does not affect the Z flag — it
uses its own internal decrement-and-branch without touching the flag register.
`dec b`, by contrast, does set the Z flag (as well as S, H, and P/V). When
using `dec b` to drive a `while NZ` loop, the back-edge needs the
`ld a, b / or a` sequence: `dec b` alone sets Z correctly, but any instruction
between `dec b` and `end` can change the flags before the back-edge test reads
them. The `ld a, b / or a` re-establishes the flag state from B's current
value. `djnz` cannot be directly replaced by `dec b / jr nz` in a `while` loop
without this flag-establishment step.

**`count_above` — raw (Chapter 10):**

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

The push/pop and the double `cp c` are both present. The skip label serves both
jump instructions; you must check both to understand when the counter is
incremented.

**`count_above_cf` — with typed local and `if`:**

```zax
func count_above_cf(tbl: addr, len: byte, threshold: byte): AF
  var
    cnt: byte = 0
  end
  ld l, (ix+tbl+0)
  ld h, (ix+tbl+1)
  ld b, (ix+len+0)
  ld a, b
  or a
  while NZ
    ld a, (hl)
    cp (ix+threshold+0)
    if NC
      cp (ix+threshold+0)
      if NZ
        ld a, (ix+cnt+0)
        inc a
        ld (ix+cnt+0), a
      end
    end
    inc hl
    dec b
    ld a, b
    or a
  end
  ld a, (ix+cnt+0)
end
```

The push/pop is gone (typed local `cnt` carries the count). The double `cp` is
still present — the comparison logic itself has not changed, because "strictly
greater than" still requires two tests — but the outer `if NC / inner if NZ`
nesting makes the structure explicit: "if not-less-than, then if not-equal, then
count it." The skip label is gone.

---

## The example: `learning/part1/examples/10_structured_control.zax`

The example file contains `main`, `find_max_cf`, and `count_above_cf`. It uses
the same table and produces the same results as Chapter 10:
maximum = 91, above-64 count = 3. The only difference is in how the subroutine
bodies are written. The file is the final cleaned-up version, so you will see
`:=` and `step` where the chapter listings above kept the raw IX-relative frame
access to isolate the control-flow changes.

Read both files simultaneously. For each subroutine, compare:

- the number of user-defined labels
- where the loop exit point is expressed
- where the conditional skip is expressed
- where the counter initialization is

In the raw version, each of those requires at least one label and one explicit
jump. In the structured version, each is expressed by the keyword that carries it.

---

## When to use `if`/`while`/`select` vs raw labels

Use structured control flow when the branch or loop has a single entry and a single exit. `if`/`else`/`end` and `while`/`end` each map to exactly that shape — one way in, one way out. The compiler manages the labels; you name only the condition.

Use raw labels and jumps when the control flow does not fit that shape: multiple exit points mid-loop, a branch that jumps into the middle of another block, or an interrupt handler that must jump to a specific address. Some Z80 programs genuinely need them. `jr`, `jp`, and `djnz` are always available alongside the structured keywords.

Both are always available. Use whichever matches the shape of the logic.

---

## Summary

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
- `repeat ... until <cc>` is post-tested: the body always runs at least once.
  The condition is checked at the `until` keyword using the current flags. If
  the condition is true, the loop exits; if false, the body runs again. Use
  `repeat...until` when the body must always execute at least once, or when
  the Z80 idiom is naturally post-tested (polling a port, scanning until a
  sentinel).
- `break` exits the immediately enclosing loop. In nested loops, it exits only
  the innermost one — the same rule as C. Flags do not need to be set before
  `break`.
- `continue` restarts from the condition test of the immediately enclosing loop.
  Flags must be correct for the condition before `continue` executes in a
  `while` loop.
- Structured control flow does not hide the machine. Each `if`/`else`/`end` and
  `while`/`end` generates the same conditional jumps and labels. The compiler manages the labels;
  you manage the flags.

---

## Exercises

**1. The stale-flag trap.** Identify the bug in the following code and explain what flag state `while NZ` actually reads:

```zax
ld b, 10
while NZ
  ; body
  dec b
end
```

Write the corrected version that properly tests whether B is non-zero before entering the loop.

**2. Convert a raw loop.** Rewrite the following raw loop using `while` and `if`, removing the user-defined labels. The behaviour must be identical — same exit condition, same update logic.

```zax
ld b, 8
scan_loop:
  ld a, (hl)
  cp 0
  jr z, found_zero
  inc hl
  djnz scan_loop
  jr scan_done
found_zero:
  ld (zero_addr), hl
scan_done:
```

*(Hint: you will need `or a` before `while` to establish flags from B. Inside the loop, `inc hl` should come before the `dec b` / flag re-establishment for this to be cleanest. Preserve the "store HL when zero is found" behaviour in the `if Z` branch.)*

**3. `break` vs `continue` in nested loops.** In the nested loop below, identify which loop each `break` and `continue` exits or restarts:

```zax
ld a, b
or a
while NZ           ; outer loop (A)
  ld a, c
  or a
  while NZ         ; inner loop (B)
    ld a, (hl)
    or a
    if Z
      break        ; (1) — which loop?
    end
    cp 64
    if NC
      continue     ; (2) — which loop? What flags must be set?
    end
    inc hl
    dec c
    ld a, c
    or a
  end
  dec b
  ld a, b
  or a
end
```

For `continue` (2): what instruction must execute immediately before `continue` to ensure the `while NZ` test fires correctly on the next iteration?

**4. `while` vs `repeat...until`.** Rewrite the following `while` loop as a `repeat...until` loop that produces exactly the same result. Then explain one situation where `repeat...until` would be the *wrong* choice — i.e. a case where the loop body must not execute if the initial count is zero.

```zax
ld a, b
or a
while NZ
  ld a, (hl)
  out ($10), a
  inc hl
  dec b
  ld a, b
  or a
end
```

---

[← Functions and the IX Frame](11-functions-and-the-ix-frame.md) | [Part 1](README.md) | [Typed Assignment →](13-typed-assignment.md)
