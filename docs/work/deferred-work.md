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
  - `docs/design/ops-first-addressing-decisions.md` D4
- Notes:
  - builtin `addr` preservation is separate and not blocked by this

### `@dead` pragma surface
- Status: deferred
- Why deferred: preservation machinery should land before optimization controls
- Preconditions:
  - stable compiler-owned preservation model for `addr`
  - generated code paths reviewed in practice
- Source:
  - `docs/design/ops-first-addressing-decisions.md`
- Notes:
  - machinery first, pragma later

### Typed cast surface `<Type>base.tail`
- Status: deferred
- Why deferred: `addr` should land and stabilize before adding typed reinterpretation syntax
- Preconditions:
  - `addr` parser and lowering complete
  - valid base forms for v1 decided
- Source:
  - `docs/design/ops-first-addressing-decisions.md` D3
