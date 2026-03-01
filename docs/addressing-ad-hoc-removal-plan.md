# Addressing Ad-hoc Removal Plan

This is the working checklist for removing hand-written lowering sequences from
`src/lowering/emit.ts` and replacing them with the step library
(`src/addressing/steps.ts`) plus scalar accessors.

The goal is to make `emit.ts` a dispatcher:

- resolve scalar vs indexed shape
- select scalar accessor or `EA_*` / `EAW_*`
- select the matching template
- emit the selected pipeline

Not a second instruction library.

## Removal policy

Only keep an ad-hoc path when at least one of these is true:

- the ISA has a direct encoding that is strictly better than the step-library
  composition
- the normal encoder already owns the form (for example direct `(hl)` or
  `(ix+d)` forms that should pass through unchanged)
- the step library does not yet model the form

Everything else should be removed.

## Current state

The main word-indexing gap for named scalar indexes has now been fixed:

- `IndexImm(ImmName)` for word arrays now routes into `EAW_*` builders instead
  of dropping to the generic fallback path.
- Covered by `test/pr406_word_eaw_matrix.test.ts`.

## Remaining ad-hoc clusters in `src/lowering/emit.ts`

### 1. Word push fallback (`pushMemValue`, word)

Current fallback when no scalar accessor and no `EAW_*` pipeline is available:

- `pushEaAddress(ea)`
- `pop hl`
- `ld e, (hl)`
- `inc hl`
- `ld d, (hl)`
- `ex de, hl`
- `push hl`

Status:

- still ad-hoc
- acceptable only as the final generic escape hatch

Desired end state:

- keep as the last fallback only
- ensure all valid scalar and valid indexed word cases are routed away from it

Coverage:

- scalar/call-arg paths already covered by `test/pr406_word_scalar_accessors.test.ts`
- indexed word shapes covered by `test/pr406_word_templates_regression.test.ts`,
  `test/pr412_runtime_index_array_word.test.ts`, and
  `test/pr406_word_eaw_matrix.test.ts`

### 2. Byte generic register load/store via materialized HL

Current ad-hoc byte fallback paths:

- load:
  - `materializeEaAddressToHL(...)`
  - raw `ld r, (hl)`
- store:
  - `materializeEaAddressToHL(...)`
  - raw `ld (hl), r`

Status:

- still present
- these are reasonable as generic fallbacks, but they should not be used for
  shapes already modeled by scalar accessors or `EA_*` + byte templates

Desired end state:

- keep only as terminal fallback
- confirm all scalar and valid indexed byte shapes stay on the documented path

Coverage:

- scalar byte paths: `test/pr405_byte_scalar_fast_paths.test.ts`,
  `test/pr405_byte_global_scalar_symbols.test.ts`,
  `test/pr405_byte_global_non_a_symbols.test.ts`
- indexed byte paths: `test/pr405_byte_indexed_templates.test.ts`
- byte call args: `test/pr405_byte_call_scalar_arg.test.ts`

### 3. Word stores after materialized HL address

Current ad-hoc fallback stores:

- `ld (hl), e ; inc hl ; ld (hl), d`
- `ld (hl), c ; inc hl ; ld (hl), b`
- `ex de, hl` wrapper for preserving HL during the `HL` source case

Status:

- still present in non-templated fallback branches
- partially aligned because they now use word accessor semantics, but they are
  still hand-written at the emitter level

Desired end state:

- replace these with a step-library-backed helper wherever possible
- leave only one generic fallback helper if a fully generic step path is not
  practical

Coverage:

- indexed BC path covered by `test/pr406_word_templates_regression.test.ts`
- scalar store paths covered by `test/pr406_word_scalar_accessors.test.ts`

### 4. IX/IY word load/store fallback

Current ad-hoc paths:

- load `IX` / `IY` from non-absolute EA:
  - materialize address
  - hand-written word load into HL
  - `push hl` / `pop ix|iy`
- store `IX` / `IY` to non-absolute EA:
  - `push ix|iy`
  - `pop de`
  - materialize address
  - hand-written store through HL

Status:

- still ad-hoc
- not yet covered by the step library

Desired end state:

- either add explicit step-library support for indexed-register pairs or mark
  these as intentional emitter-level exceptions

Coverage:

- none yet; needs a targeted regression before refactor

### 5. Stack-to-stack scalar mem->mem fast path

Current ad-hoc fast path for scalar stack-slot to stack-slot copies:

- byte:
  - `ld e, (ix+src)`
  - `ld (ix+dst), e`
- word:
  - `ld e, (ix+src)`
  - `ld d, (ix+src+1)`
  - `ld (ix+dst), e`
  - `ld (ix+dst+1), d`

Status:

- deliberately ad-hoc as a compact fast path
- does not go through `materializeEaAddressToHL`
- consistent with the no-IX-scratch rule

Desired end state:

- likely keep as an intentional optimization
- but document it as a retained exception and cover it directly

Coverage:

- partial indirect coverage today
- should get a dedicated regression if we keep it

## Verification strategy

Each removal step should follow the same sequence:

1. Add or tighten a narrow regression test first.
2. Assert the expected instruction shape.
3. Assert absence of the ad-hoc pattern being removed.
4. Replace one cluster only.
5. Run the narrow cluster tests plus smoke.

Minimum verification after each slice:

- `test/addressing_model_steps.test.ts`
- the focused PR405/PR406 regression files for the touched cluster
- `test/smoke_language_tour_compile.test.ts`

Before PR:

- run the broader addressing-model subset and confirm no coverage file was
  weakened to accommodate the change.

## Recommended removal order

1. Byte fallback routing audit (ensure remaining byte ad-hoc paths are truly
   terminal only)
2. Word store fallback consolidation (`STORE_RP_EA` helper use everywhere)
3. IX/IY word load/store decision (template support or explicit exception)
4. Dedicated stack-to-stack fast-path coverage
5. Final sweep: each remaining `emitRawCodeBytes(...)` in lowering should be
   justified as either:
   - direct encoding owned by the emitter
   - intentional compact fast path
   - temporary gap with a ticket
