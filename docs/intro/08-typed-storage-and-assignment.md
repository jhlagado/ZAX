# Chapter 08 — Typed Storage and Assignment

This chapter introduces typed local variables and the `:=` assignment operator.
After reading it you will be able to declare a typed local inside a function,
read and write it with `:=`, use `succ` and `pred` to increment or decrement it,
and explain what the compiler does differently from a raw `ld` instruction.

Prerequisites: Chapters 00–07 (all Phase A constructs, especially the register-
naming friction identified in Chapter 07).

---

## What typed storage is

A typed local is a named variable declared inside a `var` block at the top of a
function. It has a declared type (`byte`, `word`, or `addr`), and the compiler
allocates a slot for it in the function's stack frame. The variable is referred
to by name throughout the function body. No register is permanently assigned to
hold its value.

In Phase A, a value that needed to persist across iterations of a loop had to
live in a register — B for a loop counter, D for a running count, and so on.
The choice of register was the programmer's responsibility, and it was a source
of naming pressure: when two values needed to persist simultaneously, two
registers had to be reserved, and any function that modified those registers had
to save and restore them with `push` and `pop`. Chapter 07 named this cost
explicitly in `count_above`: the `push bc / ld d, 0 / pop bc` block existed
only because D needed to be initialized in a register-conscious way, not because
the save and restore carried any logical meaning.

Typed locals remove that pressure. The compiler decides where to put the value.

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
  ret
end
```

`count: byte = 0` declares a one-byte local named `count`, initialized to zero.
`total: word = 0` declares a two-byte local named `total`, initialized to zero.
Both are allocated as 16-bit slots in the IX-anchored frame that ZAX builds for
the function.

A local initialized to zero does not need the `= 0` clause — uninitialized
scalar locals start at zero by default — but writing it explicitly states the
intent.

Only scalar types are valid in `var` blocks: `byte`, `word`, `addr`, and `ptr`.
Non-scalar types (arrays, records) may appear as aliases but do not allocate
frame slots. This chapter uses only `byte` and `word` locals.

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
the right. This matches the visual direction of `ld destination, source` from
Phase A.

`:=` is not just another spelling of `ld`. The difference is what the compiler
checks and what it emits. `ld` is a raw Z80 instruction: the programmer chooses
the operand form and the assembler encodes it. `:=` is a typed assignment: the
compiler checks that the left-hand side is writable typed storage, checks that
the right-hand side is a compatible value, and then emits the correct load or
store sequence, including any multi-instruction lowering the target requires.

For frame slots, the lowering is non-trivial on the Z80. The IX-anchored frame
addresses locals through `(IX±offset)` forms. Because the Z80 does not allow
`ld h, (ix+d)` or `ld l, (ix+d)`, word-sized frame slot transfers require the
compiler to use DE as a shuttle register and emit `ex de, hl` around the load or
store. When you write `hl := count`, the compiler may emit:

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

In Phase A, a named storage location like `count` could appear in two ways:

```zax
ld a, count      ; bare name: load the value stored at count
ld a, (count)    ; parentheses: dereference — same result for a byte scalar
```

Both produce the same machine code for a simple byte scalar because the address
is fixed and the instruction encodes it directly. Chapter 02 established the
rule: the bare form means "the typed value at this location" and `(name)` means
"memory at this address."

With typed locals, the bare form is the only form used for `:=`. Typed locals
live at IX-relative offsets, not at fixed absolute addresses; the dereference
form `(count)` would mean "memory at the address value stored in the count slot,"
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

## Phase A vs Phase B: the same two loops

The Chapter 07 capstone — finding the maximum value and counting entries above a
threshold — illustrates the change clearly. Here are both versions side by side.

**Phase A — `find_max` from `07_phase_a_capstone.zax`:**

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
  ret
end
```

The running maximum lives in A throughout. A temporary register C is used to
hold each table byte. Neither name says what the value means — `a` and `c` are
structural choices, not semantic names.

