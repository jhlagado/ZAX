# ZAX Lowering — Refactor Plan

> **Scope**: `src/lowering/` subsystem.
> **Last updated**: 2026-03-03
> **Status**: emit.ts hard cap met (793 lines ≤ 1,000). Phase 1–3 complete.

---

## Completed Work

All PRs below are merged to `main`.

### Phase 1 — Initial Module Extraction

| PR | Description | Module Created |
|----|-------------|----------------|
| #513 | Extract type resolution helpers | `typeResolution.ts` |
| #514 | Extract runtime atom budget helpers | `runtimeAtomBudget.ts` |
| #515 | Extract EA resolution helpers | `eaResolution.ts` |
| #516 | Extract runtime immediate helpers | `runtimeImmediates.ts` |
| #517 | Extract addressing pipeline builders | `addressingPipelines.ts` |
| #518 | Extract EA materialization helper | `eaMaterialization.ts` |
| #519 | Extract scalar word accessor routing | `scalarWordAccessors.ts` |
| #520 | Extract LD lowering helper | `ldLowering.ts` |
| #521 | Extract op substitution helpers | `opSubstitution.ts` |
| #522 | Extract op expansion execution helpers | `opExpansionExecution.ts` |
| #523 | Extract op expansion orchestration helpers | `opExpansionOrchestration.ts` |
| #524 | Extract ASM range lowering helper | `asmRangeLowering.ts` |
| #525 | Extract ASM body orchestration helper | `asmBodyOrchestration.ts` |
| #526 | Extract op matching helpers | `opMatching.ts` |

### Phase 2 — Core Decomposition

| PR | Description | Module Created / Affected |
|----|-------------|---------------------------|
| #536 | Extract emission core helpers | `emissionCore.ts` |
| #537 | Extract fixup emission helpers | `fixupEmission.ts` |
| #538 | Extract ASM utility helpers | `asmUtils.ts` |
| #539 | Extract value materialization helpers | `valueMaterialization.ts` |
| #540 | Extract ASM instruction lowering dispatcher | `asmInstructionLowering.ts` |
| #546 | Extract function body setup helpers | `functionBodySetup.ts` |
| #547 | Extract function lowering coordinator | `functionLowering.ts` |
| #548 | Extract program lowering orchestration | `programLowering.ts` |

**Result after Phase 2**: `emit.ts` reduced from 3,729 → ~956 lines.

### Phase 3 — Type Quality and Naming

| PR | Description | QR Resolved |
|----|-------------|-------------|
| #559 | Add lowering warning diagnostic ID (`EmitWarning`) | QR-16 |
| #560 | Type LD lowering context (`LdLoweringContext`) | QR-2 |
| #561 | Type function body setup context | QR-18 |
| #562 | Extract shared lowering types (`loweringTypes.ts`) | QR-19 |
| #563 | Extract op stack analysis helpers (`opStackAnalysis.ts`) | QR-8 |
| #564 | Isolate function-lifetime SP tracking (`bindSpTracking`) | QR-4 (partial) |
| #565 | Clean up lowering naming hazards (`scalarKindOfResolution`) | QR-6 |

**Result after Phase 3**: `emit.ts` = **793 lines**. Hard cap (≤ 1,000) met.

---

## Active Tickets

Ordered by priority. Tickets are discrete, independently mergeable.

### High Priority

#### T-001 — Unit Tests: `opStackAnalysis.ts`
**File**: `src/lowering/opStackAnalysis.ts`
**QR**: QR-5
**Effort**: S
Add `opStackAnalysis.test.ts`. The module is a pure function over `Map<string, OpDeclNode[]>`; no emit state needed. Test: known op produces expected `OpStackSummary`, unknown op returns `{ kind: 'unknown' }`, zero-effect op produces `{ kind: 'none' }`.

#### T-002 — Unit Tests: `typeResolution.ts`
**File**: `src/lowering/typeResolution.ts`
**QR**: QR-5
**Effort**: S
Add `typeResolution.test.ts`. All helpers are pure functions over AST nodes; straightforward to unit test without a compiler session.

