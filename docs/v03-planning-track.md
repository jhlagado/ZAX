# ZAX v0.3 Planning Track

This file is now a historical planning record. Active planning has moved to
`docs/v04-planning-track.md`.

This document is the current post-v0.2 roadmap.

Normative language behavior for shipped versions remains in `docs/zax-spec.md`.
This file is the planning view: it orders future work, notes dependencies, and
marks stale items that should not be worked unchanged.

## 1. Starting point after v0.2

- v0.2 implementation is treated as complete.
- v0.2 closeout note: `docs/v02-closeout-and-followups.md`
- v0.2 codegen reference and invariants: `docs/v02-codegen-reference.md`

The v0.3 queue should therefore be read as future capability, cleanup, and
usability work. It is not unfinished v0.2 verification.

## 2. Active roadmap

### Track A. Language surface and core semantics

These are the language-facing changes that still appear justified after the
first v0.3 triage pass.

There is currently no high-priority language-surface rename or syntax migration
in active scope. The only remaining language-level items are intentionally
parked:

- `#376` — `main(): HL` status-return convention (parked)
- `#359` — interrupt function modifier (parked)

They remain plausible future work, but neither is treated as strictly needed
now.

### Track B. Tooling, traces, and corpus workflow

These improve inspection quality and long-term maintainability of generated
artifacts.

1. `#452` — fix conditional jump placeholders in `.asm` traces

- This is the trace-correctness half of the old bundled `#294` work.
- It should be treated as a narrow correctness task, not mixed with tooling
  workflow changes.

2. `#453` — define the supported codegen-corpus workflow

- This is the workflow/tooling half of the old bundled `#294` work.
- It should make ownership, location, and regeneration rules explicit before
  more corpus growth.

3. `#303` — expand the curated codegen corpus

- This should follow the workflow cleanup in `#453`.
- Once the workflow is stable, the curated corpus can grow without inventing a
  second process.

### Track C. Low-level capability expansion

These are explicit future capability additions, not retroactive v0.2 gaps.

1. `#446` — virtual 16-bit transfer patterns

- This is the next deliberate low-level convenience feature.
- It should remain narrow and explicit, not turn into a broad pseudo-instruction
  system in the first slice.

2. `#447` — IXH / IXL / IYH / IYL support

- This is a useful low-level extension, but it is more niche and easier to get
  wrong.
- It should follow the virtual transfer work rather than lead the queue.

## 3. Closed by v0.3 triage

These items were reviewed and explicitly rejected as current work:

- `#340` — integer-width rename
- `#266` — optional external assembler cross-check workflow
- `#281` — CLI artifact flag ergonomics follow-up
- `#282` — cosmetic terminal-fallthrough cleanup
- `#299` — `@place` diagnostic ticket (not relevant while `@place` is not an
  active planned surface)

They should not be silently reintroduced. If one returns, it should come back as
a newly justified future issue, not as assumed carry-over work.

## 4. Ordering rule

Unless priorities change, the practical order is:

1. `#452`
2. `#453`
3. `#303`
4. `#446`
5. `#447`

Leave `#376` and `#359` parked unless priorities change.

This order handles the concrete trace issue first, then the workflow around the
corpus, then any corpus expansion, and only then the optional low-level
capability work.

## 5. Planning rules

- Keep the completed v0.2 behavior stable unless a v0.3 change explicitly says
  otherwise.
- Prefer one clearly scoped issue per PR.
- If an old issue still uses stale terminology or stale semantics, rewrite the
  issue before assigning it.
