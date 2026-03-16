# ZAX Ergonomics Proposals

**Status:** Draft — revised after designer review of PR #890
**Based on:** Analysis of all language-tour and codegen-corpus examples after the `:=` migration

---

## Core design principle

The language is best when this line stays clear:

- **ZAX** manages named storage, typed paths, and structured control flow
- **Z80 mnemonics** manage arithmetic, flags, and raw machine operations

Expanding `:=` for better transfer ergonomics is coherent with that boundary.
Lifting `inc` and `dec` onto typed paths is coherent with that boundary.
Adding a general expression evaluator inside assignment is not.

---

## What the corpus shows

The dominant noise pattern after the `:=` migration is the **register shuttle**: load a typed value into a register, do one small thing or nothing, write it back to another typed path. The intermediate register contributes nothing to the programmer's intent.

```zax
; 02_fibonacci_args_locals.zax — four shuttles in a row:
move hl, curr_value
move prev_value, hl      ; intent: prev_value := curr_value

move hl, next_value
move curr_value, hl      ; intent: curr_value := next_value
```

```zax
; Incrementing a named counter — three lines for one logical operation:
move hl, count
inc hl
move count, hl
```

The biggest source noise is not a lack of arithmetic syntax. It is forced register shuttling for obvious typed transfers.

---

## Priority order

1. Scalar path-to-path `:=`
2. `inc` / `dec` on typed paths
3. Counted `for` loop — design needs further work before implementation

---

## Proposal 1: Path-to-path assignment

### Rule

- `:=` may accept any scalar source expression that can be lowered as a typed value.
- `:=` may accept any scalar destination expression that can be lowered as a typed storage location.
- If both sides are paths, the compiler shuttles through a register internally.
- Evaluation order is fixed: **RHS value is fully evaluated and loaded first, then LHS destination is written.** This is deterministic and normative.

### What becomes valid

Simple scalar copies:

```zax
dst := src
player.x := enemy.x
current.value := next.value
arr[i] := arr[j]
rec_a.inner.count := rec_b.inner.count
```

Typed reinterpretation in the chain:

```zax
<ListNode>dst_ptr.value := <ListNode>src_ptr.value
sprite.flags := <Sprite>hl.flags
```

Nested paths:

```zax
<Outer>dst_ptr.items[idx].count := <Outer>src_ptr.items[j].count
```

These all remain fundamentally transfers between two scalar places.

### Aliasing and self-copy

`x := x` is valid. Because evaluation order is fixed (load RHS into register, then store to LHS), the scalar value is captured before the write. Self-copy is therefore a no-op in effect. Overlapping typed locations behave as "load scalar RHS value, then store scalar LHS value" — no special aliasing rules are needed beyond the fixed evaluation order.

### Register conflict table

The pipeline must choose an intermediate register that does not conflict with the index registers required by either path. "A never conflicts" is not correct — byte-indexed paths can use A as their index register.

**Byte copies:**

| Destination index | Source index | Safe intermediate | Rationale |
|-------------------|-------------|-------------------|-----------|
| not A             | any         | A                 | A is free for the value |
| A                 | not A       | B                 | Dest needs A for addressing; load source into B |
| A                 | A           | B                 | Both paths use A; hold value in B throughout |

If B is also occupied as an index in one of the paths, promote to C (then D, E, in order). In practice, a single path cannot use more than one index register simultaneously, so one promotion level is sufficient.

**Word copies:**

| Destination index register | Safe intermediate | Rationale |
|---------------------------|-------------------|-----------|
| not L or H (or no register index) | HL | HL is free |
| L or H                    | DE                | HL is in use for dest addressing; loading into HL clobbers L before the store |
| L or H, and DE also in use | BC               | Both HL and DE occupied |

The conflict that must be avoided for word copies: `LOAD_RP_FVAR` targeting HL uses `ex de, hl / ld e, (ix+d) / ld d, (ix+d+1) / ex de, hl`, which necessarily clobbers L. If the destination path indexes via L, the index is destroyed before the store can execute. This is the same register-overlap constraint documented in the existing bug-fix work.

### What stays out of scope

