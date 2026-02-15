# v0.2 Codegen Golden Corpus

This document defines how the tiered lowering corpus works and how to extend it safely.

## Purpose

The corpus provides deterministic, human-reviewable evidence that ZAX lowering emits expected
code across increasing complexity:

- basic control flow
- intermediate indexing/lowering paths
- advanced typed-call and value/return-channel behavior

## Current Tier Cases

- basic: `test/fixtures/corpus/basic_control_flow.zax`
- intermediate: `test/fixtures/corpus/intermediate_indexing.zax`
- advanced: `test/fixtures/corpus/advanced_typed_calls.zax`
- negative runtime-atom case: `test/fixtures/corpus/invalid_runtime_atom_budget.zax`

Golden snapshots:

- `test/fixtures/corpus/golden/basic_control_flow.asm`
- `test/fixtures/corpus/golden/intermediate_indexing.asm`
- `test/fixtures/corpus/golden/advanced_typed_calls.asm`

Test harness:

- `test/pr282_tiered_golden_corpus.test.ts`

## Update Workflow

When changing lowering behavior intentionally:

1. Update/add corpus fixture(s).
2. Regenerate the affected `.asm` golden snapshot(s).
3. Keep one focused rationale per changed golden in the PR description.
4. Run full local gates (`format`, `typecheck`, `test`) before push.

## Anti-Overfitting Rules

- Prefer small fixtures with one main intent each.
- Do not lock down volatile, non-semantic incidental output unless it is part of the deterministic
  contract.
- Add a negative case for each new constrained behavior where practical.
- If a golden changes for unrelated reasons, split the refactor from semantic changes.
