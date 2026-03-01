# v0.4 Priority Queue

This is the active short-form developer queue for the v0.4 era.

v0.4 is focused on code quality and maintainability only.

## Active order

### 1. Codebase audit of current compiler behavior

Issue:

- `#465`

Why first:

- the current implementation needs to be understood before it is restructured
- stale, duplicated, or obsolete paths need to be identified before refactors
- this is the foundation for all later v0.4 cleanup

Priority focus:

- `src/lowering/emit.ts`
- places where spec evolution may have left old behavior behind

### 2. Refactoring and modularization of high-risk areas

Issue:

- `#466`

Why second:

- once current behavior is mapped, large files can be broken down safely
- refactoring should follow understanding, not precede it
- the main target is better structure without semantic drift

### 3. Documentation consolidation

Issue:

- `#467`

Why third:

- the docs should reflect the cleaned-up implementation structure
- overlapping docs should be merged or clarified while the code is being
  understood and reorganized

### 4. Coverage gap audit and targeted test expansion

Issue:

- `#468`

Why fourth:

- test gaps should be closed around the areas identified during the audit
- stronger regression coverage makes deeper cleanup safer

### 5. Reassess future syntax work only after the code-quality pass

Why last:

- syntax changes are intentionally deferred until the compiler internals are in
  better shape
- this is a reassessment gate, not active feature work yet

## Activation rule

- Break each queue item into explicit issues before developer implementation.
- Prefer one narrowly scoped cleanup/refactor issue per PR.
- Keep behavior-preserving cleanup separate from intended semantic changes.

## Boundary

- v0.3 is complete and closed out in `docs/v03-closeout-and-followups.md`.
- v0.4 starts as a code-quality cycle, not a feature-expansion cycle.
