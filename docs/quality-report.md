# ZAX Lowering — Code Quality Report

> **Scope**: `src/lowering/` subsystem. Reflects current state on `main` after PRs #513–#565.
> **Last updated**: 2026-03-03

---

## Summary

| Severity | Total | Resolved | Open |
|----------|-------|----------|------|
| Critical | 2 | 2 | 0 |
| High | 7 | 7 | 0 |
| Medium | 7 | 1 | 6 |
| Low | 3 | 1 | 2 |
| **Total** | **19** | **11** | **8** |

---

## Issues

### QR-1 · `emit.ts` God-File Size ✅ Resolved
**Severity**: Critical
**Location**: `src/lowering/emit.ts`
**Original**: 3,729 lines — single file containing all lowering logic
**Resolution**: Decomposed via PRs #513–#565. Current size: **793 lines** (hard cap ≤ 1,000 met).
The file now contains only: imports, module-level state, `emitInstr` dispatch, helper wiring, and top-level orchestration calls.

---

### QR-2 · Untyped Context Parameter in `ldLowering.ts` ✅ Resolved
**Severity**: High
**Location**: `src/lowering/ldLowering.ts`
**Original**: Context object passed as `ctx: any`; type information lost at the module boundary.
**Resolution** (PR #560): `LdLoweringContext` interface defined and enforced throughout `ldLowering.ts`. Zero `any` remains in that file.

---

### QR-3 · Diagnostic Helpers Inlined in `emit.ts` ✅ Resolved
**Severity**: High
**Location**: `src/lowering/emit.ts` (original)
**Original**: `diag`, `diagAt`, `diagAtWithId`, `warnAt` duplicated as inline closures inside `emit.ts`.
**Resolution**: Extracted to `src/lowering/loweringDiagnostics.ts`; all callers import from there. Five helpers exported: `diag`, `diagAt`, `diagAtWithId`, `diagAtWithSeverityAndId`, `warnAt`.

---

### QR-4 · SP-Tracking Complexity (Partially Resolved)
**Severity**: High
**Location**: `src/lowering/functionLowering.ts`, `emit.ts`
**Original**: `trackedSpRef` was a mutable-proxy getter/setter passed between call sites; hard to follow SP drift reasoning.
**Partial resolution** (PR #564): Replaced with a `bindSpTracking` callback pattern — the consumer registers a typed callback rather than manipulating a shared ref. Logic is clearer but the SP-delta bookkeeping across nested call frames remains non-trivial.
**Remaining**: Extract SP-delta accounting into a dedicated `spTracking.ts` helper with its own invariant documentation.

---

### QR-5 · No Unit Test Coverage for Lowering
**Severity**: High
**Location**: `src/lowering/` — no `*.test.ts` files
**Detail**: All correctness verification is end-to-end through integration tests. Regressions in individual helpers (e.g., `opStackAnalysis`, `eaResolution`, `ldLowering`) are not caught until full-program compilation. Each extracted module is a natural unit-test target.
**Fix**: Add `*.test.ts` alongside each extracted helper module; start with pure functions such as `opStackAnalysis.ts` and `typeResolution.ts`.

---

### QR-6 · Opaque Identifier `resolvedScalarKind` ✅ Resolved
**Severity**: Medium
**Location**: `src/lowering/ldLowering.ts`
**Original**: Context field named `resolvedScalarKind` — ambiguous subject (resolved _by_ what? _to_ what?).
**Resolution** (PR #565): Renamed to `scalarKindOfResolution`, matching the "noun-of-noun" convention used elsewhere in the lowering context vocabulary.

---

### QR-7 · Untyped Path Traversal in `opSubstitution.ts`
**Severity**: Medium
**Location**: `src/lowering/opSubstitution.ts`, lines 32–36, 93–97
**Detail**:
```typescript
const substituteOffsetofPath = (path: any): any => ({
  steps: path.steps.map((step: any) => ...),
});
```
The `OffsetofPath` AST node shape is known; `path` and `step` should be typed against the AST definition. The `any` here bypasses exhaustiveness checks on the step discriminant.
**Fix**: Import and use the concrete `OffsetofPathNode` / step union type from `ast.js`.

---

### QR-8 · `summarizeOpStackEffect` Inlined in `emit.ts` ✅ Resolved
**Severity**: High
**Location**: `src/lowering/emit.ts` (original)
**Original**: Complex op-stack summary logic (≈80 lines) inlined as a closure, not independently testable.
**Resolution** (PR #563): Extracted to `src/lowering/opStackAnalysis.ts` (109 lines). Exports `createOpStackAnalysisHelpers` and the `OpStackSummary` type. Context is `{ opsByName: Map<string, OpDeclNode[]> }`.

---

### QR-9 · Untyped Matcher Parameter in `functionCallLowering.ts`
**Severity**: Medium
**Location**: `src/lowering/functionCallLowering.ts`, line 93
**Detail**:
```typescript
matcherMatchesOperand: (matcher: any, operand: AsmOperandNode) => boolean;
```
`matcher` refers to the operand-pattern discriminated union from the op-declaration AST. Its type is known and the `any` should be replaced.
**Fix**: Identify the correct AST matcher type (likely `OpMatcherNode` or equivalent), import it, and replace `any`.

---

### QR-10 · Secondary Files Exceed Comfortable Read Size
**Severity**: Medium
**Location**: `src/lowering/ldLowering.ts` (894 lines), `programLowering.ts` (821 lines), `functionLowering.ts` (772 lines)
**Detail**: The emit.ts hard cap (≤ 1,000 lines) is met, but three secondary files are approaching or exceeding a comfortable single-session review size. They are coherent in scope but each contains multiple logical sub-concerns.
**Fix**: No immediate action required; track as opportunistic splits. `ldLowering.ts` is the best candidate (load/store addressing modes could be separated from scalar arithmetic).

---

### QR-11 · Error Recovery Stops at First Failure
**Severity**: Medium
**Location**: `src/lowering/emit.ts` — `emitInstr` and all callers
**Detail**: When `emitInstr` encounters an unhandled node kind it pushes a diagnostic and returns `null`, but control flow thereafter is undefined: callers assume success and may propagate the null, generating cascading spurious errors. There is no "poison" state or barrier that suppresses downstream diagnostics after a known upstream failure.
**Fix**: Introduce a session-scoped error flag; once set, suppress further diagnostics from downstream passes. Alternatively emit a sentinel NOP and continue cleanly.

---

### QR-12 · Fixup-Phase Coupling to Section Layout
**Severity**: Medium
**Location**: `src/lowering/fixupEmission.ts`, `sectionLayout.ts`
**Detail**: The fixup phase (backpatching unresolved symbol references) accesses section layout arrays directly rather than through a narrow interface. Changes to section representation require touching both files.
**Fix**: Define a read-only `SectionView` interface that `fixupEmission.ts` consumes; `sectionLayout.ts` implements it.

---

### QR-13 · `inputAssets.ts` Coupling
**Severity**: Low
**Location**: `src/lowering/inputAssets.ts` (154 lines)
**Detail**: `inputAssets.ts` both validates and transforms the incoming `ProgramNode`/`CompileEnv` into lowering-ready form. These two concerns (validation, transformation) are co-located, making either hard to test in isolation.
**Fix**: Separate validation guards from structural transformations; put guards in a `validateInputs` function with a clear boolean/diagnostic return.

---

### QR-14 · No Integration-Test Corpus for Lowering Edge Cases
**Severity**: Low
**Location**: `tests/` (missing coverage)
**Detail**: The codegen corpus (`codegen-corpus-workflow.md`) focuses on worked examples of correct programs. Edge cases for the lowering subsystem — illegal addressing modes, out-of-range immediates, stack mismatches — have no dedicated test fixtures.
**Fix**: Add a `tests/lowering-errors/` suite with `.zax` programs expected to produce specific `QR`-class diagnostics, checked against `DiagnosticIds`.

---

### QR-15 · No CI Performance Baseline
**Severity**: Low
**Location**: CI pipeline
**Detail**: Compilation time is not measured in CI. As the lowering subsystem grows, regressions in per-file throughput will not be caught until they are noticeable in developer workflow.
**Fix**: Add a lightweight benchmark step: compile the largest fixture in the corpus and assert it completes under a wall-time threshold (e.g., 2 s). Fail the CI if it regresses by > 20%.

---

### QR-16 · `warnAt` Used Hardcoded Diagnostic String ✅ Resolved
**Severity**: High
**Location**: `src/lowering/loweringDiagnostics.ts`
**Original**: `warnAt` pushed a diagnostic with a hardcoded string ID rather than a `DiagnosticId`; broke the exhaustive diagnostic registry.
**Resolution** (PR #559): Added `DiagnosticIds.EmitWarning = 'ZAX301'` to the diagnostic registry; `warnAt` now uses that constant.

---

### QR-17 · Duplicate Diagnostic Closures Across Call Sites ✅ Resolved
**Severity**: High
**Location**: `src/lowering/functionCallLowering.ts` (original emit.ts code)
**Original**: The typed-call argument dispatch duplicated three diagnostic-emission closures that already existed as free functions.
**Resolution**: Extraction of `functionCallLowering.ts` (PR #548 / #560 range) consolidated the closures. All call sites now import from `loweringDiagnostics.ts`.

---

### QR-18 · `AsmOperandNode extends never` Guard in `functionBodySetup.ts` ✅ Resolved
**Severity**: High
**Location**: `src/lowering/functionBodySetup.ts`
**Original**: A conditional type `AsmOperandNode extends never ? never : any` was used as an escape hatch to suppress a type error, masking a missing import.
**Resolution** (PR #561): Proper imports of `EaExprNode`, `ImmExprNode` from `ast.js` and `CompileEnv` from `env.js` added; the `extends never` trick removed. Zero `any` remains.

---

### QR-19 · Shared Types Triplicated Across Modules ✅ Resolved
**Severity**: High
**Location**: `src/lowering/emit.ts`, `functionLowering.ts`, `programLowering.ts` (original copies)
**Original**: `PendingSymbol`, `SectionKind`, `Callable`, and `SourceSegmentTag` were each defined independently in three separate modules with no single source of truth.
**Resolution** (PR #562): Extracted to `src/lowering/loweringTypes.ts` (24 lines); all three modules now import from there.

---

## Structural `as any` Remaining

One structural cast remains in `emit.ts` line 264:

```typescript
{ kind: 'AsmInstruction', span, head, operands } as any,
```

This is a deliberate encoder-API boundary cast: the literal object satisfies the `AsmInstruction` shape at runtime but the encoder's overload signature cannot be narrowed by the compiler without a type assertion. This is acceptable as a documented exception rather than a quality defect, but should be annotated with a comment if it stays.

---

## Open Issue Index

| ID | File | Severity | Status |
|----|------|----------|--------|
| QR-4 | `functionLowering.ts`, `emit.ts` | High | Partial |
| QR-5 | `src/lowering/*.ts` | High | Open |
| QR-7 | `opSubstitution.ts` | Medium | Open |
| QR-9 | `functionCallLowering.ts` | Medium | Open |
| QR-10 | `ldLowering.ts`, `programLowering.ts`, `functionLowering.ts` | Medium | Monitor |
| QR-11 | `emit.ts` — error recovery | Medium | Open |
| QR-12 | `fixupEmission.ts`, `sectionLayout.ts` | Medium | Open |
| QR-13 | `inputAssets.ts` | Low | Open |
| QR-14 | `tests/` | Low | Open |
| QR-15 | CI pipeline | Low | Open |
