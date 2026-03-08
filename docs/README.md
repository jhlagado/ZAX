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
- `docs/design/ops-first-addressing-direction.md`
- `docs/design/ops-first-addressing-decisions.md`
- `docs/design/grammar-parser-convergence-plan.md`
- `docs/design/type-system-reform-plan.md`

These documents are not normative language authority. They describe current direction and unresolved design work.

### `docs/reference/`
Current supporting references for users and contributors.

Includes:
- quick guide
- contributor workflow
- testing/verification flow
- source overview
- current implementation references such as addressing and array lowering notes

These documents may describe current implementation detail, but they do not override the spec.

### `docs/work/`
Current work-in-progress support material.

Use this area for:
- deferred/backburner items
- current stream notes
- short operational documents that are neither normative specs nor active design proposals

### `docs/archive/`
Cold storage for superseded, historical, or version-specific documents.

This includes:
- old version planning tracks
- superseded audits
- retired design anchors
- old version-specific implementation references

Archived documents are retained for context only. They are not current truth.

## Rules

- Do not add new top-level files under `docs/` except `docs/README.md`.
- Every new document must live under exactly one of: `spec`, `design`, `reference`, `work`, `archive`.
- `spec/` is authoritative.
- `design/` is for active proposals and decisions.
- `reference/` is for current supporting material.
- `work/` is for operational WIP and deferred items.
- `archive/` is not active guidance.

## Current priority

Before adding more design docs, prefer consolidating active work into the existing files under `docs/design/` and `docs/work/`.
