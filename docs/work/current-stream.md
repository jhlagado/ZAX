# Current Stream

## Current language direction

The rolled-back `addr` / ops-first addressing stream is not the active language
direction.

### Current implementation state

- Typed storage transfers now prefer `:=`; `move` remains supported as a transitional surface.
- Grouped and ranged `select case` values are implemented.
- Parser/grammar convergence work is active again.
- Typed reinterpretation syntax `<Type>base.tail` is now implemented on
  `main`, with parser and lowering landed.
- Raw data directives and raw-label semantics are implemented on `main`.
- `@path` address-of storage paths are implemented on `main` under
  `rr := @path`.

### Immediate priority

1. Decide the `move` retirement path now that the full active assignment surface
   is covered by `:=`.
2. Resolve the remaining compatibility/historical `move` cases consistently
   with that retirement policy.
3. Continue parser/grammar convergence work.

### Deferred until re-planned

- any reintroduction of `addr` as a source-language feature
- broad addressing-surface redesign
- further addressing-surface redesign beyond the current `move`/typed-path split
