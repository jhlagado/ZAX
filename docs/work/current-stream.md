# Current Stream

## Addressing rollback checkpoint

The `addr` implementation stream has been rolled back from code.

### Current implementation state

- The `addr` parser/lowering work is not active in the compiler.
- Direct typed `ld` forms remain the working language surface.
- The `addr` design remains recorded in `docs/design/` as proposal material, not current implemented behavior.

### Design anchors retained for later review

- `docs/design/ops-first-addressing-direction.md`
- `docs/design/ops-first-addressing-decisions.md`
- `docs/design/addr-prereq-decisions.md`

### Immediate priority

1. Restore and keep the language-tour and user-facing examples aligned with the direct typed `ld` surface.
2. Keep the current spec/reference docs aligned with implemented behavior.
3. Reassess whether `addr` should return later as:
   - an explicit expert construct,
   - an internal lowering primitive,
   - or an address-of expression form such as `@place`.

### Deferred until re-planned

- `addr` parser/lowering reintroduction
- `@dead` pragma surface
- `<Type>base.tail` typed reinterpretation syntax
- grouped and ranged `select case`
- retirement of typed EA inside `ld`
