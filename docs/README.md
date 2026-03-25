# Docs Index

This directory holds reference, specification, design, and internal work documents.

Learning content (course chapters and examples) lives under [`learning/`](../learning/README.md).

---

## Layout

### `docs/spec/`

Normative language documents.

- [`docs/spec/zax-spec.md`](spec/zax-spec.md) — the language specification; wins any conflict with other docs
- [`docs/spec/zax-grammar.ebnf.md`](spec/zax-grammar.ebnf.md) — grammar companion to the spec

### `docs/reference/`

Current user- and contributor-facing references.

- [`docs/reference/ZAX-quick-guide.md`](reference/ZAX-quick-guide.md) — full language surface in practical terms
- [`docs/reference/zax-dev-playbook.md`](reference/zax-dev-playbook.md) — contributor workflow and review hygiene
- [`docs/reference/testing-verification-guide.md`](reference/testing-verification-guide.md) — testing and verification flow
- [`docs/reference/source-overview.md`](reference/source-overview.md) — compiler source structure

These do not override the spec.

### `docs/design/`

Active design work and decisions.

Current active docs:

- `docs/design/exact-size-layout-and-indexing.md`
- `docs/design/grammar-parser-convergence-plan.md`
- `docs/design/named-constants-in-local-initializers.md`
- `docs/design/pointer-typing-ergonomics.md`
- `docs/design/software-stack-helper-library.md`
- `docs/design/z80-programming-with-zax.md`
- `docs/design/zax-algorithms-course.md`

These describe current direction and decisions. Landed or superseded design notes belong under `docs/archive/design/`.

### `docs/work/`

Internal operational material: authoring plans, writing standards, current-stream notes.

- [`docs/work/course-writing-standard.md`](work/course-writing-standard.md) — editorial gate for all course prose
- [`docs/work/course-authoring-plan.md`](work/course-authoring-plan.md) — writer brief for Part 2
- [`docs/work/intro-authoring-plan.md`](work/intro-authoring-plan.md) — writer brief for Part 1
- [`docs/work/z80-intro-course-plan.md`](work/z80-intro-course-plan.md) — Part 1 chapter scope and structure

### `docs/archive/`

Cold storage for superseded, historical, or version-specific documents. Not current guidance.

---

## Rules

- Do not add new top-level files under `docs/` except `docs/README.md`.
- Every new document belongs under exactly one of: `spec`, `design`, `reference`, `work`, `archive`.
- `spec/` is authoritative.
- `design/` is for active proposals and decisions.
- `reference/` is for current supporting material.
- `work/` is for operational WIP, deferred items, and authoring briefs.
- `archive/` is retained for context only.
