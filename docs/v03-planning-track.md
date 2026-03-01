# ZAX v0.3 Planning Track

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

These are the highest-impact language-facing changes because they affect
terminology, examples, docs, and downstream implementation decisions.

1. `#340` — rename integer widths to `int8` / `int16` / `int32` / `int48`

- This is the largest surface-level language migration in the current queue.
- It should land deliberately and in one coordinated pass across spec, grammar,
  examples, tests, and codegen.
- Other syntax-facing future work should assume its final naming, not the
  pre-rename vocabulary.

2. `#376` — make `main(): HL` the status-return convention

- This is a policy and examples pass rather than a deep compiler feature.
- It naturally follows the stabilized return-register model from v0.2.
- It is lower risk than `#340`, but should be applied after terminology is
  settled so examples only move once.

3. `#359` — interrupt function modifier

- This adds a real new language feature and codegen path.
- It should follow the simpler surface-policy updates above.
- It needs grammar, lowering, and epilogue rewrite coverage.

### Track B. Tooling, traces, and corpus workflow

These improve inspection quality and long-term maintainability of generated
artifacts.

1. `#294` — land trace-condition and corpus-workflow changes

- This is the best first tooling slice because it includes a concrete trace
  correctness fix (`jp cc, ...` placeholders) plus explicit corpus workflow
  support.
- It directly improves the quality of generated `.asm` traces.

2. `#303` — expand the curated codegen corpus

- This should follow the workflow cleanup in `#294`.
- Once the workflow is stable, the curated corpus can grow without inventing a
  second process.

3. `#266` — optional external assembler cross-check workflow

- This should stay optional and non-blocking.
- It is useful after the internal trace/corpus workflow is in better shape.

4. `#282` — cosmetic corpus cleanup for terminal fallthrough returns

- This is intentionally low-risk and non-semantic.
- Keep it after the heavier corpus and trace work so fixtures do not churn twice.

5. `#281` — CLI artifact flag ergonomics

- This is useful but not on the critical path.
- It can wait until the corpus and artifact workflow are stable.

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

## 3. Open item that should not be worked unchanged

### `#299` — `@place` diagnostic ticket

This ticket is still open, but it does not fit the current post-v0.2 baseline
cleanly.

- The current v0.2 surface does not treat `@place` as active normative guidance.
- The issue may still be useful if explicit address-of forms are revived, but it
  should not be taken as-is without a fresh design decision first.

Current policy:

- leave `#299` open only as a future placeholder
- do not prioritize it ahead of the concrete v0.3 tracks above
- rewrite it before active implementation if address-of syntax returns to the
  planned surface

## 4. Ordering rule

Unless priorities change, the practical order is:

1. `#340`
2. `#294`
3. `#303`
4. one of the lower-risk policy/capability slices (`#376` or `#446`)
5. then `#359`, `#447`, and the remaining low-priority tooling items

This order keeps the biggest naming change early, improves trace/corpus
workflow next, and leaves niche or optional features until the planning base is
cleaner.

## 5. Planning rules

- Keep the completed v0.2 behavior stable unless a v0.3 change explicitly says
  otherwise.
- Prefer one clearly scoped issue per PR.
- If an old issue still uses stale terminology or stale semantics, rewrite the
  issue before assigning it.
