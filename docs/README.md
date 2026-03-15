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
- Every new document must live under exactly one of: `spec`, `design`, `reference`, `work`, `archive`.
- `spec/` is authoritative.
- `design/` is for active proposals, decisions, and near-term design sequencing.
- `reference/` is for current supporting material.
- `work/` is for operational WIP and deferred items.
- `archive/` is not active guidance.

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
