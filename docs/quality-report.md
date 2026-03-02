# ZAX Code Quality Report

Status: non-normative. Developer-facing analysis of current code quality, produced as input for
the refactor planning track. Issues are rated by severity: **Critical** (correctness risk or
major maintainability block), **High** (significant maintainability/readability harm),
**Medium** (moderate friction), **Low** (polish).

Last updated to reflect the state after the v0.4 decomposition sequence culminating in
`emit.ts` reaching **956 lines** (hard cap: 1 000; preferred cap: 750). Twelve extraction
PRs have landed in total. The original god-file blocker is resolved.

---

## Executive Summary

The v0.4 structural target has been met. `emit.ts` is now 956 lines — a reduction of
approximately 3 200 lines from the pre-v0.4 starting point. All emission concerns now live
in named, individually readable modules. The `loweringDiagnostics.ts` extraction resolved the
`diagAt` shadow collision. The `functionCallLowering.ts` extraction resolved the duplicate
diagnostic closure problem.

The remaining open issues fall into three categories:

1. **Type safety**: `ldLowering.ts` still uses `ctx: any` (QR-2), and
   `functionBodySetup.ts` still uses `any`-equivalent conditional types (QR-18). These are
   the highest-priority remaining items.

2. **Internal cleanup**: `summarizeOpStackEffect` is still a 90-line inline closure in
   `emit.ts` (QR-8). `applySpTracking` and `emitInstr` are also inline. The `PendingSymbol`
   type is duplicated across three files (QR-19). `warnAt` still uses the wrong diagnostic ID
   (QR-16).

3. **Documentation and polish**: naming hazards (QR-5, QR-6), undocumented patterns
   (QR-7, QR-9, QR-10, QR-11, QR-12), and structural cleanups (QR-13, QR-14, QR-15).

---

## Issue 1 — ~~Critical~~ **RESOLVED**: `emit.ts` is now 956 lines

**Location**: `src/lowering/emit.ts` (956 lines)

The 1 000-line hard cap has been met. The full decomposition sequence extracted the
following concerns from `emit.ts`:

| Extracted to | What moved out | PR |
|---|---|---|
| `emissionCore.ts` | `emitCodeBytes`, `emitRawCodeBytes`, `emitStepPipeline` | #528 |
| `fixupEmission.ts` | `emitAbs16Fixup`, fixup helpers, condition opcode maps | #529 |
| `asmUtils.ts` | AST clone helpers, `flattenEaDottedName`, `normalizeFixedToken` | #530 |
| `valueMaterialization.ts` | `pushEaAddress`, `pushMemValue`, runtime linear analysis | #531 |
| `asmInstructionLowering.ts` | `lowerAsmInstructionDispatcher` (ret/call/jp/jr/djnz) | #532 |
| `functionBodySetup.ts` | Flow state, labels, `joinFlows`, select helpers | #546 |
| `opMatching.ts` | Op overload matching, specificity, diagnostic formatting | #538 |
| `asmBodyOrchestration.ts` | `lowerAndFinalizeFunctionBody`, fallthrough checks | — |
| `loweringDiagnostics.ts` | `diag`, `diagAt`, `diagAtWithId`, `diagAtWithSeverityAndId`, `warnAt` | #547 |
| `functionLowering.ts` | FuncDecl frame setup, prologue, epilogue, `FunctionLoweringContext` | #547 |
| `functionCallLowering.ts` | Typed-call argument dispatch (byte/word/ea/mem variants) | #547 |
| `programLowering.ts` | Pre-scan pass, program item dispatch, DataBlock/VarBlock handling | #548 |

**What remains in `emit.ts`** (956 lines):

- Import block and `emitProgram` function signature (~150 lines)
- Module-level state declarations (bytes maps, fixup queues, callables, section counters)
- `summarizeOpStackEffect` inline closure (lines ~225–314, ~90 lines) — see QR-8
- `applySpTracking` inline closure (lines ~367–412, ~46 lines)
- `emitInstr` inline closure (lines ~414–426, ~13 lines)
- All helper module wiring (`createXxxHelpers` calls) (~280 lines)
- `programLoweringContext` assembly object (~130 lines)
- `preScanProgramDeclarations`, `lowerProgramDeclarations`, `finalizeProgramEmission` calls
- Module-alias resolution post-pass

