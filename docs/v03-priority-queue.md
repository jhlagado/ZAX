# v0.3 Priority Queue

This file is now a historical queue record. Active planning has moved to
`docs/v04-priority-queue.md`.

This is the explicit current developer work order for post-v0.2 work.

Use this as the short operational queue. The broader rationale remains in
`docs/v03-planning-track.md`.

## Active order

### 1. `#452` — Fix conditional jump placeholders in `.asm` traces

Why first:

- It is a narrow trace-correctness fix.
- It directly improves generated `.asm` review quality.
- It is the cleanest next task because it is a focused correctness issue, not a
  broader feature expansion.

### 2. `#453` — Define supported codegen-corpus workflow

Why second:

- The corpus should have an explicit supported workflow before it expands further.
- This is process/tooling cleanup that reduces later ambiguity.

### 3. `#303` — Expand the curated codegen corpus

Why third:

- It should follow the workflow definition in `#453`.
- Once ownership and regeneration are explicit, the corpus can expand without
  creating avoidable process drift.

### 4. `#446` — Add virtual 16-bit transfer patterns

Why fourth:

- This is future low-level capability, not a current correctness fix.
- It is now deliberately narrow:
  - exhaustive `rp -> rp` transfer definitions
  - direct non-destructive 8-bit register moves only
  - no stack traffic
  - no pair-exchange shortcut standing in for a copy

### 5. `#447` — Support direct IXH/IXL/IYH/IYL forms

Why fifth:

- This is also future low-level capability, but more niche and easier to get
  wrong than `#446`.
- It is now deliberately narrow:
  - exhaustive accepted set for this slice
  - only directly encodable undocumented Z80 forms that really exist
  - source-side and destination-side forms where they truly exist
  - no invented forms
  - no shuttle-based simulation in this slice

## Parked

These stay open, but they are not current priorities:

- `#376` — `main(): HL` status-return convention
- `#359` — interrupt function modifier

Do not pull them into active work unless priorities change.

## Closed by triage

These were explicitly reviewed and rejected as current work:

- `#340`
- `#294` (split into `#452` and `#453`)
- `#266`
- `#281`
- `#282`
- `#299`

Do not silently reintroduce them as implied backlog.
