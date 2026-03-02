# ZAX Refactor Plan

Status: non-normative planning document. Describes an ordered sequence of improvements to
take the codebase from its current state to a rigorous, well-maintained implementation
of the ZAX v0.2 specification. Each phase is scoped to be independently mergeable.

Source: `docs/quality-report.md` (issues QR-1 to QR-19).

Last updated to reflect the v0.4 hard-cap milestone: `emit.ts` is now **956 lines**.

---

## Guiding Principles

1. **Test first, then refactor.** Each extraction must leave all existing tests passing.
2. **Type everything.** No `ctx: any`. Every helper module context must have an explicit type.
3. **Document spec references.** Where code implements a spec rule, cite the section.
4. **Keep PRs small.** Each task below should be one atomic PR.
5. **No regressions.** The test suite is the acceptance criterion.

---

## Hard Acceptance Criteria (v0.4)

- `src/lowering/emit.ts` must be under **1 000 lines**. ✅ **MET — 956 lines.**
- Preferred end state: under **750 lines**. Still open (956 > 750).
- Every helper module context interface must have **no `any`** (including `any`-equivalent
  conditional types). Still open (QR-2, QR-18).

---

## Completed Work

All items that have landed and are no longer the active blocker.

| PR | Extracted to | What was moved |
|---|---|---|
| Earlier | `asmRangeLowering.ts` | if/while/loop/select structured control flow |
| Earlier | `opExpansionOrchestration.ts` | op expansion dispatch and stack-effect policy |
| Earlier | `opExpansionExecution.ts` | op body expansion execution |
| Earlier | `opSubstitution.ts` | op body token substitution and operand rewriting |
| Earlier | `eaResolution.ts` | EA name resolution helpers |
| Earlier | `eaMaterialization.ts` | EA address materialization to HL register |
| Earlier | `addressingPipelines.ts` | step pipeline builders (EA/load/store templates) |
| Earlier | `runtimeAtomBudget.ts` | runtime atom budget enforcement |
| Earlier | `runtimeImmediates.ts` | runtime immediate helpers |
| Earlier | `scalarWordAccessors.ts` | scalar word accessor helpers |
| Earlier | `typeResolution.ts` | type expression resolution helpers |
| #528 | `emissionCore.ts` | `emitCodeBytes`, `emitRawCodeBytes`, `emitStepPipeline` |
| #529 | `fixupEmission.ts` | fixup emission, condition opcode maps, `symbolicTargetFromExpr` |
| #530 | `asmUtils.ts` | AST clone helpers, `flattenEaDottedName`, `normalizeFixedToken` |
| #531 | `valueMaterialization.ts` | `pushEaAddress`, `pushMemValue`, runtime linear analysis |
| #532 | `asmInstructionLowering.ts` | `lowerAsmInstructionDispatcher` (ret/call/jp/jr/djnz) |
| #546 | `functionBodySetup.ts` | flow state, labels, `joinFlows`, select helpers |
| #538 | `opMatching.ts` | op matcher, overload resolution, `formatOpSignature` |
| — | `asmBodyOrchestration.ts` | `lowerAndFinalizeFunctionBody`, fallthrough checks |
| #547 | `loweringDiagnostics.ts` | `diag`, `diagAt`, `diagAtWithId`, `warnAt` (QR-3 ✅) |
| #547 | `functionLowering.ts` | FuncDecl frame setup, prologue, epilogue, `FunctionLoweringContext` |
| #547 | `functionCallLowering.ts` | typed-call argument dispatch (QR-17 ✅) |
| #548 | `programLowering.ts` | pre-scan pass, DataBlock/VarBlock, `finalizeProgramEmission` |

---

## Phase 0: Foundations (No behavioral change)

### P0-1: Fix `warnAt` diagnostic ID (QR-16) ✗ Open

**Files**: `src/diagnostics/types.ts`, `src/lowering/loweringDiagnostics.ts`

Add `DiagnosticIds.EmitWarning = 'ZAX301'`. Change `warnAt` to use it.
Update any test asserting `ZAX300` for a warning to expect `ZAX301`.

Acceptance: All tests pass. No `warnAt` call emits `ZAX300`.

---

### P0-2: Add file-level documentation to all source files (QR-15) ✗ Open

**Files**: All `src/**/*.ts`

Add a `/** ... */` block comment at the top of each file. Priority: `emit.ts`,
`ldLowering.ts`, `valueMaterialization.ts`, `functionLowering.ts`, `programLowering.ts`.

---

### P0-3: Document `ptr` alias (QR-10) ✗ Open

Add cross-reference comments at each `ptr`-handling site in `layout.ts` and
`typeResolution.ts`.