These are all reasonable orchestration-layer concerns. The file is now well within the cap.

---

## Issue 2 — Critical: `ldLowering.ts` uses `ctx: any`

**Location**: `src/lowering/ldLowering.ts`, line 4

```typescript
export function createLdLoweringHelpers(ctx: any) {
  const { emitInstr, resolveEa, buildEaBytePipeline, ... } = ctx;
```

`ctx: any` completely disables TypeScript type checking for the entire LD lowering module —
the most complex lowering code in the compiler. The destructuring unpacks approximately 50
named dependencies with no type verification. The call site in `emit.ts` (line 693) passes
`evalImmExpr: (expr: any) => ...`, confirming the any leaks outward too.

**Impact**: Type errors in LD lowering are invisible to `tsc`. Regressions will only surface
at runtime.

**Fix direction**: Define `type LdLoweringContext = { ... }` at the top of `ldLowering.ts`.
Audit every property used by the destructuring. Change `ctx: any` to `ctx: LdLoweringContext`.

---

## Issue 3 — ~~High~~ **RESOLVED**: `diagAt` shadow collision in `emit.ts`

**Location**: `src/lowering/loweringDiagnostics.ts` (resolved by #547)

The five file-scope diagnostic helpers have been extracted to `loweringDiagnostics.ts` as
named exports. `emit.ts` now imports them. The file-scope vs closure-scope shadow ambiguity is
gone. The only remaining sub-issue is that `warnAt` still uses `DiagnosticIds.EmitError` for
warnings — see QR-16.

---

## Issue 4 — High: Function-lifetime and program-lifetime state in the same scope

**Location**: `src/lowering/emit.ts` / `src/lowering/functionLowering.ts`

**Partially resolved** by #547. `FunctionLoweringContext` is now an exported interface in
`functionLowering.ts` and function-lifetime state is managed inside `lowerFunctionDecl`. The
`trackedSpRef` proxy object (a getter/setter bridge for the three SP tracking scalars, now at
`programLoweringContext.trackedSpRef` in `emit.ts`) still exists, but it is now confined to
the wiring section only — it is no longer interleaved with unrelated program-lifetime state.

**Remaining concern**: `stackSlotOffsets`, `stackSlotTypes`, and `localAliasTargets` are still
declared as `let`/`const` closures in `emitProgram` and passed by reference into
`programLoweringContext` (lines 851–853). They are reset inside `lowerFunctionDecl`, but there
is no structural guarantee. Full resolution requires making these allocations happen inside
`lowerFunctionDecl`.

**Fix direction**: Move the remaining function-lifetime state declarations into
`functionLowering.ts`. Eliminate the `trackedSpRef` proxy by making `FlowState` the
authoritative source.

---

## Issue 5 — High: `resolveScalarTypeForLd` and `resolveScalarTypeForEa` undocumented

**Location**: `src/lowering/typeResolution.ts`

Two functions with nearly identical names differ critically: `resolveScalarTypeForLd` returns
a scalar kind for `rawAddressSymbols` (variables whose stored value is wanted), while
`resolveScalarTypeForEa` does not. Neither has a doc comment.

**Fix direction**: Add JSDoc to each function explaining the `rawAddressSymbols` distinction
and when each is appropriate.

---

## Issue 6 — High: `resolvedScalarKind` and `resolveScalarKind` naming hazard

**Location**: `src/lowering/ldLowering.ts`

`resolvedScalarKind(resolution: EaResolution | undefined)` and
`resolveScalarKind(typeExpr: TypeExprNode)` differ only by the past-tense `-d`. Easy to confuse.

**Fix direction**: Rename `resolvedScalarKind` → `scalarKindOfResolution`.

---

## Issue 7 — High: Raw opcode bytes in `ldLowering.ts` lack mnemonic comments

**Location**: `src/lowering/ldLowering.ts`, multiple `emitRawCodeBytes(Uint8Array.of(...))` calls

The IX byte-lane shuttle and other encoding sites emit raw byte sequences without inline
comments explaining the Z80 mnemonic.

**Fix direction**: Add a comment with the canonical mnemonic at every `emitRawCodeBytes` call.
Where practical, route through `encodeInstruction` instead of raw bytes.

---

## Issue 8 — High: `summarizeOpStackEffect` still inline in `emit.ts`

**Location**: `src/lowering/emit.ts`, lines ~225–314 (~90 lines)

`summarizeOpStackEffect` is a 90-line closure that analyses an op body to compute its net
stack push/pop delta. It captures `opsByName` (immutable after pre-scan) and
`opStackSummaryCache` from the outer scope. Despite having no dependency on mutable
program-lifetime or function-lifetime state, it was not extracted during the decomposition
sequence because `opsByName` is not yet part of an injectable context.

**Impact**: Cannot be independently unit-tested. The only remaining large cohesive logic
block still inline in `emitProgram`.

**Fix direction**: Extract to `src/lowering/opStackAnalysis.ts` with
`type OpStackAnalysisContext = { opsByName: Map<string, OpDeclNode[]> }`. Add unit tests.

---

## Issue 9 — Medium: HL-preserve swap pattern undocumented

**Location**: `src/lowering/functionLowering.ts` (previously `emit.ts`)

The local initializer loop uses a non-obvious HL-preserve swap pattern. No reference comment
points to `docs/return-register-policy.md §4.2` at the implementation site.

**Fix direction**: Add comment: `// HL-preserve swap pattern: return-register-policy.md §4.2`

---

## Issue 10 — Medium: `ptr` alias handled independently in layout and typeResolution

**Location**: `src/semantics/layout.ts`, `src/lowering/typeResolution.ts`

The `ptr` type alias for `addr` is normalised in `typeResolution.ts` but handled
independently in `layout.ts` with no cross-reference comment.

**Fix direction**: Add a comment at each `ptr` handling site explaining the alias.

---

## Issue 11 — Medium: `coerceValueOperand` is an anonymous closure with no explanation

**Location**: `src/lowering/ldLowering.ts`

`coerceValueOperand` and its helper `isRegisterToken` (a 17-element duplicate token list)
have no documentation. The spec rule they implement is not referenced.

**Fix direction**: Add JSDoc. Extract `isRegisterToken` as a named helper and deduplicate
against `reg8`.

---

## Issue 12 — Medium: No section comment on the fixup-resolution second pass

**Location**: `src/lowering/programLowering.ts` (was `emit.ts`)

The ABS16/REL8 fixup resolution loop (now in `finalizeProgramEmission` in `programLowering.ts`)
begins without a header comment explaining its purpose as a second pass.

**Fix direction**: Add a comment before the resolution loop:
```
// Second pass: resolve forward-reference fixups and finalise section base addresses.
```

---

## Issue 13 — Medium: `hasStackSlots` condition is redundant

**Location**: `src/lowering/functionLowering.ts` (was `emit.ts`)

```typescript
const hasStackSlots = frameSize > 0 || argc > 0 || preserveBytes > 0;
```
`frameSize` already includes `preserveBytes`, so `preserveBytes > 0` is checked twice.

**Fix direction**: Rename to `needsFrame` and simplify to
`localSlotCount > 0 || argc > 0 || preserveSet.length > 0`.

---

## Issue 14 — Medium: Line-by-line parser is fragile for future extension

**Location**: `src/frontend/parser.ts` and related files

Manual string tokenization with no canonical token boundary makes future grammar additions
brittle.

**Fix direction**: Introduce `src/frontend/tokenizer.ts` and migrate `parseImm.ts` and
`parseOperands.ts` to use it.

---

## Issue 15 — Low: No file-level documentation on any source file

All `src/**/*.ts` files lack a module-level doc comment.

**Fix direction**: Add one-paragraph module comments. Priority: `emit.ts`, `ldLowering.ts`,
`valueMaterialization.ts`, `functionLowering.ts`, `programLowering.ts`.

---

## Issue 16 — Low: `warnAt` uses `EmitError` diagnostic ID

**Location**: `src/lowering/loweringDiagnostics.ts`, line 55

```typescript
export function warnAt(...): void {
  diagnostics.push({ id: DiagnosticIds.EmitError, severity: 'warning', ... });
}
```

`warnAt` still emits `ZAX300` (the error ID) for a warning-severity diagnostic.

**Fix direction**: Add `DiagnosticIds.EmitWarning = 'ZAX301'` to `diagnostics/types.ts`.
Change `warnAt` to use it. Update relevant tests.

---

## Issue 17 — ~~High~~ **RESOLVED**: Duplicate diagnostic closures in `emitAsmInstruction`

Resolved by extracting typed call dispatch into `functionCallLowering.ts` (#547). The
duplicate `diagIfRetStackImbalanced` / `diagIfCallStackUnverifiable` closures no longer exist.

---

## Issue 18 — High: `functionBodySetup.ts` uses `any`-equivalent types in its Context

**Location**: `src/lowering/functionBodySetup.ts`, lines 59–66

```typescript
pushEaAddress: (ea: AsmOperandNode extends never ? never : any, span: SourceSpan) => boolean;
evalImmExpr: (expr: any) => number | undefined;
env: unknown;
```

`AsmOperandNode extends never ? never : any` evaluates to `any` — a linting-bypass technique.
The correct types are `EaExprNode` (for `pushEaAddress`/`pushMemValue`), `ImmExprNode` (for
`evalImmExpr`), and `CompileEnv` (for `env`).

**Fix direction**: Import `EaExprNode`, `ImmExprNode` from `../frontend/ast.js` and
`CompileEnv` from `../semantics/env.js`. Replace all `any`-equivalent entries.

---

## Issue 19 — Medium: `PendingSymbol` type duplicated across three files

**Location**: `src/lowering/emit.ts` (line 160), `src/lowering/functionLowering.ts` (line 30),
`src/lowering/programLowering.ts` (line 33)

```typescript
type PendingSymbol = {
  kind: 'label' | 'data' | 'var';
  name: string;
  section: 'code' | 'data' | 'var';
  offset: number;
  file?: string;
  line?: number;
  scope?: 'global' | 'local';
  size?: number;
};
```

This type is copy-pasted in three places. Similarly, `Callable`, `SourceSegmentTag`, and
`SectionKind` are locally redefined in multiple files. If the shape changes, all three copies
must be updated simultaneously.

**Fix direction**: Create `src/lowering/loweringTypes.ts` and export `PendingSymbol`,
`SectionKind`, and `SourceSegmentTag` from there. Import in all three files.

---

## Summary Table

| ID | Severity | Status | Title |
|---|---|---|---|
| QR-1 | Critical | ✅ Resolved | `emit.ts` now 956 lines (under hard cap) |
| QR-2 | Critical | Open | `ldLowering.ts` uses `ctx: any` |
| QR-3 | High | ✅ Resolved | `diagAt` shadow resolved by `loweringDiagnostics.ts` |
| QR-4 | High | Partially resolved | Function/program state partially separated |
| QR-5 | High | Open | `resolveScalarTypeForLd` vs `resolveScalarTypeForEa` undocumented |
| QR-6 | High | Open | `resolvedScalarKind` / `resolveScalarKind` naming hazard |
| QR-7 | High | Open | Raw opcode bytes lack mnemonic comments |
| QR-8 | High | Open | `summarizeOpStackEffect` still inline in `emit.ts` |
| QR-9 | Medium | Open | HL-preserve swap undocumented (now in `functionLowering.ts`) |
| QR-10 | Medium | Open | `ptr` alias not cross-referenced |
| QR-11 | Medium | Open | `coerceValueOperand` undocumented / `isRegisterToken` duplicated |
| QR-12 | Medium | Open | No section comment on fixup-resolution second pass |
| QR-13 | Medium | Open | `hasStackSlots` condition is redundant (now in `functionLowering.ts`) |
| QR-14 | Medium | Open | Line-by-line parser fragile for future extension |
| QR-15 | Low | Open | No file-level documentation |
| QR-16 | Low | Open | `warnAt` uses `EmitError` ID for warnings |
| QR-17 | High | ✅ Resolved | Duplicate diagnostic closures eliminated |
| QR-18 | High | Open | `functionBodySetup.ts` `any`-equivalent types in Context |
| QR-19 | Medium | Open | `PendingSymbol` / `SectionKind` / `Callable` duplicated across 3 files |
