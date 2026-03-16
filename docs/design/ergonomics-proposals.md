# ZAX Ergonomics Proposals

**Status:** Draft for discussion
**Based on:** Analysis of all language-tour and codegen-corpus examples after the `:=` migration

---

## Core design principle

The language is best when this line stays clear:

- **ZAX** manages named storage, typed paths, and structured control flow
- **Z80 mnemonics** manage arithmetic, flags, and raw machine operations

Expanding `:=` for better transfer ergonomics is coherent with that boundary.
Adding a small counted `for` is coherent with that boundary.
Adding a general expression evaluator inside assignment is not.

---

## What the corpus shows

After examining the full language-tour suite and the codegen corpus, one dominant noise pattern stands out above all others: the **register shuttle**.

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

The intermediate register contributes nothing to the programmer's intent. The code is ceremonial rather than communicative. This is the primary ergonomic problem. It is not a lack of arithmetic syntax.

---

## Priority order

1. Scalar storage-to-storage `:=` (path-to-path assignment)
2. Richer scalar path expressions on both sides of `:=`
3. Counted `for` loop (Pascal-style)
4. General assignment expressions — no, for now

---

## Proposal 1: Path-to-path assignment

### Rule

`:=` may accept any scalar source expression that can be lowered as a typed value.
`:=` may accept any scalar destination expression that can be lowered as a typed storage location.
If both sides are paths, the compiler shuttles through a register internally.

**Evaluation order is fixed:** RHS value is evaluated first, then the LHS destination is written. This is deterministic and must be documented.

### What becomes valid

Simple scalar copies:

```zax
dst := src
player.x := enemy.x
current.value := next.value
arr[i] := arr[j]
rec_a.inner.count := rec_b.inner.count
```

With typed reinterpretation in the chain:

```zax
<ListNode>dst_ptr.value := <ListNode>src_ptr.value
sprite.flags := <Sprite>hl.flags
```

Nested paths:

```zax
<Outer>dst_ptr.items[idx].count := <Outer>src_ptr.items[j].count
```

These are all still fundamentally transfers between two scalar places. The compiler resolves each side to a storage location and emits the appropriate load/store sequence.

### What stays out of scope

```zax
; Not valid — arithmetic expression on RHS:
x := a + b
arr[i] := x + 1
dst := foo(bar + baz, qux)
```

These require hidden temporary selection, sequencing rules, possible spill behaviour, and much broader diagnostics. That is a different language tier.

### Why this is the right boundary

The compiler already knows how to:
- find a storage location
- load a scalar value from it
- store a scalar value to it

Broadening `:=` to cover both-path transfer is a natural extension. Allowing arithmetic expressions would add hidden register allocation, hidden evaluation order, and mini-compiler behaviour. That cuts against ZAX's current honesty.

### Lowering

For a scalar copy `dest_path := src_path`:

1. Resolve the RHS path to a typed load target — produce `LOAD_xxx` steps into a chosen intermediate register.
2. Resolve the LHS path to a typed store target — produce `STORE_xxx` steps from that register.
3. Check for index-register conflict between the two paths and promote the intermediate if needed.

**Register selection:**

| Type  | Default intermediate | Promote if conflict    |
|-------|---------------------|------------------------|
| byte  | A                   | — (A never conflicts)  |
| word  | HL                  | DE (then BC)           |

The conflict rule for word copies: if the destination path uses L as its index register, `LOAD_RP_FVAR` to HL would clobber L before the store completes. Promote to DE. This is the same constraint already documented for the existing register-overlap bug class.

---

## Proposal 2: Lift path complexity limits

The right way to think about "more complex expressions" in ZAX is not arithmetic complexity — it is **storage-path complexity**.

The compiler should permit increasingly deep scalar path expressions on both sides of `:=`, provided they still resolve to a single scalar value (byte or word):

- nested field chains: `rec.inner.outer.field`
- typed reinterpretation in the chain: `<Type>reg.field`
- indexed paths: `arr[idx].field`
- address-of paths: `hl := @player.pos`
- combinations thereof: `<Outer>ptr.items[idx].count`

This is still a path/value-transfer problem. It does not change the philosophy.

What is not on the table is relaxing the limit into free-form computation:

```zax
; Bad: changes ZAX into an expression compiler
dst := (a + b) ^ ((c << 1) - d)
```

---

## Proposal 3: Pascal-style counted `for` loop

### Why not C-style

A C-style `for(init; cond; step)` is too broad. It drags in statement expressions, loop-local side effects, hidden sequencing rules, and a miniature control language in the header. That is not minimal.

### Design

A Pascal-like counted loop fits ZAX's character:

```zax
for idx := 0 to last_index
  ; body — idx runs 0, 1, ..., last_index
end

for row := height downto 1
  ; body — row runs height, height-1, ..., 1
end
```

### Semantics (v1 — narrow)

- Integer/register variable only
- `to` (ascending) and `downto` (descending)
- Bounds evaluated once on entry
- Step fixed: `+1` for `to`, `-1` for `downto`
- No arbitrary `step` — add later if needed
- No C-style init/cond/increment clauses

### Lowering

**`for reg := start to limit`:**

```
ld <reg>, <start>
@L:
  ld a, <reg>
  cp <limit+1>        ; or equivalent word comparison
  jr z, @end
  <body>
  inc <reg>
  jr @L
@end:
```

**`for reg := start downto 1` (byte register, reg is B):**

```
ld b, <start>
@L:
  <body>
  djnz @L
```

**`for reg := start downto 1` (any other register):**

```
ld <reg>, <start>
@L:
  <body>
  dec <reg>
  jp nz, @L
```

The `downto` form with B is the Z80's native `DJNZ` loop. The compiler should recognise this case and emit the optimal instruction.

### Why this fits ZAX better than `while`

The existing counted-loop idiom:

```zax
ld b, 10
loop:
  nop
  djnz loop
```

uses raw labels and breaks the structured control flow model. A `for` construct makes the intent explicit, removes the label, and still lowers to the same instructions. The programmer retains full register visibility — they choose which register is the counter.

### What `for` does not cover

Count-up loops that do not fit the simple `to` pattern remain `while`. This is appropriate: they require the programmer to be explicit about the comparison, which is consistent with ZAX's rule that the programmer sets flags.

---

## Non-proposal: general RHS arithmetic

Not planned.

Once arithmetic expressions are allowed on the RHS, the following become necessary:

- hidden temporary register selection
- expression sequencing rules
- possible spill behaviour when more intermediate values are live than there are registers
- substantially broader diagnostics

This is the domain of a compiler backend, not an assembler's macro expander. The step from "pipeline of typed load/store stages" to "expression evaluator" is non-trivial and changes the fundamental character of the language.

The boundary stays: **path-to-path copies (no computation) are ZAX-layer. Arithmetic between loads and stores remains Z80-layer.**

---

## Summary

| Proposal                          | Priority | Direction         |
|-----------------------------------|----------|-------------------|
| Scalar path-to-path `:=`          | 1        | Yes — implement   |
| Richer scalar path complexity     | 2        | Yes — extend      |
| Pascal-style counted `for`        | 3        | Yes — design next |
| General RHS arithmetic            | —        | No, for now       |
| C-style `for`                     | —        | No                |
