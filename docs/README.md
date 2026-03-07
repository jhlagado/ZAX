# ZAX Docs Index

This directory is intentionally constrained. Every file below has a unique purpose.

## 1. Canonical (Normative)

- `zax-spec.md`
  - Sole normative language specification.
  - If any other doc conflicts, this file wins.
- `zax-grammar.ebnf.md`
  - Single-file EBNF grammar companion for syntax reference.
  - If grammar and spec diverge, `zax-spec.md` wins.

## 2. Usage Guide (Non-normative)

- `ZAX-quick-guide.md`
  - Practical, chaptered user guide for day-to-day authoring.

## 3. Core Supporting References (Non-normative)

- `zax-dev-playbook.md` — contributor workflow only (branching, review, refactor, merge hygiene); no roadmap history or semantic policy.
- `testing-verification-guide.md` — canonical contributor testing, verification, fixture refresh, and CI expectations reference.
- `v02-codegen-reference.md` — single-stop v0.2 codegen reference (what to read, invariants).
- `v02-codegen-worked-examples.md` — worked `.zax` → `.asm` examples for frame/call behavior.
- `v04-planning-track.md` — v0.4 code-quality planning record.
- `v04-priority-queue.md` — v0.4 queue record.
- `v05-planning-track.md` — active v0.5 implementation plan for the module and layout redesign.
- `return-register-policy.md` — preservation/return matrix detail.
- `arrays.md` — IX + DE/HL lowering guidance and runtime-atom cues.
- `codegen-corpus-workflow.md` — supported workflow and ownership rules for the curated codegen corpus.
- `virtual-reg16-transfer-patterns.md` — supported `rp -> rp` virtual transfer patterns for the current low-level convenience slice.
- `github-backlog-workflow.md` — GitHub issue/label/milestone workflow used as the project backlog system.
- `source-overview.md` — version-neutral source tree and subsystem map for reading the implementation.
- `modules.md` — active v0.5 design anchor for sections, anchors, imports, exports, and merge semantics.
- `architecture-audit-v2.md` — March 2026 structural audit: 22 issues across parser, AST, semantics, lowering, and module layers with a prioritised refactoring sequence.
- `type-system-reform-plan.md` — Detailed implementation plan for three reforms: layout preRoundSize/storageSize separation, EAW Wide addressing pipeline extension, and correct `indirect` EA resolution for non-scalar function parameters.
- `ops-first-addressing-direction.md` — design note exploring `lea`, typed pointer casts, op contracts, dead-register pragmas, and richer `select` cases as a way to reduce addressing magic.
- `ops-first-addressing-decisions.md` — tighter decision record defining `lea`, cast syntax direction, op contracts, dead-register pragmas, and grouped/ranged `select case` as candidate language decisions.

## Content Ownership

- `zax-spec.md`: normative language rules only.
- `v02-codegen-reference.md`: consolidated codegen pointers and invariants.
- `v02-codegen-worked-examples.md`: executable worked examples and expected lowering shapes only.
- `return-register-policy.md`: preservation matrix and HL-preserve swap guidance.
- `zax-dev-playbook.md`: contributor workflow only; must not duplicate planning history, semantic policy, or version-status tracking.
- `testing-verification-guide.md`: single source for contributor verification commands, fixture refresh flow, and CI testing expectations.
- `source-overview.md`: non-normative architecture map of the current code layout and subsystem boundaries.
- `modules.md`: non-normative but authoritative v0.5 design direction for the planned section/module model.
- `v05-planning-track.md`: active staged implementation plan responding to `modules.md`.

## Consolidation Rules

- Do not add one-off status/checklist docs when the information belongs in an existing reference.
- Before creating a new doc, justify why existing docs cannot absorb the content; prefer updating `v02-codegen-reference.md`.
- Supporting docs must point back to `zax-spec.md` for language authority.
- Delete stale planning/history/scratch docs rather than keeping archival clutter.
