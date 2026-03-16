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

1. Remove `move` directly from parser/lowering/docs now that the active
   assignment surface is fully covered by `:=`.
2. Delete the remaining compatibility-only `move` subset as part of that
   removal.
3. Continue parser/grammar convergence work.

### Deferred until re-planned

- any reintroduction of `addr` as a source-language feature
- broad addressing-surface redesign
- further addressing-surface redesign beyond the current `move`/typed-path split
