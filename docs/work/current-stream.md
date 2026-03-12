# Current Stream

## Current language direction

The rolled-back `addr` / ops-first addressing stream is not the active language
direction.

### Current implementation state

- Direct typed `ld` forms remain the active language surface.
- Grouped and ranged `select case` values are implemented.
- Parser/grammar convergence work is active again.
- Typed reinterpretation syntax `<Type>base.tail` is now implemented on
  `main`, with parser and lowering landed.

### Immediate priority

1. Keep the spec, quick guide, and user-facing examples aligned with the
   implemented language.
2. Continue parser/grammar convergence work.
3. Do a post-landing cleanup pass for `LANG-02`:
   - confirm spec/reference wording matches shipped behavior
   - close or refresh any still-open implementation tickets
   - fold any remaining reviewer guidance back into the docs set

### Deferred until re-planned

- any reintroduction of `addr` as a source-language feature
- broad addressing-surface redesign
- retirement of typed EA inside `ld`
