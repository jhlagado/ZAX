# ZAX v0.2 Done Checklist

This checklist is the release-closeout gate for v0.2.

Normative language behavior is defined by `docs/zax-spec.md`.
This file records completion evidence and signoff state.

Status key:

- `[x]` complete
- `[ ]` pending

## 1. Conformance

- `[x]` v0.2 migration semantics implemented and represented in tests.
- `[x]` Runtime-atom budget and direct call-site `ea`/`(ea)` constraints enforced.
- `[x]` Typed/raw call-boundary diagnostics and policy modes implemented.
- `[ ]` Appendix-C-to-implementation evidence links recorded in this file.

Evidence links:

- Migration/conformance tranche: [#236](https://github.com/jhlagado/ZAX/pull/236) .. [#255](https://github.com/jhlagado/ZAX/pull/255)
- Runtime-atom and addressing semantics: [#248](https://github.com/jhlagado/ZAX/pull/248)
- Typed/raw call warning mode: [#255](https://github.com/jhlagado/ZAX/pull/255)

## 2. CI and Test Evidence

- `[x]` `main` green on ubuntu/macos/windows.
- `[x]` High-risk matrix suites exist for lowering/diagnostics.
- `[ ]` Determinism evidence captured (repeat run equality for emitted artifacts).
- `[ ]` `examples/*.zax` acceptance evidence captured across CI matrix.

Evidence links:

- Representative green CI run (latest merged tranche): [Actions run 22019661156](https://github.com/jhlagado/ZAX/actions/runs/22019661156)
- Matrix test anchors:
  - `test/pr264_runtime_atom_budget_matrix.test.ts`
  - `test/pr272_runtime_affine_index_offset.test.ts`
  - `test/pr271_op_stack_policy_alignment.test.ts`
  - `test/pr278_raw_call_typed_target_warning.test.ts`

## 3. CLI and Docs Consistency

- `[x]` New warning/policy flags are implemented in CLI:
  - `--op-stack-policy`
  - `--type-padding-warn`
  - `--raw-typed-call-warn`
- `[ ]` Quick guide, playbook, and status snapshot wording are aligned.
- `[ ]` `docs/zax-dev-playbook.md` stale "in progress" sections reconciled.

Evidence links:

- CLI stack policy mode: [#246](https://github.com/jhlagado/ZAX/pull/246)
- CLI stack policy flag contract: [#247](https://github.com/jhlagado/ZAX/pull/247)
- Type padding warning mode: [#250](https://github.com/jhlagado/ZAX/pull/250)
- Raw typed call warning mode: [#255](https://github.com/jhlagado/ZAX/pull/255)

## 4. Diagnostics Stability

- `[ ]` Core v0.2 migration diagnostics confirmed stable:
  - enum qualification
  - `arr[HL]` vs `arr[(HL)]`
  - runtime-atom budget
  - call-boundary warnings
- `[ ]` No legacy "subset/PR" wording remains in user-facing diagnostics.

Evidence links:

- Add test files and grep/audit links here.

## 5. Scope Freeze and Declaration

- `[ ]` Closeout-only policy confirmed for final v0.2 PRs.
- `[ ]` Final v0.2 completion note published.
- `[ ]` v0.3 planning track opened after v0.2 declaration.

## 6. Out of Scope for v0.2

These are intentionally deferred and do not block v0.2 completion:

- source-interleaved listing quality upgrade
- Debug80 integration
- explicit `^` dereference / `@` address-of operators
- typed-pointer and typed-register-field extensions
