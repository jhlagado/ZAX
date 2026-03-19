# Intro Course Authoring Plan

Status: active writing brief for the planned beginner-first volume
Audience: course author, writer, editor, reviewer

## Purpose

This document is the operational handoff for writing the beginner-facing course
under `docs/intro/`.

It governs Volume 1 only.

The advanced practical-programming volume remains under `docs/course/` and is
covered separately by `docs/work/course-authoring-plan.md`.

## Mandatory standards

Writers and reviewers must use these documents together:

- `docs/work/course-writing-standard.md` — editorial and review gate
- `docs/work/z80-intro-course-plan.md` — course structure and chapter scope
- `docs/design/z80-programming-with-zax.md` — reader model and two-volume direction
- `docs/work/platform-course-strategy.md` — broader platform and media direction

If these documents disagree, `docs/work/z80-intro-course-plan.md` is the
operational plan and `docs/work/course-writing-standard.md` is the editorial
gate.

## Output location

All prose for Volume 1 lives under:

- `docs/intro/`

Planned file set:

- `docs/intro/README.md`
- `docs/intro/00-what-a-computer-is-doing.md`
- `docs/intro/01-numbers-and-registers.md`
- `docs/intro/02-loading-storing-constants.md`
- `docs/intro/03-flags-comparisons-jumps.md`
- `docs/intro/04-counting-loops-and-djnz.md`
- `docs/intro/05-data-tables-and-indexed-access.md`
- `docs/intro/06-stack-and-subroutines.md`
- `docs/intro/07-a-phase-a-program.md`
- `docs/intro/08-typed-storage-and-assignment.md`
- `docs/intro/09-structured-control-flow.md`
- `docs/intro/10-functions-arguments-and-op.md`

## Canonical sources

Use these as the authority for planning and current syntax:

- `docs/work/course-writing-standard.md`
- `docs/work/z80-intro-course-plan.md`
- `docs/design/z80-programming-with-zax.md`
- `docs/design/text-include.md`
- `docs/spec/zax-spec.md`
- `docs/reference/ZAX-quick-guide.md`
- `examples/` and future intro examples on `main`

For language behaviour, the spec and real examples on `main` win over design
prose.

## Hard boundary for Phase A

Chapters `00` through `07` are the raw-first phase.

Do not introduce these in Phase A prose or examples as normal teaching surface:

- typed locals
- function arguments in the ZAX style
- typed storage and `:=`
- structured `if`
- structured `while`
- `succ` / `pred`
- `break` / `continue`
- `op`
- module `import`
- `for`

Phase A may mention later constructs only as forward references, not as active
surface.

## Loop constraints

- `djnz` is the counted-loop entry point for Phase A
- `while` is introduced later as the first structured loop relief
- `repeat ... until` appears only if the example corpus yields a clearly better
  must-run-once case
- `for` is deferred and must not appear as implemented surface

## Gating prerequisites before drafting

Before Chapters `03` and `04` are drafted, these must be true:

1. raw label/jump support is confirmed for user-defined labels with:
   - `jp`
   - `jr`
   - `djnz`
   - `call`
2. the target hardware platform decision is recorded

Current recorded decision:

- Phase A uses a generic / abstract Z80 target rather than a machine-specific
  ROM or monitor environment
- examples demonstrate results through register state, memory state, and
  generated output

Before cross-file early examples are drafted, this may need review:

3. whether a text-level `include` feature is actually needed, or whether the
   examples stay clean without it on the generic platform plan

## Writer contract per chapter

Before drafting any chapter, the writer must name:

- the exact concept being introduced
- the exact example file or files carrying it
- the exact reader understanding expected at the end of the chapter

If any of the three is unclear, the chapter is not ready to draft.

## Chapter intent map

### `00-what-a-computer-is-doing.md`

- explain what machine code, assembly language, bytes, words, and memory are
- establish the reader model and how Volume 1 differs from Volume 2
- no structured ZAX surface yet

### `01-numbers-and-registers.md`

- binary, hexadecimal, signed vs unsigned, two's complement
- Z80 registers and register pairs
- why flags matter

### `02-loading-storing-constants.md`

- raw `ld`
- labels and named addresses
- constants and simple storage locations

### `03-flags-comparisons-jumps.md`

- `cp`, `or a`, flag tests
- `jp`, `jr`, conditional control flow with labels
- explicit branch structure before any structured `if`

### `04-counting-loops-and-djnz.md`

- `djnz` as the counted-loop primitive
- loop labels and branch-back shape
- zero-count semantics as a real hardware teaching point

### `05-data-tables-and-indexed-access.md`

- `db`, `dw`, tables, indexed reads
- HL and IX style indexed access in raw form

### `06-stack-and-subroutines.md`

- `call`, `ret`, `push`, `pop`
- raw calling convention and register preservation

### `07-a-phase-a-program.md`

- integrate Phase A into one real raw-first program
- intentionally expose the bookkeeping cost that motivates Phase B

### `08-typed-storage-and-assignment.md`

- first introduction of typed storage and `:=`
- relief from handwritten offsets and repetitive load/store paths

### `09-structured-control-flow.md`

- `if`, `while`, then `break` / `continue`
- direct comparison against Phase A jump-heavy versions

### `10-functions-arguments-and-op.md`

- arguments, locals, and `op`
- final bridge into the advanced practical-programming volume

## Writing phases

### Phase 1

- `docs/intro/README.md`
- `docs/intro/00-what-a-computer-is-doing.md`
- `docs/intro/01-numbers-and-registers.md`
- `docs/intro/02-loading-storing-constants.md`
- `docs/intro/03-flags-comparisons-jumps.md`

### Phase 2

- `docs/intro/04-counting-loops-and-djnz.md`
- `docs/intro/05-data-tables-and-indexed-access.md`
- `docs/intro/06-stack-and-subroutines.md`
- `docs/intro/07-a-phase-a-program.md`

### Phase 3

- `docs/intro/08-typed-storage-and-assignment.md`
- `docs/intro/09-structured-control-flow.md`
- `docs/intro/10-functions-arguments-and-op.md`

## Verification expectations

For any chapter PR:

- all named `.zax` example paths must exist on `main`
- prose must pass `docs/work/course-writing-standard.md`
- if example files are added or changed, run `npm run typecheck`
- if the chapter depends on a raw-form claim, verify it against real generated
  output before merge
