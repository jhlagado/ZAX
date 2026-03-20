[← A Complete Program](08-a-phase-a-program.md) | [Part 2](README.md) | [Structured Control Flow →](10-structured-control-flow.md)

# Chapter 09 — Typed Storage and Assignment

This chapter introduces typed local variables and the `:=` assignment operator.
After reading it you will be able to declare a typed local inside a function,
read and write it with `:=`, use `succ` and `pred` to increment or decrement it,
and explain what the compiler does differently from a raw `ld` instruction.

Prerequisites: Chapters 00–07 (especially Chapter 08, which names the specific
problems that typed variables address).

---

## What typed storage is

A typed local is a named variable declared inside a `var` block at the top of a
function. It has a declared type (`byte`, `word`, or `addr`), and the compiler
allocates a slot for it in the function's stack frame. The variable is referred
to by name throughout the function body. No register is permanently assigned to
hold its value.

In raw Z80, a value that needs to persist across loop iterations has to live in
a register — B for a loop counter, D for a running count, and so on. You choose
the register. When two values need to persist at the same time, two registers
have to be reserved, and any function that modifies those registers has to save
and restore them with `push` and `pop`. Chapter 08 showed this in `count_above`:
the `push bc / ld d, 0 / pop bc` block existed only because D needed to be
initialized without disturbing B and C. The save and restore carried no logical
meaning — it was just register traffic management.

Typed locals remove that problem. You name the value; the compiler decides
where to put it.

---

## Declaring a typed local

A `var` block appears at the start of a function body, before any instructions,
and is terminated by its own `end`:

```zax
func example(): void
  var
    count: byte = 0
    total: word = 0
  end
  ; instructions follow
end
```

`count: byte = 0` declares a one-byte local named `count`, initialized to zero.
`total: word = 0` declares a two-byte local named `total`, initialized to zero.
Both are allocated as 16-bit slots in the block of stack memory ZAX reserves
for the function's local variables.

A local initialized to zero does not need the `= 0` clause — uninitialized
scalar locals start at zero by default — but writing it explicitly states the
intent.

Only scalar types are valid in `var` blocks: `byte`, `word`, `addr`, and `ptr`.
Arrays and records can appear as aliases but do not get stack slots of their own.
This chapter uses only `byte` and `word` locals.

---

## `:=` as the assignment surface

`:=` is the typed assignment operator. It reads a value from the right-hand side
and stores it into the left-hand side. Both sides must be readable storage
expressions — registers or named typed storage:

```zax
count := a      ; store A into the typed local 'count'
a := count      ; load the value of 'count' into A
hl := total     ; load the 16-bit value of 'total' into HL
total := hl     ; store HL into 'total'
```

The direction is left-to-right: the destination is on the left, the source on
the right — the same direction as `ld destination, source`.

`:=` is not just another spelling of `ld`. `ld` is a raw Z80 instruction: you
choose the operand form and the assembler encodes it exactly as written. `:=`
is a typed assignment: the compiler checks that the left side is writable
storage, checks that the right side is a compatible value, and emits whatever
instruction sequence is needed to make the transfer happen correctly.

For word-sized stack variables, this is not a single instruction on the Z80.
Stack locals are addressed through `(IX±offset)`, and the Z80 does not allow
`ld h, (ix+d)` or `ld l, (ix+d)`. So the compiler uses DE as an intermediate
register and wraps the load in `ex de, hl`. When you write `hl := count`, the
compiler emits:

```asm
ex de, hl
ld e, (ix-2)
ld d, (ix-1)
ex de, hl
```

That sequence is correct, preserves all other registers, and is entirely
compiler-managed. You do not write it; you write `hl := count`.

---

## Bare-name access vs address dereference

Chapter 02 established the bare-name rule: the bare form means "the typed value
at this location" and `(name)` means "memory at this address." With typed
locals, the bare form is the only form used for `:=`. Typed locals live at
IX-relative offsets, not at fixed absolute addresses; the dereference form
`(count)` would mean "memory at the address value stored in the count slot,"
which is not the same thing. Use bare names with `:=` for all reads and writes
of typed locals.

---

## `succ` and `pred`

`succ path` increments a typed scalar storage location in place.
`pred path` decrements a typed scalar storage location in place.

```zax
succ count      ; count := count + 1
pred count      ; count := count - 1
```

The compiler lowers each to the appropriate Z80 increment or decrement
instruction sequence. Neither statement returns a value or sets flags in a
guaranteed way — they are pure side-effecting mutations of the named location.

`succ` and `pred` are the right tool when a typed local is used as a counter
and the update is always by exactly one. They are shorter to write than
`a := count / inc a / count := a` and communicate the intent directly: this
location is being counted up or counted down.

Do not use `succ` on a `byte` local that holds `$FF` and expect the result to be
`$00` safely — there is no wrap-around guarantee. The programmer is responsible
for range discipline.

---

## Before and after: the same two loops

The Chapter 08 program — finding the maximum value and counting entries above a
threshold — shows the difference clearly. Here are both versions side by side.

**Without typed variables (`08_phase_a_capstone.zax`):**

