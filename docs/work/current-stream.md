# Current Stream

## Addr-first transition

This is the active language and compiler stream currently staged for planning.

### Design anchors

- `docs/design/ops-first-addressing-direction.md`
- `docs/design/ops-first-addressing-decisions.md`
- `docs/design/addr-prereq-decisions.md`

### Core settled decisions

- `addr` is the primary typed-addressing model.
- `addr` is a ZAX keyword, not a mnemonic-style opcode.
- `addr hl, ea_expr` is the v1 surface.
- `addr` preserves everything except `HL`.
- direct typed EA inside `ld` is transitional only and must route through `addr`.
- packed layout is the semantic default; pow2 stride is a codegen choice, not a storage invariant.
- user-authored op contracts remain deferred.

### Required implementation sequence

1. Add parser and lowering support for `addr hl, ea_expr`.
2. Implement compiler-owned preservation machinery for `addr` so it preserves everything except `HL`.
3. Route transitional typed-EA-in-`ld` forms through `addr` instead of bespoke lowering.
4. Emit explicit diagnostics for unsupported transitional forms such as word store from `HL` via typed EA.
5. Stabilize generated code and corpus expectations around the new `addr` center.
6. Only after that, consider later features:
   - `@dead` pragma surface
   - `<Type>base.tail` typed reinterpretation syntax
   - grouped and ranged `select case`
   - eventual retirement of typed EA inside `ld`

### Non-goals for the first slice

- no user-authored op contract system
- no `addr` destinations other than `HL`
- no typed-register model
- no automatic retirement of transitional `ld` sugar in the same first slice
