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
- `v02-codegen-reference.md` — single-stop v0.2 codegen reference (what to read, invariants).
- `v02-codegen-worked-examples.md` — worked `.zax` → `.asm` examples for frame/call behavior.
- `v04-planning-track.md` — active v0.4 planning view.
- `v04-priority-queue.md` — active short-form v0.4 queue.
- `return-register-policy.md` — preservation/return matrix detail.
- `arrays.md` — IX + DE/HL lowering guidance and runtime-atom cues.
- `codegen-corpus-workflow.md` — supported workflow and ownership rules for the curated codegen corpus.
- `virtual-reg16-transfer-patterns.md` — supported `rp -> rp` virtual transfer patterns for the current low-level convenience slice.
- `github-backlog-workflow.md` — GitHub issue/label/milestone workflow used as the project backlog system.
- `source-overview.md` — version-neutral source tree and subsystem map for reading the implementation.
- `quality-report.md` — code quality analysis: 19 specific issues rated by severity, with locations, fix directions, and resolution status.
- `refactor-plan.md` — phased improvement plan: completed-work table, 17 active tickets with effort estimates, and per-file size map.

## Content Ownership

- `zax-spec.md`: normative language rules only.
- `v02-codegen-reference.md`: consolidated codegen pointers and invariants.
- `v02-codegen-worked-examples.md`: executable worked examples and expected lowering shapes only.
- `return-register-policy.md`: preservation matrix and HL-preserve swap guidance.
- `zax-dev-playbook.md`: contributor workflow only; must not duplicate planning history, semantic policy, or version-status tracking.
- `source-overview.md`: non-normative architecture map of the current code layout and subsystem boundaries.
- `quality-report.md`: lowering-subsystem quality issues only; update in place as issues are resolved.
- `refactor-plan.md`: lowering-subsystem refactor tickets only; move completed work to the completed table, do not delete.

## Consolidation Rules

- Do not add one-off status/checklist docs when the information belongs in an existing reference.
- Before creating a new doc, justify why existing docs cannot absorb the content; prefer updating `v02-codegen-reference.md`.
- Supporting docs must point back to `zax-spec.md` for language authority.
- Delete stale planning/history/scratch docs rather than keeping archival clutter.
