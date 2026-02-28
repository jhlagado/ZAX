## Addressing gaps snapshot (2026-02-27)

Context: language-tour smoke tests now cover many new examples (30–69). Some forms fail despite being spec-valid (per `docs/zax-spec.md` and `docs/addressing-model.md`).

### Observed behavior

- **Globals (`globals` block) + bare names work:** e.g., `03_globals_and_aliases.zax`, `14_ops_and_calls.zax` use `ld hl, counter` / `ld counter, new_value` and compile.
- **`data` block + parens works:** e.g., `10_arrays_and_indexing.zax` uses `ld a, (bytes10[0])`, `ld hl, (words4[idx])` and compiles.
- **`data` block + bare names fails (ZAX200):** examples 30, 32, 34–36, 40, 43, 60–62, 66, 69 use `ld a, glob_b` / `ld glob_w, hl` (no parens) and currently fail.
- **Array parameters from globals fail (ZAX300):** examples 37–39, 41–42, 63–65, 67–68 pass a global array to a `byte[]/word[]` parameter and are rejected as “incompatible non-scalar argument”.

### Likely gaps vs spec

1. **Bare variable names in `ld`** should work for any variable (global/data/fvar/arg) without requiring parentheses. Today, bare names are only accepted for `globals`; `data` symbols require parens.
2. **Array argument compatibility** should allow global arrays to bind to `byte[]/word[]` parameters; currently the call checker disallows non-scalar arguments unless they are already address-style.

### Next actions (small, targeted)

- Extend lowering/encode to treat `data` symbols like `globals` for `ld r8, sym` / `ld sym, r8` / reg16 forms (no parens required).
- Relax call argument checking to accept global arrays for array parameters.
- Re-run `test/smoke_language_tour_compile.test.ts` after each change.

This doc is a working note to avoid losing the current scope; update or remove once gaps are closed.

