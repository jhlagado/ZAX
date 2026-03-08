# `addr` Implementation Prerequisites

**Date:** 2026-03-08
**Status:** Spec decisions — ready for implementation backlog
**Purpose:** Close the implementation-blocking questions from `ops-first-addressing-decisions.md` before `addr` work begins. Not a replacement for that document; a narrower follow-up.

Questions addressed here: Q3, Q4, Q5, Q6, Q7.
Questions deferred to a later pass: Q1, Q2 (cast syntax), Q8 (case overlap lowering).

---

## Q5 — Op contracts: resolved as deferred (not an open question)

**Answer:** No op metadata in v1. Op contracts are entirely deferred.

Ops carry no compiler-verified clobber/result annotations. The programmer is responsible for preservation within an op body. The compiler makes no promises about register effects of op expansion.

This is already stated in D4. It is recorded here as **resolved** to remove it from the open-question list. There is no implementation work for op contracts in this phase.

---

## Q3 — Transitional status of typed EA in `ld`

**Answer:** Transitional compatibility only. Not a parallel feature.

Forms such as:

```zax
ld a, arr[C]
ld arr[C], a
ld de, table[idx]
```

are transitional compatibility surface. They are not independently specified and do not have their own bespoke lowering.

What "transitional" means concretely:

- they are defined only as shorthand for the `addr`-then-access pattern (see Q4)
- they carry no preservation guarantee beyond what the `addr` model provides
- they may be removed from the language once `addr` is established and the standard-library ops exist
- new code should not rely on them as the primary or intended model

The implementation must not introduce or maintain bespoke hidden lowering for these forms. If they remain in the parser, their lowering must route through the `addr` path.

---

## Q4 — Semantic mapping of transitional direct EA forms onto `addr`

**Answer:** Each transitional form is defined as a fixed expansion. The expansion is expressed in terms of `addr hl, [ea]` plus a specific instruction sequence. HL is always the intermediate register.

### Byte load

```zax
ld a, ea
```

expands to:

```zax
addr hl, ea
ld a, (hl)
```

- clobbers: HL
- result: A

### Byte store

```zax
ld ea, a
```

expands to:

```zax
addr hl, ea
ld (hl), a
```

- clobbers: HL
- result: memory at ea

### Word load (into HL)

```zax
ld hl, ea
```

expands to:

```zax
addr hl, ea
ld a, (hl)
inc hl
ld h, (hl)
ld l, a
```

- clobbers: HL (result), AF
- result: HL holds the loaded word

### Word load (into DE)

```zax
ld de, ea
```

expands to:

```zax
addr hl, ea
ld e, (hl)
inc hl
ld d, (hl)
```

- clobbers: HL
- result: DE holds the loaded word

### Word load (into BC)

```zax
ld bc, ea
```

expands to:

```zax
addr hl, ea
ld c, (hl)
inc hl
ld b, (hl)
```

- clobbers: HL
- result: BC holds the loaded word

### Word store (from HL) — unsupported in v1

```zax
ld ea, hl
```

is **not supported as transitional sugar in v1**.

Reason: `addr` is HL-only. A word store from HL needs the effective address in a register other than HL. There is no single-register solution without either a second `addr` destination register or an explicit spill. That is exactly the kind of hidden complexity the ops-first direction is eliminating.

The v1 diagnostic for this form is:

> *Word store via typed EA in `ld` is unsupported. Use `addr` to materialize the address into a scratch register explicitly.*

The correct explicit pattern is a user-authored instruction sequence or op:

```zax
; store HL value at ea — explicit form
push hl
addr hl, ea
ex de, hl       ; DE = address, HL = garbage
pop hl          ; HL = value to store
ld (de), l
inc de
ld (de), h
```

Or, if DE is available:

```zax
addr de, ea     ; not available in v1 — addr is HL-only
```

This gap is resolved by either a future `addr de, ea` extension, or a standard-library store op.

---

## Q6 — Internal preservation-region model

**Answer:** `addr` has a fixed, compiler-guaranteed public contract:

> `addr hl, ea_expr` places the effective address in `HL`. All other registers are preserved.

The programmer never needs to know how `addr` computes the address internally. Whatever registers the lowering path uses transiently (DE, AF, etc.), the compiler pushes and pops them around the lowering body. This is invisible and irrelevant to the programmer.

