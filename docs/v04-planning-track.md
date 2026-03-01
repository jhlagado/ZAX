# ZAX v0.4 Planning Track

This document is the active planning view after v0.3 closeout.

Normative shipped behavior remains in `docs/zax-spec.md`. This file is the
future-work planning layer only.

## 1. Starting point after v0.3

- v0.3 implementation is treated as complete.
- v0.3 closeout note: `docs/v03-closeout-and-followups.md`
- v0.3 workflow additions now part of the established project surface:
  - `docs/codegen-corpus-workflow.md`
  - `docs/virtual-reg16-transfer-patterns.md`

## 2. Current v0.4 stance

There is no committed active v0.4 feature queue yet.

The immediate v0.4 job is to decide which future changes are actually justified
before reopening feature work. New work should therefore start from explicit
justification, not from assumed backlog carry-over.

## 3. Planning rules for v0.4

- Start from a fresh justification for each proposed feature.
- Prefer small, explicit slices with one issue per PR.
- Treat old plans as historical context only unless they are deliberately
  reissued as current v0.4 work.
- Do not silently convert completed v0.3 work into continuing “phase two” work
  without a new scope decision.

## 4. How to activate a v0.4 item

Before a feature enters the active queue:

1. define the user-facing value
2. define the exact supported scope
3. define what remains explicitly unsupported
4. define the acceptance checks
5. add it to `docs/v04-priority-queue.md`

Until then, it is only a candidate idea, not active implementation work.
