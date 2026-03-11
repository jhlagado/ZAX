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
- Status: deferred
- Why deferred: the feature needs a dedicated grammar and semantics design pass
  before implementation
- Preconditions:
  - a dedicated active design doc for typed reinterpretation
  - valid base forms for v1 decided
  - spec and quick guide stabilized around the current direct typed-`ld`
    surface
- Source:
  - GitHub issue `#736 (LANG-02)`
- Notes:
  - intended as additive language work, not as part of an `addr` revival