#### T-003 — Unit Tests: `eaResolution.ts`
**File**: `src/lowering/eaResolution.ts`
**QR**: QR-5
**Effort**: M
Add `eaResolution.test.ts`. EA resolution has the most complex address-mode matching logic; catching regressions here pays for itself.

#### T-004 — Complete SP-Tracking Extraction
**File**: `src/lowering/functionLowering.ts`, new `spTracking.ts`
**QR**: QR-4
**Effort**: M
Extract SP-delta bookkeeping from `functionLowering.ts` into a dedicated `spTracking.ts` module. The module should expose:
- `createSpTracker(initialOffset: number)` → `{ delta(): number; adjust(n: number): void; push(bytes: number): void; pop(bytes: number): void }`
Document invariants (delta must be 0 at every call boundary) as assertions or comments.

#### T-005 — Type `opSubstitution.ts` Path Traversal
**File**: `src/lowering/opSubstitution.ts`, lines 32–36, 93–97
**QR**: QR-7
**Effort**: S
Replace `path: any` and `step: any` with the concrete `OffsetofPath` / step-union types from `ast.js`. Remove the two `any` annotations; add exhaustive narrowing on the step discriminant.

#### T-006 — Type `matcherMatchesOperand` Parameter
**File**: `src/lowering/functionCallLowering.ts`, line 93
**QR**: QR-9
**Effort**: S
Identify the correct AST matcher type (search `ast.ts` for operand-pattern nodes), import it, replace `matcher: any` in the context interface and all implementing call sites.

### Medium Priority

#### T-007 — Error-Recovery Barrier in `emitInstr`
**File**: `src/lowering/emit.ts`
**QR**: QR-11
**Effort**: M
Introduce a session-scoped `hadFatalError: boolean` flag in the emit context. When `emitInstr` returns `null` (unhandled node), set the flag. All subsequent passes that check the flag should either suppress their own diagnostics or return early. This prevents cascading spurious errors after a genuine compile failure.

#### T-008 — `SectionView` Interface for Fixup Phase
**Files**: `src/lowering/fixupEmission.ts`, `sectionLayout.ts`
**QR**: QR-12
**Effort**: M
Define a `SectionView` read-only interface in `loweringTypes.ts`:
```typescript
export interface SectionView {
  readonly bytes: Uint8Array;
  readonly baseAddress: number;
}
```
Have `fixupEmission.ts` accept `SectionView[]` rather than the raw section layout array. This decouples the fixup phase from section representation details.

#### T-009 — Split `inputAssets.ts` Validation from Transform
**File**: `src/lowering/inputAssets.ts`
**QR**: QR-13
**Effort**: S
Separate `validateInputs(program: ProgramNode, env: CompileEnv): Diagnostic[]` from the transformation that produces lowering-ready data. Return early from the emit entry point if validation yields errors. Makes both concerns independently testable.

#### T-010 — Annotate Structural `as any` in `emitInstr`
**File**: `src/lowering/emit.ts`, line 264
**Effort**: XS
Add a comment above the structural cast explaining why the assertion is necessary:
```typescript
// Encoder overloads cannot narrow this literal; shape is correct at runtime.
{ kind: 'AsmInstruction', span, head, operands } as any,
```
Keeps the accepted-exception visible to future readers.

### Lower Priority

#### T-011 — Monitor `ldLowering.ts` Size
**File**: `src/lowering/ldLowering.ts` (894 lines)
**QR**: QR-10
**Effort**: L (if actioned)
No immediate split required. If it exceeds 1,000 lines during v0.4 work, split load/store addressing-mode dispatch from scalar arithmetic helpers. Track as a size watch.

#### T-012 — Monitor `programLowering.ts` Size
**File**: `src/lowering/programLowering.ts` (821 lines)
**QR**: QR-10
**Effort**: L (if actioned)
Same policy as T-011. DataBlock / VarBlock lowering is the natural split point.

#### T-013 — Monitor `functionLowering.ts` Size
**File**: `src/lowering/functionLowering.ts` (772 lines)
**QR**: QR-10
**Effort**: L (if actioned)
Same policy. Prologue/epilogue generation vs. body dispatch are the natural split points.