**Phase B — `find_max_b` from `08_typed_storage.zax`:**

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
  ret
end
```

`running_max` is a named variable. Its name says what it holds. The compiler
places it in a frame slot; the programmer does not need to choose a register for
it. The logic at the end — `a := running_max` — makes explicit what Phase A
left implicit: the result must be loaded into A before the function returns.

**Phase A — `count_above` from `07_phase_a_capstone.zax`:**

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
  ret
end
```

The `push bc / ld d, 0 / pop bc` block is pure bookkeeping. D must be zero
before the loop, but B and C carry inputs and cannot be clobbered. The push/pop
pair preserves them while D is initialized. The push/pop is not part of the
algorithm; it is register management overhead.

**Phase B — `count_above_b` from `08_typed_storage.zax`:**

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
  ret
end
```

`cnt` is a named typed local initialized to zero. No register needed. No
push/pop. `succ cnt` increments it. `a := cnt` loads the result for the caller.
The push/pop block is gone because `cnt` does not occupy a register that carries
an input.

---

## The example: `examples/intro/08_typed_storage.zax`

The example file rewrites the two Phase A subroutines above and demonstrates
them called from the same `main` as Chapter 07. The data and expected results
are identical — the table `{ 23, 47, 91, 5, 67, 12, 88, 34 }` produces a
maximum of 91 and a count of 3 entries above 64 — so the reader can compare the
outputs directly.

Notice what remains unchanged between Phase A and Phase B:

- The `djnz` loop structure is kept. DJNZ is still the right counted-loop
  primitive for a table of known length.
- The `cp c` instruction for comparison is kept. `:=` covers assignment; it does
  not replace flag-setting arithmetic instructions.
- The `ld a, (hl)` inside the loop body is kept. Reading through a raw pointer
  into a register is still written as raw Z80.

Phase B adds names and types to persistent values. It does not change how
arithmetic and pointer manipulation are expressed.

**Raw Z80 instructions accept typed local names directly.** In the Phase B
version, `cp running_max` uses the typed local name as an operand to a raw Z80
instruction — not a `:=` assignment. This is valid: the ZAX compiler recognises
typed local names in raw instruction operand positions and lowers them to the
correct `(IX±d)` addressing form automatically. Writing `cp running_max` emits
`cp (ix-N)` where N is the frame offset of `running_max`. The name refers to
the same frame slot as it does in `:=` — but the access form here is an
instruction operand, not a typed assignment. This is different from writing
`a := running_max` (which generates a register load sequence) but refers to the
same underlying storage.

---

## What This Chapter Teaches

- A `var` block inside a function declares typed locals. Scalars get IX-relative
  frame slots; the compiler allocates them and manages the frame.
- `:=` assigns a value from the right side to the left side. It is a typed
  assignment: the compiler checks types and emits the correct lowered sequence.
- `:=` is not `ld`. For IX-relative word slots, the compiler emits a multi-
  instruction DE-shuttle sequence. The programmer writes one line; the compiler
  produces the correct Z80.
- Bare names refer to the typed value. Do not use `(name)` for typed locals —
  that would mean "memory at the address stored in the slot."
- `succ path` increments a typed scalar in place. `pred path` decrements it.
  Neither returns a value or guarantees flag state.
- The push/pop overhead from Phase A's `count_above` is eliminated by giving the
  counter a typed local name, removing the register naming pressure entirely.
- The DJNZ loop, `cp` comparison, and `ld a, (hl)` pointer-read are Phase A
  constructs that Phase B does not replace. Typed storage is a complement to
  raw Z80, not a replacement for it.

## What Comes Next

Chapter 09 introduces structured control flow: `if`/`else` as a replacement for
flag-test-and-jump sequences, and `while` as a replacement for manual loop-label
structures. The `count_above` pattern — two `jr` instructions to separate less-
than and equal-to from greater-than — will be rewritten as a readable `if` chain.
