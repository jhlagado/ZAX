# ZAX v0.1 Spec Audit Matrix (Tranche 1)

This document maps `docs/zax-spec.md` requirements to implementation evidence (tests/fixtures) or explicit current limits.

Scope of this tranche:

- Core assembler pipeline and language constructs used by current examples.
- Hard evidence via existing automated tests.
- Explicitly called out gaps where the spec is broader than current implementation.

Legend:

- `Implemented`: behavior exists and has test evidence.
- `Implemented (subset)`: behavior exists with explicit subset limits.
- `Intentionally rejected`: parser/lowering emits stable diagnostics.
- `Open`: not yet fully validated against spec text.

## 1) Lexical + Program Structure

| Spec area                                       | Status               | Evidence                                                                                                         |
| ----------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `1.3` identifiers / keyword parsing             | Implemented          | `test/pr4_negative.test.ts`, `test/pr30_case_without_select.zax` (via structured-control parser tests)           |
| `1.4` literals (`dec/hex/bin/char`)             | Implemented (subset) | `test/pr2_binary_literals.test.ts`, `test/pr35_char_literals.test.ts`, `test/pr36_imm_char_escape_forms.test.ts` |
| `2.1` module file shape                         | Implemented          | `test/pr1_minimal.test.ts`, `test/examples_compile.test.ts`                                                      |
| `2.2` sections + counters + overlap diagnostics | Implemented          | `test/pr9_sections_align.test.ts`                                                                                |

## 2) Imports + Names

| Spec area                               | Status               | Evidence                                                       |
| --------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `3.1` import syntax/resolution          | Implemented          | `test/pr10_imports.test.ts`, `test/pr11_include_dirs.test.ts`  |
| `3.2` collisions/visibility diagnostics | Implemented (subset) | `test/pr3_var_duplicates.test.ts`, `test/pr4_negative.test.ts` |

## 3) Types + Data

| Spec area                                     | Status               | Evidence                                                                                    |
| --------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `4.1` scalar built-ins (`byte/word/addr/ptr`) | Implemented          | `test/semantics_layout.test.ts`, `test/pr52_ptr_scalar_slots.test.ts`                       |
| `4.2` aliases + size usage                    | Implemented (subset) | `test/pr8_sizeof.test.ts`                                                                   |
| `4.3` enums                                   | Implemented          | `test/pr4_enum.test.ts`                                                                     |
| `4.4` consts                                  | Implemented          | `test/pr2_const_data.test.ts`, `test/pr2_div_zero.test.ts`                                  |
| `5.1` arrays (fixed + inferred for `data`)    | Implemented (subset) | `test/pr51_data_inferred_array_len.test.ts`, `test/pr54_inferred_array_len_invalid.test.ts` |
| `5.2` records                                 | Implemented (subset) | `test/semantics_layout.test.ts`                                                             |
| `5.3` unions                                  | Implemented (subset) | `test/pr50_union_field_access.test.ts`                                                      |
| `6.2` `var` storage                           | Implemented          | `test/pr3_var_layout.test.ts`                                                               |
| `6.3` `data` storage                          | Implemented          | `test/pr2_const_data.test.ts`                                                               |
| `6.4` `bin` / `hex` ingestion                 | Implemented          | `test/pr17_bin_hex_ingestion.test.ts`                                                       |
| `6.5` `extern ... at`                         | Implemented          | `test/pr12_calls.test.ts`                                                                   |

## 4) Expressions + Fixups

| Spec area                               | Status               | Evidence                                                                                                   |
| --------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `7.0` forward refs + fixups             | Implemented          | `test/pr37_forward_label_fixups.test.ts`, `test/pr37_fixup_negative.test.ts`                               |
| `7.1` `imm` arithmetic/eval diagnostics | Implemented (subset) | `test/pr2_binary_literals.test.ts`, `test/pr2_div_zero.test.ts`, `test/pr35_char_literals_invalid.test.ts` |
| `7.2` `ea` forms                        | Implemented (subset) | `test/pr43_ld_mem_imm8.test.ts`, `test/pr48_ld_mem_imm16.test.ts`, `test/parser_nested_index.test.ts`      |

## 5) Functions + Calling + Stack

| Spec area                                   | Status               | Evidence                                                                       |
| ------------------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `8.1` function declarations                 | Implemented          | `test/pr1_minimal.test.ts`, `test/pr12_calls.test.ts`                          |
| `8.2` calling convention (current subset)   | Implemented (subset) | `test/pr12_calls.test.ts`, `test/pr52_ptr_scalar_slots.test.ts`                |
| `8.3` asm-call lowering (`func` / `extern`) | Implemented (subset) | `test/pr12_calls.test.ts`                                                      |
| `8.4` locals + epilogue rewriting           | Implemented          | `test/pr14_frame_epilogue.test.ts`, `test/pr23_lowering_safety.test.ts`        |
| `8.5` SP mutation safety checks             | Implemented (subset) | `test/pr23_lowering_safety.test.ts`, `test/pr92_lowering_interactions.test.ts` |

## 6) Ops + Structured Control

| Spec area                                                  | Status               | Evidence                                                                          |
| ---------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `9.2/9.3/9.4` `op` definitions + matcher/overload behavior | Implemented (subset) | `test/pr16_ops.test.ts`                                                           |
| `9.5` autosave/clobber policy                              | Implemented (subset) | `test/pr16_ops.test.ts`, `test/pr23_lowering_safety.test.ts`                      |
| `10.1/10.2` `if/while/repeat/select`                       | Implemented          | `test/pr15_structured_control.test.ts`                                            |
| `10.2.1` stacked `case` labels                             | Implemented          | `test/pr15_structured_control.test.ts` (`pr28_*` fixtures)                        |
| control-flow stack join diagnostics                        | Implemented          | `test/pr15_structured_control.test.ts`, `test/pr92_lowering_interactions.test.ts` |

## 7) ISA + Output Contracts

| Spec area                                     | Status               | Evidence                                                                                                                                                           |
| --------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ISA core + advanced subsets                   | Implemented (subset) | `test/pr24_isa_core.test.ts`, `test/pr25_isa_advanced.test.ts`, `test/pr56_isa_misc.test.ts`, `test/pr57_isa_im_rst.test.ts`, `test/pr91_isa_hl16_adc_sbc.test.ts` |
| indexed/ED block/system instruction slices    | Implemented (subset) | `test/isa_indexed_*.test.ts`, `test/isa_block_*.test.ts`, `test/isa_ed_misc.test.ts`                                                                               |
| `.hex/.bin/.d8dbg.json/.lst` artifact outputs | Implemented          | `test/cli_artifacts.test.ts`, `test/pr39_listing.test.ts`                                                                                                          |
| determinism                                   | Implemented          | `test/determinism_artifacts.test.ts`                                                                                                                               |

## 8) Known Open Items (next audit tranche)

1. Full line-by-line mapping of every normative sentence in `docs/zax-spec.md` to:
   - test evidence, or
   - explicit rejection diagnostic text.
2. Parser recovery and diagnostic span consistency audit for malformed nested constructs.
3. Remaining ISA surface reconciliation against spec examples and Appendix requirements.
4. Explicit gap list for unsupported `ea` lowering forms and non-encodable operand rewrites.