```zax
func find_max(): AF
  ld a, 0                        ; A = running maximum (lives in A throughout)
find_max_loop:
  ld c, (hl)                     ; C = current table byte (C is a temporary)
  cp c                           ; compare A with C
  jr nc, find_max_no_update
  ld a, c                        ; new maximum: update A
find_max_no_update:
  inc hl
  djnz find_max_loop
end
```

The running maximum lives in A throughout. A temporary register C holds each
table byte. Neither name says what the value means — `a` and `c` are just
whatever registers were free.

**With typed variables (`09_typed_storage.zax`):**

```zax
func find_max_b(): AF
  var
    running_max: byte = 0
  end
find_max_loop:
  ld a, (hl)
  cp running_max
  jr c, find_max_no_update
  running_max := a               ; A >= running_max: update
find_max_no_update:
  inc hl
  djnz find_max_loop
  a := running_max               ; load result for caller
end
```

`running_max` is a named variable. Its name says what it holds. The compiler
places it on the stack; you do not choose a register. The `a := running_max` at
the end makes explicit what the raw version left implicit: the result has to be
in A before returning.

**Without typed variables (`08_phase_a_capstone.zax`):**

```zax
func count_above(): AF
  push bc                        ; save B and C
  ld d, 0                        ; D = counter (must be initialized here)
  pop bc                         ; restore B and C
count_above_loop:
  ld a, (hl)
  cp c
  jr c, count_above_skip
  cp c                           ; compare again to check equality
  jr z, count_above_skip
  inc d                          ; D = running count
count_above_skip:
  inc hl
  djnz count_above_loop
  ld a, d
end
```

The `push bc / ld d, 0 / pop bc` block has nothing to do with the algorithm.
D must be zero before the loop, but B and C already hold inputs. The push/pop
saves them temporarily so D can be set. It is there because there are no named
variables — just registers that have to be juggled.

**With typed variables (`09_typed_storage.zax`):**

```zax
func count_above_b(): AF
  var
    cnt: byte = 0
  end
count_above_loop:
  ld a, (hl)
  cp c
  jr c, count_above_skip
  jr z, count_above_skip
  succ cnt                       ; cnt := cnt + 1
count_above_skip:
  inc hl
  djnz count_above_loop
  a := cnt
end
```

`cnt` is a named typed local initialized to zero. No register needed. No
push/pop. `succ cnt` increments it. `a := cnt` loads the result for the caller.
The push/pop block is gone because `cnt` does not occupy a register that carries
an input.

---

## The example: `learning/part1/examples/09_typed_storage.zax`

The example file rewrites the two subroutines above and calls them from the same
`main` as Chapter 08. The data and expected results are identical — the table
`{ 23, 47, 91, 5, 67, 12, 88, 34 }` produces a maximum of 91 and a count of 3
entries above 64 — so you can compare the two directly.

Notice what stays the same:

- The `djnz` loop structure is kept. DJNZ is still the right counted-loop
  primitive for a table of known length.
- The `cp c` instruction for comparison is kept. `:=` covers assignment; it does
  not replace flag-setting arithmetic instructions.
- The `ld a, (hl)` inside the loop body is kept. Reading through a raw pointer
  into a register is still written as raw Z80.

Typed variables add names to values that need to persist. They do not change
how arithmetic and pointer manipulation work.

**Raw Z80 instructions can use typed local names directly.** In the typed
version, `cp running_max` uses the typed local name as an operand to a raw Z80
instruction — not a `:=` assignment. The compiler recognises typed local names
in raw instruction operand positions and translates them to the correct
`(IX±d)` addressing form. Writing `cp running_max` emits `cp (ix-N)` where N
is the offset of `running_max` in the stack frame. This is different from
`a := running_max` (which generates a register load sequence), but both refer
to the same stored value.

---

## Summary

- A `var` block inside a function declares typed locals. The compiler puts them
  on the stack and tracks the offsets; you use their names.
- `:=` assigns a value from the right side to the left side. The compiler checks
  that the types are compatible and generates whatever Z80 sequence is needed.
- `:=` is not `ld`. For word-sized stack variables, the compiler emits a
  multi-instruction sequence using DE as an intermediate. You write one line;
  the compiler figures out the rest.
- Bare names refer to the typed value. Do not use `(name)` for typed locals —
  that would mean "memory at the address stored in the slot," which is different.
- `succ path` increments a typed scalar in place. `pred path` decrements it.
  Neither returns a value or guarantees flag state.
- The push/pop from Chapter 08's `count_above` disappears because `cnt` is a
  named variable that does not occupy a register — so there is nothing to protect.
- The DJNZ loop, `cp` comparison, and `ld a, (hl)` stay exactly as they were.
  Typed variables are an addition to raw Z80, not a replacement for it.

## What Comes Next

Chapter 10 introduces `if`/`else` and `while`. The `count_above` double-`cp`
pattern — two `jr` instructions just to distinguish less-than from greater-than
— gets replaced with a readable `if` chain.

---

[← A Complete Program](08-a-phase-a-program.md) | [Part 2](README.md) | [Structured Control Flow →](10-structured-control-flow.md)
