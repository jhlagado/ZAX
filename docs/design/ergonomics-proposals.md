# ZAX Ergonomics Proposals

**Status:** Draft for discussion
**Based on:** Analysis of all language-tour and codegen-corpus examples after the `:=` migration

---

## What the corpus shows

After examining the full language-tour suite (34 files) and the codegen corpus, three recurring noise patterns stand out. They share a common cause: the current `:=` assignment requires one side of every assignment to be a plain register. This forces the programmer to name an intermediate register even when the register contributes nothing to the intent.

### Pattern 1 — The register shuttle

The most frequent pattern: load a named variable into a register, do nothing with it, then store from that same register to another named variable.

```zax
; 02_fibonacci_args_locals.zax — four shuttles in a row:
move hl, curr_value
move prev_value, hl      ; intent: prev_value := curr_value

move hl, next_value
move curr_value, hl      ; intent: curr_value := next_value
```

```zax
; 11_records_and_fields.zax:
move a, lo_value
move pair_buf.lo, a      ; intent: pair_buf.lo := lo_value
```

```zax
; 03_globals_and_aliases.zax:
move hl, new_value
move counter, hl         ; intent: counter := new_value
```

The intermediate register is pure lowering noise. The programmer's intent is a typed memory copy.

### Pattern 2 — The DJNZ orphan

Every counting loop in the corpus uses raw Z80 labels:

```zax
; hello.zax, control_flow_and_labels.zax:
ld b, 10
loop:
  ; body
  djnz loop
```

ZAX has `while`, `repeat`, and `select` as structured constructs. The most common loop pattern on Z80 — count-down with DJNZ — has no structured form. The programmer is left writing raw labels and jumps for something that is entirely predictable.

### Pattern 3 — Read-modify-write verbosity

Incrementing or decrementing a named variable requires three lines:

```zax
move hl, count
inc hl
move count, hl
```

The pattern appears wherever a counter, index, or accumulator is maintained in named storage.

---

## Proposal 1: Path-to-path assignment

### Syntax

```zax
dest_path := src_path
```

Both sides are typed named-storage paths (the same `ea_expr` already defined in the grammar). The types must match.

### What changes

Currently `:=` requires at least one side to be a plain register (`assign_reg`). This proposal lifts that restriction and allows both sides to be paths.

### Lowering

The pipeline already handles each side independently. The new case chains them:

1. Lower the RHS path: resolve type, base, and index — emit `LOAD_xxx` steps targeting a chosen intermediate register.
2. Lower the LHS path: resolve type, base, and index — emit `STORE_xxx` steps from that same register.
3. Check for index-register conflict between the two paths and promote the intermediate if needed.

**Register selection:**

| Copy type | Default intermediate | Promote to if conflict |
|-----------|---------------------|------------------------|
| `byte`    | A                   | — (A never conflicts)  |
| `word`    | HL                  | DE (then BC)           |

The conflict rule for word copies: if the destination path uses L as its index register (meaning HL addressing is in use), `LOAD_RP_FVAR` targeting HL would clobber L before the store. Promote to DE instead. This is the same register-overlap constraint already documented in the codebase.

### Examples

```zax
; Before (current):
move hl, curr_value
move prev_value, hl

; After:
prev_value := curr_value
```

```zax
; Before:
move a, lo_value
move pair_buf.lo, a

; After:
pair_buf.lo := lo_value
```

```zax
; Word copy into indexed field — compiler promotes to DE
; because destination uses L as index:
entries[L].stamp := new_stamp
```

```zax
; Fibonacci update block — before:
move hl, curr_value
move prev_value, hl
move hl, next_value
move curr_value, hl

; After:
prev_value := curr_value
curr_value := next_value
```

### What this is not

Path-to-path is a typed memory copy. It is not arithmetic. `result := a + b` remains two explicit lines:

```zax
hl := a
de := b
add hl, de
result := hl
```

The line between ZAX typed transfers and Z80 computation stays clear. Paths can flow into registers, registers can flow into paths, but arithmetic lives in raw Z80 instructions between those transfers.

---

## Proposal 2: `inc` and `dec` for named variables

### Syntax

```zax
inc path
dec path
```

Where `path` is any typed `ea_expr` naming a `byte` or `word` storage location.

### Semantics

`inc path` is exactly:
```
load path into appropriate register
inc register
store register back to path
```

`dec path` is the same with `dec`.

### Lowering

| Type  | Register | Emitted sequence                               |
|-------|----------|------------------------------------------------|
| byte  | A        | `ld a, path / inc a / ld path, a`             |
| word  | HL       | `ld hl, path / inc hl / ld path, hl`          |

The intermediate register is clobbered, consistent with all other typed transfers.

### Examples

```zax
; Before:
move hl, count
inc hl
move count, hl

; After:
inc count
```

```zax
; Before:
move hl, index_value
inc hl
move index_value, hl

; After:
inc index_value
```

```zax
; Decrement:
dec used_slots
```

### Disambiguation