#### T-014 — Lowering Error-Case Test Corpus
**Location**: new `tests/lowering-errors/` directory
**QR**: QR-14
**Effort**: M
Add `.zax` fixture files that are expected to produce specific `DiagnosticIds`-tagged errors. Run these in CI with a `--expect-diagnostics` flag or similar. Start with: out-of-range immediate, illegal addressing mode, stack mismatch.

#### T-015 — CI Performance Baseline
**Location**: `.github/workflows/`
**QR**: QR-15
**Effort**: S
Add a benchmark step that compiles the largest corpus fixture and asserts wall time < 2 s. Fail CI if time regresses > 20% vs. the stored baseline. Store the baseline as a workflow artifact.

#### T-016 — `functionCallLowering.ts` Size Watch
**File**: `src/lowering/functionCallLowering.ts` (463 lines)
**Effort**: Watch
Currently well within bounds. Note for review if it grows past 600 lines during typed-call expansion work.

#### T-017 — Document `loweringTypes.ts` Invariants
**File**: `src/lowering/loweringTypes.ts` (24 lines)
**Effort**: XS
Add a header comment to `loweringTypes.ts` explaining the role of each exported type and who owns mutation of `PendingSymbol` entries (currently `programLowering.ts`). Prevents future re-duplication.

---

## Subsystem File Map (current)

| File | Lines | Role |
|------|-------|------|
| `emit.ts` | 793 | Entry point, state, `emitInstr`, orchestration |
| `loweringTypes.ts` | 24 | Shared type definitions |
| `loweringDiagnostics.ts` | 62 | Diagnostic helper functions |
| `opStackAnalysis.ts` | 109 | Op stack effect summarization |
| `typeResolution.ts` | 236 | Type narrowing helpers |
| `eaResolution.ts` | 157 | Effective-address resolution |
| `addressingPipelines.ts` | 208 | Address pipeline builders |
| `eaMaterialization.ts` | 51 | EA materialization |
| `scalarWordAccessors.ts` | 67 | Scalar/word accessor routing |
| `runtimeAtomBudget.ts` | 155 | Runtime atom size budgeting |
| `runtimeImmediates.ts` | 124 | Immediate value helpers |
| `inputAssets.ts` | 154 | Input validation and transform |
| `sectionLayout.ts` | 65 | Section layout |
| `traceFormat.ts` | 228 | Trace/debug formatting |
| `ldLowering.ts` | 894 | LD instruction lowering |
| `opSubstitution.ts` | 212 | Op substitution |
| `opExpansionExecution.ts` | 98 | Op expansion execution |
| `opExpansionOrchestration.ts` | 225 | Op expansion orchestration |
| `opMatching.ts` | 377 | Op operand matching |
| `asmRangeLowering.ts` | 396 | ASM range lowering |
| `asmBodyOrchestration.ts` | — | ASM body orchestration |
| `asmUtils.ts` | 101 | ASM utilities |
| `asmInstructionLowering.ts` | 380 | ASM instruction dispatch |
| `emissionCore.ts` | 226 | Core byte emission |
| `fixupEmission.ts` | 288 | Fixup/backpatch emission |
| `valueMaterialization.ts` | 515 | Value materialization |
| `functionBodySetup.ts` | 373 | Function body setup |
| `functionCallLowering.ts` | 463 | Typed-call argument lowering |
| `functionLowering.ts` | 772 | Function frame + prologue/epilogue |
| `programLowering.ts` | 821 | Program item dispatch |

**Total lowering subsystem**: ~8,655 lines across 30 files (was 3,729 in a single file).

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| `emit.ts` ≤ 1,000 lines | ✅ 793 lines |
| Zero `any` in `ldLowering.ts` | ✅ |
| Zero `any` in `functionBodySetup.ts` | ✅ |
| Shared types in single location | ✅ `loweringTypes.ts` |
| Diagnostic helpers in single location | ✅ `loweringDiagnostics.ts` |
| All `DiagnosticId` constants in registry | ✅ `EmitWarning` added |
| Unit tests for pure lowering helpers | ⬜ T-001–T-003 |
| SP-tracking fully encapsulated | ⬜ T-004 |
| Zero untyped `any` in all lowering files | ⬜ T-005, T-006 |
