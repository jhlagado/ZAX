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
- Status: landed; monitor follow-up cleanup only
- Why deferred: the feature itself is no longer deferred, but any further
  expansion beyond the accepted v1 shape should wait until post-landing review
  is complete
- Preconditions:
  - post-landing docs/spec cleanup completed
  - any remaining `LANG-02` implementation tickets closed or re-scoped
- Source:
  - GitHub issue `#736 (LANG-02)`
- Notes:
  - landed as additive language work, not as part of an `addr` revival

### `@place` address-of expression
- Status: deferred
- Why deferred: address-of semantics should follow the raw-label/raw-data design, not precede it
- Preconditions:
  - `RAW-01` accepted
  - `RAW-02` and `RAW-03` far enough along to define address-valued forms cleanly
- Source:
  - GitHub issue `#788 (ADDR-EXPR-01)`
- Notes:
  - do not smuggle `@...` back into `move` before raw address semantics are settled