`inc` / `dec` as raw Z80 instructions already apply to registers and memory addresses:
```zax
inc hl       ; raw Z80 — register
inc (hl)     ; raw Z80 — indirect
```

`inc name` where `name` resolves to a typed ZAX storage path is the new form. The parser can distinguish these by checking whether the operand is a register name, a `(register)` indirect, or a named path expression. No grammar ambiguity.

---

## Proposal 3: `for` loop

### Design principle

ZAX's `for` loop should be honest about what the Z80 does well. The Z80's dedicated count-down instruction is `DJNZ`: decrement B, jump if not zero. This pattern is so fundamental to Z80 programming that it deserves a structured form.

ZAX should not attempt to be a general-purpose loop compiler. The `to` (count-up) variant requires non-trivial register management and is already well served by `while`. The `downto` variant maps directly and completely to `DJNZ`.

### Syntax

```zax
for reg8 := expr
  ; body — reg8 decrements from expr down to 1
end
```

`reg8` is any 8-bit register (B, C, D, E, H, L — or A if the body doesn't use it for arithmetic). `expr` is any byte-valued immediate or named variable.

### Lowering

When `reg8` is B:
```
ld b, <expr>
@L:
  <body>
  djnz @L
```

When `reg8` is any other 8-bit register:
```
ld <reg8>, <expr>
@L:
  <body>
  dec <reg8>
  jp nz, @L
```

### Semantics

- The loop body executes `expr` times (where `expr > 0`; behaviour when `expr == 0` follows DJNZ semantics — wraps to 255 iterations).
- Inside the body, `reg8` holds the current count value: `expr`, `expr-1`, …, `1`.
- After the loop, `reg8 == 0`.
- The register is available for use as an index or counter within the body. The programmer is responsible for preserving it across any calls that would clobber it.

### Examples

```zax
; Before (raw labels):
ld b, 10
loop:
  nop
  djnz loop

; After:
for B := 10
  nop
end
```

```zax
; Count-down with B as index into array (1-based):
for B := entry_count
  push bc
    process entries[B]
  pop bc
end
```

```zax
; Using a non-B register (emits dec + jp nz):
for C := 8
  ; shift body using C as bit counter
  rrca
  dec c   ; NOTE: dec c is inside the body but the for emits its own dec c at end
  ; ...   ; programmer must not independently dec the loop register
end
```

**Note on the loop register:** The `for` construct owns the decrement. The programmer must not `dec` or modify the loop register within the body. Using the register as a read-only counter or index is safe. Preserving it across calls with push/pop is the programmer's responsibility.

### What `for` does not cover

**Count-up loops** are already served by `while`:

```zax
ld l, 0
ld a, l
cp limit
while NZ
  ; body using L as index
  inc l
  ld a, l
  cp limit
end
```

This is explicit about the comparison register and limit, consistent with ZAX's philosophy that the programmer sets flags.

**Early exit** within a `for` loop is not defined in this proposal. A `ret` is always valid. A mid-loop `jp` to a label after the `end` is the current idiom; a `break` keyword could be considered separately.

---

## Non-proposal: general RHS arithmetic

The user has noted that the pipeline infrastructure could in principle support arbitrary expression chains on the RHS of `:=`. For example:

```zax
next_value := prev_value + curr_value   ; hypothetical
```

This is a coherent idea but is deliberately deferred. Implementing it requires:
- A register allocator (to hold `prev_value` in HL while `curr_value` loads into DE)
- An expression tree or linear IR for the RHS
- Spill logic when more intermediate values are in flight than there are registers

This is the domain of a compiler backend, not an assembler's macro expander. ZAX's current pipeline is a linear instruction emitter, not a tree reducer. The step from `pipeline of load/store stages` to `expression evaluator` is non-trivial.

More importantly: explicit intermediate registers are a feature, not a bug. When the programmer writes:

```zax
hl := prev_value
de := curr_value
add hl, de
next_value := hl
```

They know exactly which registers hold which values and what the Z80 is doing. The cognitive overhead is low because the instruction count is low. Removing that visibility in service of shorter syntax would blur the Z80/ZAX line.

The right boundary: path-to-path copies (no computation) are ZAX-layer. Arithmetic between loads and stores remains Z80-layer. This boundary is clean and teachable.

---

## Summary

| Proposal | Scope | Key benefit |
|----------|-------|-------------|
| Path-to-path `:=` | Lift one-path-per-assignment restriction | Eliminates register-shuttle boilerplate; intent becomes the code |
| `inc` / `dec` paths | New forms of existing keywords | Collapses 3-line read-modify-write to 1 line |
| `for` loop | New structured construct | Brings DJNZ into the structured-control-flow family |
| General RHS arithmetic | **Not proposed** | Preserves the ZAX/Z80 boundary; deferred |

All three proposals maintain the core ZAX invariant: the programmer sees the registers, chooses when to cross the typed/raw boundary, and retains full control of machine state. None of them introduce implicit allocation or hidden spills.
