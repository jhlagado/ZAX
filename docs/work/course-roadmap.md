# ZAX Course — Roadmap and Stream Classification

*Companion to `docs/design/zax-algorithms-course.md`*
*Status: active — updated per tranche*

This document classifies all course-driven follow-up work into three streams,
defines the first implementation tranche, and maintains the friction log as
examples are written.

---

## Stream Classification

### Language Stream Candidates

These are gaps surfaced by the course that may justify a language or compiler
change. None are pre-approved. Each requires friction evidence from actual
written examples before an issue is filed.

| Gap | Evidence | Tranche where it surfaces |
|---|---|---|
| Named exit / `break` from nested loop | Eight Queens backtracking requires an explicit flag variable to exit a nested `while` | Tranche 5 (Unit 8) |
| Pointer-typing ergonomics — `ptr<T>` or self-referential records | Linked list and BST require explicit `<Node>hl.next` cast at every traversal site; `next: ptr` carries no type information | Tranche 5 (Unit 7) |
| Software stack type or `stack` construct | RPN calculator (Unit 6) implements push/pop over a global `word[]` with manual index; verbose and error-prone. Quicksort (Tier 2) exposes the same gap but is not in the current tranche plan. | Tranche 5 (Unit 6); Tranche 2 if quicksort is added |

**Process rule**: do not file a language issue based on this table alone. The
issue is filed when the written example exists and the workaround is documented
in the friction log below. Speculation is not evidence.

---

### Library / Support Stream

These are gaps that do not require a language change — they require a standard
idiom, `op` definition, or utility module that does not yet exist. They belong
in a separate library workstream, not in the compiler or spec.

| Gap | Form | Surfaces in |
|---|---|---|
| Pointer-advance idiom | `op fetch_advance(dst: reg8)` — `ld dst, (hl)` / `inc hl` | Unit 2 (strings) |
| 16-bit add to non-HL pair | `op add16(dst: DE, ...)` / `op add16(dst: BC, ...)` | Unit 1 (sorting) |
| Byte swap | `op swap_bytes(a: reg8, b: reg8)` | Unit 1 (bubble sort) |
| Null-sentinel convention | Convention doc / named constant `NULL = 0` | Unit 7 (linked list) |
| Fixed-pool allocator | `op pool_alloc` / bump-allocator pattern over a typed array | Unit 7 (linked list, BST) |

These `op` definitions are course-local until they recur across enough examples
to justify a shared module. The library workstream is separate from the
language/compiler roadmap.

---

### Course / Example Stream

The examples themselves, organized by tranche. This is the primary work queue.

| Tranche | Unit | Files | Status |
|---|---|---|---|
| 1 | 0 — Foundations | `power`, `gcd_iterative`, `gcd_recursive`, `sqrt_newton`, `exp_squaring`, `fibonacci`, `digits` | complete |
| 2 | 1 — Arrays and Loops | `insertion_sort`, `bubble_sort`, `selection_sort`, `binary_search`, `linear_search`, `prime_sieve` | in progress |
| 3 | 2 — Strings | `strlen`, `strcpy`, `strcmp`, `strcat`, `str_reverse`, `atoi`, `itoa` | pending |
| 3 | 4 — Records | `ring_buffer` (init, push, pop, predicates) | pending |
| 4 | 3 — Bit Patterns | `popcount`, `bit_reverse`, `parity`, `getbits` | pending |
| 4 | 5 — Recursion | `hanoi`, `array_sum_recursive`, `array_reverse_recursive` | pending |
| 5 | 6 — Composition | `rpn_calculator` | pending |
| 5 | 7 — Pointer Structures | `linked_list`, `bst` | pending |
| 5 | 8 — Gaps and Futures | `eight_queens` | pending |

---

## First Implementation Tranche

**Tranche 1: Unit 0 — Foundations**

All files go under `examples/course/unit0/`. Each must:
- compile clean against current `main`
- use `move` throughout for typed storage
- declare return registers explicitly
- match the style of `examples/language-tour/02_fibonacci_args_locals.zax`
- include a header comment stating algorithm source (K&R §x or Wirth Ch.x)

**What can be expressed cleanly today**: everything in Unit 0. Pure arithmetic,
no arrays, no records, no pointer operations. The entire current ZAX surface is
available and none of it is required beyond `func`, `while`, `if`, `move`,
`const`, and basic Z80 arithmetic instructions.

**What support surface is needed**: none. Unit 0 has no library dependencies.

**What to log as friction**: anything that resists clean expression. Expected:
nothing in Unit 0. If friction appears here, it is a fundamental signal.

**Compiler validation**: after each file, run:
```sh
npm run zax -- examples/course/unit0/<file>.zax
```
Inspect the `.asm` output. A clean example should produce a readable Z80
instruction sequence with no unexpected spill/reload pairs.

---

## Friction Log

*Entries added as tranches are completed. Format defined in the course doc §10.*

### [Unit 1] Named-constant local initialization

