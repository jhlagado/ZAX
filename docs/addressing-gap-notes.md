## Addressing gaps snapshot (2026-02-27)

Context: language-tour smoke tests now cover many new examples (30–69). Some forms fail despite being spec-valid (per `docs/zax-spec.md` and `docs/addressing-model.md`).

### Current state (after tour syntax cleanup)

- Language-tour examples 30–69 now use spec-legal syntax (no `data ... end`, no `high/low` pseudo-ops); all functions are properly terminated with `end`.
- Remaining compile failures come from implementation gaps, not example syntax.

### Observed behavior (still failing)

- **Bare `data` symbols rejected (ZAX200):** Tour examples that do `ld a, glob_b` / `ld glob_w, hl` (no parens) still fail because the compiler only accepts bare names for `globals`. `data` names require parens today.
- **Array arguments rejected (ZAX300):** Passing a global array to a `byte[]/word[]` parameter is rejected as “incompatible non-scalar argument.”
- **Word EA with HL index incorrect:** EAW path for reg16=HL builds base+CALC_EA_2 without loading HL with the index, so EA is wrong for `...[hl]` word cases.
- **Template S_HL (fixed in doc) must stay correct in code:** Ensure the implementation matches the normative doc (save value, keep EA in HL, store, restore DE).

### Required implementation fixes

1. Allow bare `data` symbols in ld/st (same as `globals`) for scalar loads/stores and reg16 forms.
2. Relax call argument checking to allow global arrays to bind to array parameters (`byte[]`/`word[]`).
3. Fix EAW reg16=HL path: use incoming HL as index (add hl,hl; base in DE; add hl,de).
4. Keep S_HL store semantics in code aligned with `addressing-model.md`.

### Next actions (small, targeted)

- Extend lowering/encode to treat `data` symbols like `globals` for `ld r8, sym` / `ld sym, r8` / reg16 forms (no parens).
- Relax call argument checking to accept global arrays for array parameters.
- Fix EAW HL-index EA computation per normative doc.
- Re-run `test/smoke_language_tour_compile.test.ts` after each change; all tour examples should compile cleanly once the above are fixed.

This doc is a working note to avoid losing the current scope; update or remove once gaps are closed.
