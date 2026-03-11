# Deferred Work

This file records deferred and backburner items that are intentionally not part of the current implementation stream.

## Format

For each item record:
- Status
- Why deferred
- Preconditions
- Source
- Notes

## Deferred Items

### User-authored op contracts
- Status: deferred
- Why deferred: no register-effect analysis mechanism exists for arbitrary op bodies
- Preconditions:
  - per-instruction effect model
  - verifier scope definition
  - failure behavior when verification is impossible
- Source:
  - historical addressing-design notes in `docs/archive/design/`
- Notes:
  - this is separate from current parser/spec cleanup work

### Typed cast surface `<Type>base.tail`
- Status: implementation deferred; design active
- Why deferred: implementation should wait until the active design doc is
  accepted and the grammar/spec deltas are written
- Preconditions:
  - `docs/design/typed-reinterpretation-cast.md` accepted as the active design
    basis
  - grammar form added to `docs/spec/zax-grammar.ebnf.md`
  - semantic rules added to `docs/spec/zax-spec.md`
- Source:
  - GitHub issue `#736 (LANG-02)`
- Notes:
  - intended as additive language work, not as part of an `addr` revival