### Why this is not D4's deferred problem

D4 (op contracts deferred) is about **user-written op bodies**, where the compiler has no way to verify register/flag side effects without a full per-instruction effect-analysis framework.

`addr` is different. It is a **compiler-owned keyword**. The compiler generates the entire lowering. It knows exactly which registers each EA shape will transiently use, because it wrote the code. No effect analysis is needed — the compiler has complete internal knowledge.

The preservation model is therefore straightforward:

```
for each addr lowering path:
  transiently_used = registers used internally by this path, excluding HL
  preserve_set     = transiently_used - dead_set_at_call_site

emit:
  push each R in preserve_set
  [lowering body]
  pop each R in reverse(preserve_set)
```

The `dead_set_at_call_site` is the union of `@dead` annotations in scope. See Q7.

### Example

`addr hl, arr[C]` where `C` is an 8-bit register index, base is a global:

- lowering body: `ld de, base; ld a, C; add e; ld e, a; ld a, d; adc 0; ld d, a; ex de, hl`
- transiently_used: `{DE, AF}`
- default preserve_set: `{DE, AF}` — compiler emits `push de; push af` / `pop af; pop de`

With `@dead DE` in scope:
- dead_set: `{DE}`
- effective preserve_set: `{AF}` — compiler emits only `push af` / `pop af`

With `@dead DE` and `@dead AF` in scope:
- effective preserve_set: `{}` — no push/pop emitted

The lowering body itself never changes. Only the wrapping changes.

### The key rule

The programmer sees one thing: `addr` computes and preserves. The compiler sees the other thing: what needs wrapping for each path. The programmer can relax that wrapping selectively with `@dead`. Neither side needs to know the other's details.

---

## Q7 — Pragma placement and scope rules for `@dead`

**Answer:**

### Placement

`@dead` is a statement-level pragma placed in the instruction stream of a function or block body.

Valid contexts in v1:
- `func` or `op` body
- body of any structured control block (`if`, `while`, `repeat`, `select`)

Invalid contexts in v1:
- `data` section
- `type` or `union` declaration
- module top level

### Scope

`@dead reg16` applies from the point of declaration to the end of the enclosing scope, including all nested scopes within it.

`@dead DE` at function level covers the entire function body, including nested blocks. `@dead DE` within a block covers the remainder of that block and any blocks nested within it. There is no "un-dead" mechanism in v1.

### Accumulation

Multiple `@dead` declarations in the same scope union their sets:

```zax
func render(): HL
  @dead BC
  @dead DE
  ; dead set for this scope: {BC, DE}
  ...
end
```

### Syntax

```
pragma_stmt = "@dead" reg16
reg16       = "BC" | "DE" | "AF"
```

HL is not a valid `@dead` target. It is always the result of `addr` and is always clobbered by definition.

### In op bodies

`@dead` in an op body applies to any compiler-owned lowering within the op (e.g., `addr` lowering inside the op body). It does not and cannot affect the op's own push/pop statements — those are author-owned code, not compiler-generated preservation scaffolding.

---

## What remains open

| Question | Status | When to resolve |
|---|---|---|
| Q1: `<Type>base.tail` grammar production | Open | Before cast syntax implementation begins |
| Q2: Valid `base` for cast in v1 | Open | Before cast syntax implementation begins |
| Q3: Transitional status of typed EA in `ld` | **Resolved above** | — |
| Q4: Semantic mapping of transitional forms | **Resolved above** | — |
| Q5: Op contracts | **Resolved: deferred** | — |
| Q6: Preservation-region model | **Resolved above** | — |
| Q7: `@dead` placement and scope | **Resolved above** | — |
| Q8: Range/grouped case overlap lowering | Open | Before `select` range implementation begins |

---

## Implementation boundary

The resolved answers support a narrow first slice:

1. `addr hl, ea_expr` — parser, lowering, and preservation-region emission around each lowering path
2. `@dead reg16` pragma — recognition in instruction stream, scope tracking, dead-set propagation into preservation emission
3. Transitional typed EA in `ld` — routes through `addr` lowering, not bespoke; word-store-from-HL produces diagnostic
4. Tests — verify correct address computation across EA shapes; verify preservation emitted/elided correctly under `@dead`; verify diagnostic for unsupported word-store case

Cast syntax (Q1/Q2) and range case lowering (Q8) are not part of this slice.