**Workaround**: local `var` initializers that wanted a named constant such as
`LastIndex` were rewritten as imperative setup in the function body, e.g.
`ld hl, LastIndex` / `move high_index, hl` or `ld a, LastIndex` /
`move pass_last, a`.
**Desired expression**: allow named constants in local `var` initializers, e.g.
`high_index: word = LastIndex`.
**Gap type**: language
**Recurrence**: surfaced in at least `binary_search.zax` and `bubble_sort.zax`
during Unit 1 authoring.
**Priority signal**: common pattern; directly harms readability of algorithm
setup.

### [Unit 1] Typed-storage `move` vs immediate loads

**Workaround**: keep raw `ld` for register/immediate loads and reserve `move`
for typed storage, e.g. `ld a, LastIndex` followed by `move pass_last, a`.
**Desired expression**: none established yet. This currently looks like the
intended language boundary rather than a defect.
**Gap type**: style
**Recurrence**: recurring in Unit 1 array examples.
**Priority signal**: low; teach the boundary explicitly rather than open a
language issue now.

### [Unit 1] No `move` register-to-register conversion forms

**Workaround**: use raw `ld` when examples need register-to-register transfer.
This is especially visible when promoting an 8-bit value into a 16-bit register
pair or extracting the low byte of a pair into an 8-bit register.
**Desired expression**: discuss whether a narrow `move` extension should exist
for conversion-like forms only, e.g. 8-bit to 16-bit promotion with zeroing of
the high byte, or 16-bit pair to 8-bit low-byte extraction. Do not broaden
`move` into a general raw register-transfer replacement for `ld`.
**Gap type**: language candidate / design discussion
**Recurrence**: present but not yet dominant in Unit 1.
**Priority signal**: medium-low; worth recording and discussing, but not yet a
clear issue candidate.

### [Unit 1] Byte-array swap/load-store scaffolding

**Workaround**: keep byte-array swap and load/store helper patterns inline in
each sorting example instead of factoring shared helpers.
**Desired expression**: a small shared `op` library if the same scaffolding
recurs across enough Unit 1/2 files.
**Gap type**: library
**Recurrence**: recurring across the sorting examples.
**Priority signal**: medium; likely a support-library candidate after Unit 1 is
complete, but not before.

### [Unit 2] Pointer-advance idiom

**Workaround**: make the pattern explicit with a local helper `op`, e.g.
`copy_and_advance(src_ptr: HL, dst_ptr: DE)` in `strcpy.zax`, while other files
still spell out the raw `ld` / `inc` sequence inline.
**Desired expression**: likely a small shared helper-op surface once recurrence
across Unit 2 is fully measured.
**Gap type**: library
**Recurrence**: recurring across the string examples.
**Priority signal**: medium-high; this is now concrete and should be reviewed
as a likely support-library candidate after the tranche settles.

### [Unit 2] Arithmetic helper recurrence in string conversion

**Workaround**: keep helpers like `times_ten` and `div_u16` local to `atoi.zax`
and `itoa.zax`.
**Desired expression**: not a language feature; possibly a later shared helper
surface if the same arithmetic scaffolding recurs outside string conversion.
**Gap type**: library
**Recurrence**: present in `atoi.zax` and `itoa.zax`, not yet broadly enough to
justify extraction.
**Priority signal**: medium-low; record it, but do not split it into a helper
stream yet.

### [Unit 2] Typed-storage `move` vs raw pointer/immediate work

**Workaround**: use `move` for typed storage and raw `ld` for pointer-register
and immediate work in the string loops.
**Desired expression**: none established yet. This still reads as the intended
language boundary, not a defect.
**Gap type**: style
**Recurrence**: recurring across Unit 2.
**Priority signal**: low; teach it explicitly rather than open a language
issue.

### [Unit 4] Aggregate zero-initializer friction

**Workaround**: rely on implicit zero initialization for `Entry[5]` instead of
writing an explicit `= {}` aggregate initializer in the declaration.
**Desired expression**: clarify or extend aggregate initializer support for this
case if examples keep wanting explicit zero-initialized aggregate declarations.
**Gap type**: language candidate / design clarification
**Recurrence**: currently observed in `ring_buffer.zax`.
**Priority signal**: medium-low; real example pressure exists, but only from one
example so far.

---

## Issue-Ready Sequence

When the friction log has entries, this section will contain the recommended
filing sequence. No issues are filed until the friction is grounded in actual
written and compiled examples.

**Anticipated categories** (not yet filed):

1. **Course example files** — one issue per unit, filed when the tranche is
   ready to start. Issue contains the file list, style requirements, and a
   checklist. These are course/example stream.

2. **Standard `op` library candidates** — filed after Unit 2 or 3 confirms
   which `op` definitions recur across multiple files. Library stream.

3. **Named exit / `break`** — filed after Eight Queens is written and the
   flag-variable workaround is documented. Language stream candidate.

4. **Pointer-typing ergonomics** — filed after linked list and BST are written
   and the explicit-cast friction is measured across both. Language stream
   candidate. Not filed before then.

5. **Software stack idiom** — filed after RPN calculator and quicksort are
   written and the manual push/pop verbosity is documented. May resolve as a
   library `op` pattern rather than a language change. Stream TBD.
