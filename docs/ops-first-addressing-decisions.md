# Ops-First Addressing Decisions

**Date:** 2026-03-07
**Status:** Draft decision record for review
**Purpose:** Narrow the exploratory direction in `docs/ops-first-addressing-direction.md` into concrete language decisions and explicit non-goals.

This document is not an implementation plan. It exists to decide the language boundary before any implementation backlog is created.

---

## 1. Problem Statement

ZAX currently has a good semantic EA model, but too much tactical code-generation policy is owned by the compiler.

The compiler is currently responsible for both:

1. computing effective addresses from typed EA expressions
2. deciding how loads/stores should preserve registers and materialize those addresses

The first responsibility belongs in the compiler.
The second is where complexity, hidden behavior, and lowering bugs accumulate.

The purpose of this decision record is to make that split explicit.

---

## 2. Decisions

### D1. Introduce `lea` as a first-class primitive

ZAX should introduce `lea` with this initial surface:

```zax
lea hl, ea_expr
```

Meaning:

> Compute the effective address of `ea_expr` into `HL`.

`lea` is **HL-only in v1**.

Rationale:

- this keeps the feature semantic, not tactical
- it avoids reintroducing register-allocation/preservation policy into the feature itself
- it provides a clean boundary primitive for typed addressing

Explicitly not included in v1:

- `lea de, ...`
- `lea bc, ...`
- arbitrary destination pairs

---

### D2. Direct EA load/store forms become normative sugar over `lea`

Forms such as:

```zax
ld a, arr[C]
ld arr[C], a
ld de, table[idx]
```

may remain in the language, but they should no longer be treated as independent compiler-owned special cases.

They should be defined as normative sugar over:

1. `lea hl, ...`
2. a fixed access strategy for the relevant load/store form

Rationale:

- keeps current ergonomic surface
- stops the sugary forms from owning separate hidden lowering semantics
- makes the explicit model (`lea + instructions` or `lea + ops`) the real language center

This is a language-design decision, not merely an implementation preference.

---

### D3. Typed pointer reinterpretation uses angle-bracket cast syntax

ZAX should support explicit typed reinterpretation at the access site using:

```zax
<Type>base.tail
```

Examples:

```zax
lea hl, <Sprite>hl.flags
ld a, <Sprite>hl.flags
lea hl, <Outer>hl.inner.flags
```

Meaning:

> Interpret `base` as the address of a `Type`, then apply the normal EA tail (`.field`, `[index]`, nested tails).

Rationale:

- explicit and local
- avoids overloading `()` further, which are already heavily used in Z80 syntax and grouping
- avoids grammar-clever overlay forms like `Sprite[HL]`
- does not imply typed registers; typing is applied only at point of access

Boundary for v1:

- cast applies to a base address expression
- the result participates in normal EA tail parsing
- no persistent “typed register” state is introduced

This needs a precise grammar production before implementation.

---

### D4. Ops get verified return/clobber contracts

Ops should adopt the same general contract surface as functions:

```zax
op add16(dst: DE, src: reg16): DE
  ex de, hl
  add hl, src
  ex de, hl
end
```

Initial rule:

- registers listed after `:` are allowed to change and/or carry results
- all other registers are required to be preserved
- `AF` is the coarse flags/clobber surface

Examples:

```zax
op cmp8(lhs: A, rhs: reg8): AF
  cp rhs
end
```

Important rule:

- the compiler **verifies** the contract
- the compiler does **not** silently insert save/restore code to satisfy it

Rationale:

- makes op interfaces legible
- fits ZAX’s machine-close philosophy
- avoids compiler-owned tactical policy creeping back into ops

---

### D5. Dead-register pragmas are advisory optimization metadata

ZAX should support dead-register metadata scoped to:

- functions
- blocks

Examples:

```zax
func render(): HL
  @dead DE
  ...
end
```

```zax
repeat
  @dead DE
  lea hl, arr[C]
  ld a, (hl)
until Z
```

Semantics:

- pragmas do not change program meaning
- they only permit the compiler to skip unnecessary preservation work
- the compiler may ignore them

Rationale:

- correct use of pragmas is advisory, not semantic
- this gives optimization control without creating a liveness sublanguage

---

### D6. `select case` gains ranges and grouped values

ZAX should support:

```zax
select A
  case 'A'..'Z', '_'
    ...
  case '0'..'9'
    ...
end
```

Allowed forms:

- single value
- inclusive range `a..b`
- comma-separated lists mixing both

Minimal intended grammar shape:

- `case_item = imm_expr | imm_expr ".." imm_expr`
- `case_clause = "case" case_item ("," case_item)*`

Rationale:

- common for ASCII classification and protocol dispatch
- small grammar cost
- high ergonomic payoff

---

## 3. Non-Goals

The following are explicitly **not** part of this direction:

### N1. No parser-generator rewrite

The hand-written parser remains the intended parser architecture.

### N2. No typed registers

Registers remain raw machine registers.
Typing is applied only at point of access or interpretation.

### N3. No generic pointer types in this direction

This direction does not introduce `ptr<T>`.
Typed reinterpretation is done with cast syntax instead.

### N4. No automatic compiler save/restore for op contracts

Op contracts are verified, not automatically satisfied by inserted code.

### N5. No removal of existing EA sugar in the first pass

Existing forms like `ld a, arr[C]` may remain.
The shift is conceptual and semantic: they become sugar over the explicit `lea` model.

### N6. No mandatory liveness analysis

Dead-register pragmas are advisory.
The compiler is not required to prove or infer full liveness in order to use this model.

---

## 4. Required Spec Questions Before Implementation

These questions need explicit answers before any implementation backlog is created:

1. What is the exact grammar production for `<Type>base.tail`?
2. What counts as a valid `base` for casted EA interpretation in v1?
3. What precise sugar definition maps direct EA loads/stores onto `lea`?
4. What exact register/flag contract model do ops use in v1?
5. What pragma placement rules apply to `@dead`?
6. How do range/grouped `case` values lower in the presence of overlapping clauses?

---

## 5. Recommended First Implementation Boundary

If this direction is accepted, the safest first implementation boundary is:

1. add `lea hl, ea`
2. define direct EA load/store sugar over `lea`
3. leave existing op semantics unchanged
4. add op contracts in a separate step
5. add dead-register pragmas after `lea` exists
6. add cast syntax only once `lea` boundary is stable

This keeps the first implementation step focused and prevents the whole idea from becoming an entangled “big bang” redesign.

---

## 6. Bottom Line

This direction keeps ZAX aligned with its strongest qualities:

- explicit
- structured
- machine-close
- programmable through hygienic ops

The key decision is not “more abstraction” versus “less abstraction”.

The real decision is:

> semantic address computation belongs in the compiler; tactical memory-access policy should increasingly belong to explicit source constructs and ops.

That is the boundary this design record adopts.