```zax
; Not valid — arithmetic on RHS:
x := a + b
arr[i] := x + 1
```

These require hidden temporary selection, sequencing rules, and possible spill behaviour. That is a different language tier.

---

## Proposal 2: `inc` and `dec` on typed paths

### Rule

`inc path` and `dec path` are valid wherever `path` resolves to a scalar byte or word storage location. They lower as: load value into register, apply `inc`/`dec`, store back.

### Examples

```zax
inc count          ; was: move hl, count / inc hl / move count, hl
dec used_slots
inc entries[B].version
```

### Lowering

| Type  | Register | Sequence emitted                               |
|-------|----------|------------------------------------------------|
| byte  | A        | `ld a, <path>` / `inc a` / `ld <path>, a`     |
| word  | HL       | `ld hl, <path>` / `inc hl` / `ld <path>, hl`  |

The register is chosen by the same conflict rules as path-to-path assignment (promote if the path uses A or L as its index register).

### Flag behaviour

`ld` on Z80 does not alter flags. Therefore: the flags after `inc path` or `dec path` are exactly the flags set by `inc <reg>` or `dec <reg>`. The load and store do not interfere. This makes `inc path` / `dec path` composable with existing flag-driven control flow in the expected way.

```zax
inc count
if Z
  ; count wrapped to zero
end
```

### Disambiguation from raw Z80

`inc` and `dec` already apply to registers and indirect addresses in raw Z80:

```zax
inc hl        ; raw Z80 — register
inc (hl)      ; raw Z80 — indirect memory
```

`inc name` where `name` resolves to a ZAX typed path is the new form. The parser resolves this by checking whether the operand is a register name, a `(register)` indirect, or a named path expression. No grammar ambiguity arises.

---

## Proposal 3: Counted `for` loop

### Design

Pascal-style counted iteration:

```zax
for idx := 0 to last_index
  ; body
end
for row := height downto 1
  ; body
end
```

### Normative rules

- **Any register** may be the loop variable — `B`, `C`, `HL`, or any other scalar register.
- **Bounds are evaluated once on entry.** Neither the start nor the end expression is re-evaluated on each iteration.
- **Step is fixed:** `to` increments by 1; `downto` decrements by 1.
- **Zero-trip safe.** An entry guard is emitted unconditionally: if the initial value already satisfies the termination condition the body is skipped entirely.

### Lowering

The general lowering is: evaluate bounds on entry, emit an entry guard, then loop with `inc`/`dec` + compare. For example, `for row := height downto 1` with `row` in `B` lowers to:

```
ld b, <height>
ld a, b
or a
jr z, @end      ; zero-trip guard
@L:
  <body>
  djnz @L       ; DJNZ: optimisation for B + downto 1
@end:
```

DJNZ is used as an **internal optimisation** when the loop variable happens to be `B` and the direction is `downto 1`. It is not the defining feature of the construct and it is not visible in the surface syntax. All other combinations emit `dec`/`inc` + conditional jump.

**Not in scope:** C-style `for(init; cond; step)`. That is too broad and drags in statement expressions, loop-local side effects, and a miniature control language. It is not minimal.

### Status

Design is settled. Implement after proposals 1 and 2.

---

## Non-proposal: general RHS arithmetic

Not planned.

```zax
; Not valid — different language tier:
next_value := prev_value + curr_value
dst := (a + b) ^ ((c << 1) - d)
```

Allowing arithmetic on the RHS requires hidden temporary selection, sequencing rules, possible spill behaviour, and substantially broader diagnostics. That changes ZAX from a structured assembler into an expression compiler. The boundary stays: **path-to-path copies (no computation) are ZAX-layer; arithmetic between loads and stores remains Z80-layer.**

---

## Summary

| Proposal                         | Verdict              |
|----------------------------------|----------------------|
| Scalar path-to-path `:=`         | Yes — implement next |
| `inc` / `dec` on typed paths     | Yes — implement      |
| Pascal-style counted `for`       | Yes — Pascal-style, implement after proposals 1 and 2 |
| General RHS arithmetic           | No, for now          |
| C-style `for`                    | No                   |
