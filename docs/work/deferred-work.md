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
- Status: implementation deferred; docs accepted
- Why deferred: implementation should wait for parser/lowering work to be
  scheduled against the accepted docs set
- Preconditions:
  - parser and lowering implementation tickets created from the accepted docs
    set
- Source:
  - GitHub issue `#736 (LANG-02)`
- Notes:
  - intended as additive language work, not as part of an `addr` revival