---

### P0-4: Add spec reference to HL-preserve swap (QR-9) ✗ Open

**Location**: `src/lowering/functionLowering.ts`, local initializer loop.

Add comment: `// HL-preserve swap pattern: return-register-policy.md §4.2`

---

### P0-5: Simplify `hasStackSlots` → `needsFrame` (QR-13) ✗ Open

**Location**: `src/lowering/functionLowering.ts`

Replace the redundant condition and rename `hasStackSlots` → `needsFrame`.

---

### P0-6: Add fixup-resolution section comment (QR-12) ✗ Open

**Location**: `src/lowering/programLowering.ts`, `finalizeProgramEmission`

Add header comment before the ABS16/REL8 resolution loop.

---

## Phase 1: Type Safety

### P1-1: Define `LdLoweringContext` and type `createLdLoweringHelpers` (QR-2) ✗ Open

**File**: `src/lowering/ldLowering.ts`

Audit all ~50 destructured properties. Define `type LdLoweringContext`. Change `ctx: any`.
Fix any `tsc` errors that surface (including the `evalImmExpr: (expr: any) =>` at the
call site in `emit.ts`, line 693).

Acceptance: `tsc --noEmit` clean. All tests pass.

---

### P1-2: Fix `any`-equivalent types in `functionBodySetup.ts` (QR-18) ✗ Open

**File**: `src/lowering/functionBodySetup.ts`, lines 59–66

Replace the `AsmOperandNode extends never ? never : any` trick with proper imports:
- `pushEaAddress` / `pushMemValue` → `ea: EaExprNode`
- `evalImmExpr` → `expr: ImmExprNode`
- `env: unknown` → `env: CompileEnv`

Acceptance: `tsc --noEmit` clean. No behavioral change.

---

### P1-3: Rename `resolvedScalarKind` → `scalarKindOfResolution` (QR-6) ✗ Open

**Files**: `src/lowering/ldLowering.ts`, call sites

Update all call sites.

---

### P1-4: Document `resolveScalarTypeForLd` vs `resolveScalarTypeForEa` (QR-5) ✗ Open

**File**: `src/lowering/typeResolution.ts`

Add JSDoc explaining the `rawAddressSymbols` distinction.

---

## Phase 2: Shared Type Definitions

### P2-1: Extract `PendingSymbol`, `SectionKind`, `Callable` to `loweringTypes.ts` (QR-19) ✗ Open

**New file**: `src/lowering/loweringTypes.ts`

The following types are currently copy-pasted across `emit.ts`, `functionLowering.ts`, and
`programLowering.ts`:
- `PendingSymbol`
- `SectionKind` (`'code' | 'data' | 'var'`)
- `SourceSegmentTag` (local alias of `Omit<EmittedSourceSegment, 'start' | 'end'>`)
- `Callable` union

Export them from `loweringTypes.ts`. Import in all three files.

Acceptance: No behavioral change. `tsc --noEmit` clean. No duplicate type definitions.

---

### P2-2: Extract `summarizeOpStackEffect` to `opStackAnalysis.ts` (QR-8) ✗ Open

**New file**: `src/lowering/opStackAnalysis.ts`

Extract the `summarizeOpStackEffect` closure (lines ~225–314 of `emit.ts`) and its
memoisation cache. This function only depends on `opsByName` (immutable after pre-scan) and
a cache map — it has no dependency on mutable state.

Define `type OpStackAnalysisContext = { opsByName: Map<string, OpDeclNode[]> }`. Pass
`opsByName` in through the context. Move the cache into the factory closure.

Add unit tests: single push/pop, nested push+pop, conditional, empty body, recursion guard.

Acceptance: All tests pass. New unit tests cover the extracted function.

---

## Phase 3: Code Documentation and Cleanup

### P3-1: Document and clean up `coerceValueOperand` (QR-11) ✗ Open

After Phase 1 types `ldLowering.ts`:

1. Extract `coerceValueOperand` as a named function with JSDoc citing the spec rule.
2. Extract and deduplicate `isRegisterToken` against `reg8`.

---

### P3-2: Audit and comment raw opcode bytes (QR-7) ✗ Open

**File**: `src/lowering/ldLowering.ts`

For every `emitRawCodeBytes(Uint8Array.of(...))` call:
1. Add an inline comment with the Z80 mnemonic.
2. Where practical, route through `encodeInstruction`.
3. Document the IX byte-lane shuttle pattern with a reference to `addressing-model.md §2`.

---

## Phase 4: Function State Encapsulation (QR-4)

After Phases 1–3:

