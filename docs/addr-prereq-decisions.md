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

### Summary of clobber sets for transitional forms

| Form | Expansion clobbers | Result |
|---|---|---|
| `ld a, ea` | HL | A |
| `ld ea, a` | HL | memory |
| `ld hl, ea` | HL (result), AF | HL |
| `ld de, ea` | HL | DE |
| `ld bc, ea` | HL | BC |
| `ld ea, hl` | not supported in v1 | — |

---

## Q6 — Internal preservation-region model

**Answer:** The compiler tracks preservation regions explicitly. A preservation region is not an emitted instruction sequence; it is a compiler-internal descriptor attached to a lowering slab.

### Structure

Every compiler-owned lowering slab (initially: `addr hl, ea_expr`, and any transitional sugar forms that route through it) carries:

```
PreservationRegion {
  clobberSet:  Set<RegPair>   // registers the slab will clobber or return
  resultSet:   Set<RegPair>   // subset of clobberSet that carry output values
  preserveSet: Set<RegPair>   // derived: complement of clobberSet within {BC, DE, AF}
}
```

The `preserveSet` is always computed as:

```
preserveSet = { BC, DE, AF } - clobberSet
```

(HL is never in the preserve set because addr always produces its result in HL and therefore always clobbers it.)

### Emission

Before emitting the lowering body, the compiler emits push/pop wrappers for the preserve set:

```
; prologue
for each R in (preserveSet - deadSet):
    push R

; lowering body (addr computation)
...

; epilogue (reverse order)
for each R in reverse(preserveSet - deadSet):
    pop R
```

The `deadSet` is the union of all `@dead` annotations in scope at the point of emission.

### Example

`addr hl, arr[C]` using a register index:

- lowering body: `ld de, base; ld a, C; add e; ld e, a; ld a, d; adc 0; ld d, a; ex de, hl`
- clobberSet: `{HL, DE, AF}`
- resultSet: `{HL}`
- preserveSet: `{BC}`

With `@dead DE` in scope:
- deadSet at this point: `{DE}`
- effective preserve: `{BC} - {DE}` = `{BC}` (DE was not in preserveSet anyway; no change)

With `@dead BC` in scope:
- deadSet: `{BC}`
- effective preserve: `{BC} - {BC}` = `{}` (no push/pop emitted)

The body itself is never rewritten by `@dead`. Only the push/pop framing changes.

### What does and does not have a preservation region

**Has a preservation region:**
- `addr hl, ea_expr` lowering
- transitional typed EA forms in `ld` that route through `addr`

**Does not have a preservation region:**
- user-written instructions (raw Z80 opcodes)
- op body instructions (op preservation is author-owned per D4)
- structured control flow scaffolding (if/while/repeat/select branch wiring)

`@dead` only trims the first category. The second and third categories are untouched.

---

## Q7 — Pragma placement and scope rules for `@dead`

**Answer:**

### Placement

`@dead` is placed as a statement in the instruction stream. It is a pragma line, not an expression or attribute.

Valid placement contexts in v1:

- **Function body** — anywhere in the instruction stream of a `func` or `op` body
- **Block body** — anywhere within the body of `if`, `while`, `repeat`, or `select`

Invalid placement in v1:

- In a `data` section
- In a `type` or `union` declaration
- At module top level (outside any function or block)

### Scope

`@dead reg16` applies from the point of declaration to the end of the enclosing scope, including all nested scopes within it.

Enclosing scope is:
- the function body, if declared at function level
- the current block, if declared within a block (`if`/`while`/`repeat`/`select`)

`@dead DE` declared at function level applies to the entire function body, including any nested blocks within it. `@dead DE` declared within a block applies to the remainder of that block and any nested blocks within it.

There is no "un-dead" mechanism in v1. A register declared dead in an outer scope is treated as dead for the entire remaining lexical scope from that point.

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

HL is not a valid target for `@dead` because `addr` always clobbers HL as its result register. Declaring HL dead would have no valid meaning in this model.

### In op bodies

`@dead` in an op body applies only to compiler-owned preservation regions within the op (e.g., any `addr` lowering inside the op). It does not affect the op's own push/pop statements, which are author-owned per D4.

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

The resolved answers above support a narrow first implementation slice:

1. `addr hl, ea_expr` — parser, lowering, preservation-region emission
2. `@dead reg16` pragma — recognition in instruction stream, scope tracking, dead-set propagation into preservation-region emission
3. Transitional typed EA in `ld` — routes through `addr` lowering, not bespoke; word-store-from-HL case produces diagnostic
4. Tests — verify preservation elision under `@dead`, verify diagnostic for unsupported word-store case

Cast syntax (Q1/Q2) and range case lowering (Q8) are not blocking and are not part of this slice.
