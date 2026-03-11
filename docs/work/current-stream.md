# Current Stream

## Current language direction

The rolled-back `addr` / ops-first addressing stream is not the active language
direction.

### Current implementation state

- Direct typed `ld` forms remain the active language surface.
- Grouped and ranged `select case` values are implemented.
- Parser/grammar convergence work is active again.
- Typed reinterpretation syntax `<Type>base.tail` now has accepted design and
  grammar/spec docs; implementation is the remaining step.

### Immediate priority

1. Keep the spec, quick guide, and user-facing examples aligned with the
   implemented language.
2. Continue parser/grammar convergence work.
3. Implement typed reinterpretation against the accepted docs set:
   - `docs/design/typed-reinterpretation-cast.md`
   - `docs/spec/zax-grammar.ebnf.md`
   - `docs/spec/zax-spec.md`

### Deferred until re-planned

- any reintroduction of `addr` as a source-language feature
- broad addressing-surface redesign
- retirement of typed EA inside `ld`
