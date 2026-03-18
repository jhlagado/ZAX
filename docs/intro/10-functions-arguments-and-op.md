# Chapter 10 — Functions, Arguments, and `op`

This chapter introduces typed function parameters, typed return values, and the
`op` construct. After reading it you will be able to write a ZAX `func` with
named typed parameters and a typed return value, write a zero-parameter `op`,
and explain the difference in cost between a typed `func` call and a raw `call`
or an `op` expansion.

Prerequisites: Chapters 00–09 (all Phase A and Phase B constructs to this point).

---

## What the Phase A calling convention required

Phase A subroutines passed all values through registers. The conventions were
chosen by the programmer and documented only in comments:

```zax
; find_max: scan a byte table and return the largest value.
; Inputs:  HL = pointer to first byte, B = number of bytes
; Outputs: A = maximum byte value found
func find_max(): AF
```

Every caller had to know that HL held the table pointer and B held the count,
and had to load those registers before each `call`. When `main` called
`find_max` and then `count_above`, it had to reload HL before the second call
because `find_max` advanced HL as a side effect — a fact visible only by reading
the function body or running the program.

The comment block was the only thing linking the register convention to the
function's purpose. If the convention was wrong or out of date, the compiler did
not notice.

---

## Typed parameters: names and types in the signature

A ZAX function with typed parameters moves the register-passing protocol into
the compiler's hands. The function declares what inputs it needs and what type
they have:

```zax
func find_max_f(tbl: addr, len: byte): HL
```

`tbl: addr` and `len: byte` are the parameters. When the caller writes:

```zax
a := find_max_f values, TableLen
```

the compiler emits the pushes for `values` (the address of the table) and
`TableLen` (the count), the `call`, and the stack cleanup after return. The
caller does not load HL or B. The compiler matches the arguments to the
parameters, checks types, and generates the call sequence.

Inside the function, parameters are accessed by name using `:=`, just like
typed locals:

```zax
hl := tbl           ; load the tbl parameter into HL
b := len            ; load the len parameter into B
```

The compiler places each parameter in an IX-relative slot (starting at IX+4 for
the first parameter). Accessing a parameter costs the same IX-relative
load/store sequence as accessing a local.

---

## The IX-anchored frame: what it costs

A framed function — one with parameters or locals — carries setup overhead that
a raw subroutine does not. The compiler emits a three-instruction prologue at
function entry:

```asm
push ix
ld   ix, 0
add  ix, sp
```

This saves the caller's IX and makes IX point to the current top of stack. Every
local and every parameter is then accessible as a signed byte offset from IX.

At function exit, the compiler emits a corresponding epilogue:

```asm
ld  sp, ix
pop ix
ret
```

For a void function that preserves BC, DE, HL, and AF, the epilogue also emits
the register restore sequence before the final `ret`.

That is six instructions of overhead — three prologue, three epilogue — plus
the register save/restore pushes. A raw `call` and `ret` are two instructions
total with no frame at all.

The frame overhead is not free. For a tight inner loop that calls a very short
helper, it may outweigh the benefit. For a function that is called a few times
from different places in a larger program, the frame cost is small relative to
what the function does, and the gain in readability and safety is real.

A function that has no parameters and no locals — like `func main(): void` in
all the examples — is frameless. No prologue, no epilogue. The `ret` is emitted
directly.

---

## The return clause

The return clause on a function declaration controls which registers carry the
result and which registers the compiler saves and restores around the frame.

| Declaration | What caller receives | What compiler preserves |
|-------------|----------------------|-------------------------|
| `func f(): void` | nothing | AF, BC, DE, HL all saved/restored |
| `func f(): AF` | A (and flags) | BC, DE, HL saved/restored; AF is not |
| `func f(): HL` | HL (16-bit) | AF, BC, DE saved/restored; HL is not |

Declaring `: void` when the function places a meaningful value in A is a bug.
The compiler's `pop AF` in the epilogue overwrites A before the caller sees it.
Chapter 06 established this rule; it applies to all three Phase B chapters.

`find_max_f` and `count_above_f` in the example are declared `: HL`. They return
their byte result in the low byte of HL (H is set to zero). The caller reads it
with `a := find_max_f ...` — the `:=` on the return path extracts the result
from HL into A at the call site.

---

## `op`: inline named operations

`op` defines a named operation that expands inline at every call site. There is
no `call` instruction, no frame, and no `ret`. The body is substituted directly
into the instruction stream where the op is invoked.

A zero-parameter `op` is declared with no parentheses:

```zax
op load_and_or(src: reg8)
  ld a, src
  or a
end
```

Every invocation of `load_and_or B` expands to:

```asm
ld a, b
or a
```

exactly as if those two instructions were written at that position in the source.

The example file uses `load_and_or` to name the repeated "copy register into A
and OR to establish flags" pattern that appears before every `while NZ` loop and
at every back edge. In Phase A, that pattern was copied by hand in every place
it appeared. With the `op`, it appears once in the declaration and once at each
invocation. The reader sees `load_and_or len` and knows immediately what
instruction pair will appear there.

---

## When to use `op` vs `func`

Use `op` when:

- a short sequence of instructions repeats in a mechanical way
- the expansion is small enough that calling overhead would dominate the cost
- you want accumulator-style or register-pair operations that read like opcodes
- no frame slot allocation is needed (ops cannot have `var` blocks)

Use `func` when:

- the function is long enough that a `call`/`ret` pair is not the dominant cost
- the function needs typed local variables (ops cannot have `var` blocks)
- the function is called from many places and you want the compiler to enforce
  the calling convention
