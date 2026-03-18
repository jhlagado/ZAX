# Docs Index

This directory is organized by role. New documents should be added only in the correct area.

## Layout

### `docs/spec/`

Authoritative current-language documents.

- `docs/spec/zax-spec.md` — sole normative language specification
- `docs/spec/zax-grammar.ebnf.md` — grammar companion to the spec

If any other document conflicts with `docs/spec/zax-spec.md`, the spec wins.

### `docs/design/`

Active design work and review-target design records.

Current active design docs:

- `docs/design/grammar-parser-convergence-plan.md`
- `docs/design/exact-size-layout-and-indexing.md`
- `docs/design/structured-loop-escape.md`
- `docs/design/named-constants-in-local-initializers.md`
- `docs/design/pointer-typing-ergonomics.md`
- `docs/design/software-stack-helper-library.md`
- `docs/design/assignment-syntax-vs-move.md`
- `docs/design/z80-programming-with-zax.md`

These documents are not normative language authority. They describe current direction, decisions, and unresolved design work.

### `docs/reference/`

Current supporting references for users and contributors.

Includes:

- quick guide
- contributor workflow
- testing and verification flow
- source overview
- current implementation references such as addressing and array lowering notes

These documents may describe current implementation detail, but they do not override the spec.

### `docs/work/`

Current work-in-progress support material.

Use this area for:

- current stream notes
- deferred and backburner items
- short operational documents that are neither normative specs nor active design proposals
- authoring and planning briefs for course-writing streams

### `docs/archive/`

Cold storage for superseded, historical, or version-specific documents.

This includes:

- old version planning tracks
- superseded audits
- retired design anchors
- old version-specific implementation references

Archived documents are retained for context only. They are not current truth.

Recently completed design records now live under:

- `docs/archive/design/`
- `docs/archive/work/`

## Rules

- Do not add new top-level files under `docs/` except `docs/README.md`.
- Every new document must live under exactly one of: `spec`, `design`, `reference`, `work`, `archive`, `course`.
- `spec/` is authoritative.
- `design/` is for active proposals, decisions, and near-term design sequencing.
- `reference/` is for current supporting material.
- `work/` is for operational WIP and deferred items.
- `archive/` is not active guidance.

### `docs/course/`

The current algorithms-and-data-structures volume. Start at
`docs/course/README.md`. Each chapter is paired with compilable example files
under `examples/course/`. This is a second-stage course, not the planned
beginner-first introduction to Z80 programming in ZAX.

### `docs/intro/`

Reserved for the planned beginner-facing "Learn Z80 Programming in ZAX" volume.
That volume is not written yet; see `docs/work/z80-intro-course-plan.md` for the
current planning brief.

## Current priority

Keep the reviewer-facing core as small as possible. The primary review path should be:

- `README.md`
- `docs/spec/zax-spec.md`
- `docs/spec/zax-grammar.ebnf.md`
- `docs/reference/ZAX-quick-guide.md`

Everything else is supporting material for contributors or active design work.

Before adding more design docs, prefer consolidating the current language story in:

- `docs/work/current-stream.md`
- `docs/reference/addressing-model.md`

Active design plans such as `docs/design/grammar-parser-convergence-plan.md` are temporary scaffolding. They should either be absorbed into the privileged spec/reference layer or archived once their work is complete.