Move the remaining function-lifetime state declarations (`stackSlotOffsets`, `stackSlotTypes`,
`localAliasTargets`) from `emit.ts` closures into `functionLowering.ts`. Eliminate the
`trackedSpRef` proxy by making `FlowState` (from `functionBodySetup.ts`) the single
authoritative source of SP tracking state.

Acceptance: All tests pass. No behavioral change. No proxy getter/setter in the wiring section.

---

## Phase 5: Parser Robustness (QR-14)

Long-term. Only after Phases 0–4 stabilise the lowering.

### P5-1: Introduce a `Tokenizer` helper

Add `src/frontend/tokenizer.ts`. Migrate `parseImm.ts` and `parseOperands.ts`.

### P5-2: Register canonicalization in the tokenizer

Move register name normalisation into a single lookup table in the tokenizer.

---

## Ticket Backlog

| Ticket | Phase | QR | Severity | Status | Description |
|---|---|---|---|---|---|
| T-001 | P0-1 | QR-16 | Low | Open | Add `ZAX301` warning ID; fix `warnAt` |
| T-002 | P0-2 | QR-15 | Low | Open | Add file-level documentation to all src files |
| T-003 | P0-3 | QR-10 | Low | Open | Document `ptr` alias in layout and typeResolution |
| T-004 | P0-4 | QR-9 | Low | Open | Add spec reference comment to HL-swap pattern |
| T-005 | P0-5 | QR-13 | Med | Open | Simplify `hasStackSlots` → `needsFrame` |
| T-006 | P0-6 | QR-12 | Low | Open | Add fixup-resolution section comment |
| T-007 | P1-1 | QR-2 | Crit | Open | Define `LdLoweringContext`; type `createLdLoweringHelpers` |
| T-008 | P1-2 | QR-18 | High | Open | Fix `any`-equivalent types in `functionBodySetup.ts` Context |
| T-009 | P1-3 | QR-6 | High | Open | Rename `resolvedScalarKind` → `scalarKindOfResolution` |
| T-010 | P1-4 | QR-5 | High | Open | Document `resolveScalarTypeForLd` vs `resolveScalarTypeForEa` |
| T-011 | P2-1 | QR-19 | Med | Open | Extract shared types to `loweringTypes.ts` |
| T-012 | P2-2 | QR-8 | High | Open | Extract `summarizeOpStackEffect` to `opStackAnalysis.ts` |
| T-013 | P3-1 | QR-11 | Med | Open | Extract/document `coerceValueOperand`; deduplicate `isRegisterToken` |
| T-014 | P3-2 | QR-7 | High | Open | Audit and comment all raw opcode bytes in `ldLowering.ts` |
| T-015 | P4 | QR-4 | High | Open | Eliminate `trackedSpRef` proxy; encapsulate function-lifetime state |
| T-016 | P5-1 | QR-14 | Med | Open | Add `Tokenizer` helper; migrate `parseImm` and `parseOperands` |
| T-017 | P5-2 | QR-14 | Med | Open | Move register canonicalization into tokenizer |

**Closed tickets** (completed during v0.4 structural decomposition):

| Ticket | QR | Description |
|---|---|---|
| ~~T-012~~ (old) | QR-3 | `diagAt` shadow resolved → `loweringDiagnostics.ts` ✅ |
| ~~T-013~~ (old) | QR-17 | Duplicate diagnostics resolved → `functionCallLowering.ts` ✅ |
| ~~T-011~~ (old) | QR-1 | Frame generation extracted → `functionLowering.ts` ✅ |
| ~~T-014~~ (old) | QR-1 | DataBlock/VarBlock extracted → `programLowering.ts` ✅ |

---

## Non-Goals

- Changing the ZAX language specification or adding new language features
- Changing the encoding of any Z80 instruction
- Modifying the frame model or preservation matrix
- Changing test fixture expected outputs (unless a bug is discovered)
- Refactoring format writers (`formats/*.ts`) — already well-factored
- Refactoring `compile.ts` or `pipeline.ts` — already clean

---

## Success Criteria

At the end of this track, the codebase should satisfy:

1. ✅ `emit.ts` is under 1 000 lines (met: 956).
2. `emit.ts` is under 750 lines (still open: 956 > 750; achievable with P2-2 + P4).
3. Every helper module has a fully typed context interface with no `any` (QR-2, QR-18 open).
4. No type is copy-pasted across more than one module (QR-19 open).
5. Every emitted raw opcode byte has a mnemonic comment (QR-7 open).
6. Every implementation of a spec rule has an inline comment citing the section (QR-9, QR-11).
7. Program-lifetime and function-lifetime state are structurally separated (QR-4 partially met).
8. All existing tests continue to pass.
9. New unit tests cover all extracted helpers.
