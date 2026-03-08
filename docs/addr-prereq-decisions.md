# `addr` Implementation Prerequisites

**Date:** 2026-03-08
**Status:** Spec decisions — ready for implementation backlog
**Purpose:** Close the implementation-blocking questions from `ops-first-addressing-decisions.md` before `addr` work begins. Not a replacement for that document; a narrower follow-up.

Questions addressed here: Q3, Q4, Q5.
Questions re-deferred: Q6, Q7 (`@dead` optimization — not needed before `addr` implementation).
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

## Q6 — Internal preservation-region model: deferred

`addr` has no automatic register preservation. It emits a raw instruction sequence that computes the effective address and places it in HL. Whatever other registers the lowering uses internally (DE, AF, etc., depending on the EA shape) are simply used — no push/pop wrapping is emitted by the compiler.

Register management is entirely the programmer's responsibility, as it is for any Z80 instruction sequence. The programmer knows what registers matter at each point in their code and saves them if needed.

`@dead` optimizations are a separate concern that applies to existing compiler-generated preservation scaffolding. That scaffolding currently exists in the transitional typed EA lowering. Designing a preservation-region model for `addr` specifically is premature — `@dead` should be designed against concrete running code, not against a hypothetical model built in advance.

**Q6 is deferred.** It is not a blocker for `addr` implementation.

---

## Q7 — Pragma placement and scope rules for `@dead`: deferred

`@dead` is an optimization feature. It should be designed once `addr` is working and there is real code to optimize against.

**Q7 is deferred.** It is not a blocker for `addr` implementation.

---

## What remains open

| Question | Status | When to resolve |
|---|---|---|
| Q1: `<Type>base.tail` grammar production | Open | Before cast syntax implementation begins |
| Q2: Valid `base` for cast in v1 | Open | Before cast syntax implementation begins |
| Q3: Transitional status of typed EA in `ld` | **Resolved above** | — |
| Q4: Semantic mapping of transitional forms | **Resolved above** | — |
| Q5: Op contracts | **Resolved: deferred** | — |
| Q6: Preservation-region model | **Deferred** — not needed before `addr` |
| Q7: `@dead` placement and scope | **Deferred** — design against real code |
| Q8: Range/grouped case overlap lowering | Open | Before `select` range implementation begins |

---

## Implementation boundary

The resolved answers support a narrow first slice:

1. `addr hl, ea_expr` — parser and lowering; emits raw address-computation sequence into HL, no automatic preservation
2. Transitional typed EA in `ld` — routes through `addr` lowering, not bespoke; word-store-from-HL produces diagnostic
3. Tests — verify `addr` produces correct addresses across EA shapes; verify diagnostic for unsupported word-store case

`@dead`, cast syntax (Q1/Q2), and range case lowering (Q8) are not part of this slice.
