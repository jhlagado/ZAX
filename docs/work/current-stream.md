# Current Stream

## Current language direction

The rolled-back `addr` / ops-first addressing stream is not the active language
direction.

### Current implementation state

- Direct typed `ld` forms remain the active language surface.
- Grouped and ranged `select case` is implemented.
- Parser/grammar convergence work is active again.
- The next additive language design topic is typed reinterpretation syntax
  `<Type>base.tail`.

### Immediate priority

1. Keep the spec, quick guide, and user-facing examples aligned with the
   implemented language.
2. Continue parser/grammar convergence work.
3. Define typed reinterpretation syntax as an additive feature on top of the
   current direct typed-`ld` model.

### Deferred until re-planned

- any reintroduction of `addr` as a source-language feature
- broad addressing-surface redesign
- retirement of typed EA inside `ld`