- a consistent preservation contract at the call boundary matters

`op` bodies do not have their own preservation boundary. Registers clobbered by
an `op` body are clobbered in the caller's instruction stream, just as if the
programmer had written those instructions directly. If `load_and_or` clobbers A,
that clobber is visible in the function that invokes it. A `func` call, by
contrast, preserves all registers not in the return clause — the compiler
generates the save/restore sequence.

---

## The example: `examples/intro/10_functions_and_op.zax`

The example file contains `main`, `find_max_f`, `count_above_f`, and the op
`load_and_or`. It produces the same results as all previous capstone versions.

The `main` function now calls with argument expressions:

```zax
a := find_max_f values, TableLen
ld (max_val), a

a := count_above_f values, TableLen, 64
ld (cnt_val), a
```

No register pre-loading. No `ld hl, values / ld b, TableLen` before each call.
The caller names the arguments in the call; the compiler emits the pushes.

Inside `find_max_f`, the parameter `tbl` is loaded into HL to walk the table,
and `ptr` is a typed local that persists the current pointer across loop
iterations:

```zax
hl := tbl
ptr := hl

load_and_or len
while NZ
  hl := ptr
  ld a, (hl)
  inc hl
  ptr := hl
  ; ...
  b := len
  dec b
  len := b
  load_and_or len
end
```

`len` is a parameter. Parameters can be read and written with `:=` the same way
locals can — writing to a parameter changes the frame slot, not a register the
caller holds. Decrementing `len` each iteration is valid; the caller's value is
already on the stack and this function's frame slot is a copy.

The `op load_and_or` appears at both the loop entry and the back edge. This is
intentional: the while condition is re-tested at the back edge using the same
flag state, so the same setup must be correct at both points.

---

## Comparing the three generations

`06_subroutines.zax` — raw Phase A with register conventions in comments.
`07_phase_a_capstone.zax` — raw Phase A with DJNZ, push/pop, double-cp.
`09_structured_control.zax` — Phase B locals + structured control, still registers for arguments.
`10_functions_and_op.zax` — full Phase B: typed parameters, typed return, op, structured control.

Each generation removes one source of bookkeeping:

- Phase A → Chapter 08: registers-as-variables replaced by typed locals.
- Chapter 08 → Chapter 09: label scaffolding replaced by `if`/`while`.
- Chapter 09 → Chapter 10: register-passing conventions replaced by typed parameters.

The Z80 machine model has not changed. Registers, flags, the stack, and indexed
addressing are all still present in Chapter 10's programs. What has changed is
how much of the bookkeeping the compiler manages.

---

## What This Chapter Teaches

- Typed function parameters move the register-passing protocol into the
  compiler. The caller names the arguments; the compiler emits the pushes and
  stack cleanup.
- Parameters are accessible inside the function by name with `:=`, at the same
  cost as IX-relative locals.
- The function frame costs a three-instruction prologue and a three-instruction
  epilogue plus register saves/restores. A frameless function (no params, no
  locals) has none of this overhead.
- The return clause controls which registers carry results and which the compiler
  saves/restores. Declaring `: void` when the function leaves a result in A
  causes the epilogue to overwrite it before the caller sees it.
- `op` expands inline with no call overhead and no frame. Clobbers are visible
  in the caller.
- `func` provides a typed preservation boundary and compiler-enforced calling
  convention, at the cost of the frame overhead.
- Use `op` for short repeating patterns that need no frame. Use `func` for
  anything that benefits from a clean call boundary and typed parameters.

---

## What Comes Next

You have completed Volume 1.

By this point you can:

- explain bytes, words, addresses, the Z80 registers, and the hardware stack
- write raw Z80 instructions: `ld`, `add`, `sub`, `cp`, `and`, `or`, `jp`,
  `jr`, `djnz`, `call`, `ret`, `push`, `pop`
- use `section data` to declare named module storage
- write typed locals with `var` and assign them with `:=`
- use `succ` and `pred` for typed scalar update
- write `if`/`else` and `while` loops with `break` and `continue`
- write a ZAX `func` with typed parameters and a typed return value
- write an `op` for inline named instruction sequences
- explain what each Phase B construct costs and what it replaces from Phase A

**Volume 2: `docs/course/`**

The algorithms course (`docs/course/README.md`) is the second stage. It takes
the full Phase B surface as a given — typed storage, `:=`, `if`, `while`,
`break`, `continue`, `succ`/`pred`, typed functions, and `op` — and uses it
immediately from the first chapter.

Volume 2 covers the constructs and patterns needed for larger programs:

- **Arrays and indexing** — typed arrays declared in `section data`, indexed
  with register operands, 0-based with no runtime bounds checks
- **Records** — typed aggregate state, field access with `.`, `sizeof` and
  `offsetof` for layout arithmetic
- **Strings** — null-terminated byte arrays, sentinel traversal with `while NZ`
  and `break`
- **Recursion** — recursive `func` calls, the IX frame per call level, returning
  values across multiple call levels
- **Modules and `import`** — splitting programs across files, qualifying names
  with a module prefix, the `export` keyword
- **Pointer structures** — typed reinterpretation with `<Type>base.field`,
  linked-list and tree traversal using `addr` locals
- **`select`/`case`** — dispatch on a value, the ZAX alternative to jump tables

A reader who has finished Volume 1 through Chapter 10 can open any Volume 2
example file and follow it without encountering unfamiliar ZAX syntax. The
structures will be new; the language surface will not.

You are ready.
