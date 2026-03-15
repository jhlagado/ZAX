# Current Stream

## Current language direction

The rolled-back `addr` / ops-first addressing stream is not the active language
direction.

### Current implementation state

- Typed storage transfers now use `move` (typed-storage inside `ld` has been removed).
- Grouped and ranged `select case` values are implemented.
- Parser/grammar convergence work is active again.
- Typed reinterpretation syntax `<Type>base.tail` is now implemented on
  `main`, with parser and lowering landed.
- Raw data directives and raw-label semantics are implemented on `main`.
- `@path` address-of storage paths are implemented on `main` under
  `move rr, @path`.

### Immediate priority

1. Keep the spec, quick guide, and user-facing examples aligned with the
   implemented language.
2. Continue parser/grammar convergence work.
3. Review pointer-typing ergonomics against the landed course examples.
4. Keep post-course language work evidence-driven and narrow.

### Deferred until re-planned

- any reintroduction of `addr` as a source-language feature
- broad addressing-surface redesign
- further addressing-surface redesign beyond the current `move`/typed-path split
