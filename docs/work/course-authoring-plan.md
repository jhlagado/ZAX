# ZAX Course Authoring Plan

Status: active writing brief
Audience: course author, writer, editor

## Purpose

This document consolidates the current course-writing plan into one operational brief.
It is the canonical handoff for prose-first course writing.

Use this document together with the current example sources. Do not reconstruct the
course shape from scattered design notes.

## Canonical sources

Use these as the authority for course planning and current syntax:

- `docs/design/zax-algorithms-course.md` — course rationale, goals, style direction
- `docs/work/course-roadmap.md` — unit inventory, tranche status, and friction log
- `docs/spec/zax-spec.md` — normative language surface
- `docs/reference/ZAX-quick-guide.md` — practical syntax reference
- `examples/course/` — canonical course example corpus on `main`

Important warning: `docs/design/zax-algorithms-course.md` still contains old `move`-era
examples and wording in some sections. Use it for rationale and course intent, not as a
syntax model. For actual language surface, current `main` examples plus the spec and quick
guide are authoritative.

If older design prose disagrees with the current examples/spec/reference, the current
examples/spec/reference win.

## Current language assumptions for the course

The course should assume the current active surface on `main`:

- `:=` is the assignment surface
- scalar path-to-path `:=` is available
- `succ` / `pred` are available for typed scalar paths and should be explained as language-level built-ins for scalar update
- `break` / `continue` are available
- `for` is deferred and must not be presented as part of the active course surface

Why `for` is deferred: current course examples are intentionally written with `while`, `break`, and `continue` because that is the settled, implemented loop surface on `main`. Do not imply that bounded iteration currently has a first-class `for` form.

Do not use older `move`-era prose as teaching guidance.

## Course output location

All prose course material should live under:

- `docs/course/`

Recommended file set:

- `docs/course/README.md`
- `docs/course/00-introduction.md`
- `docs/course/01-foundations.md`
- `docs/course/02-arrays-and-loops.md`
- `docs/course/03-strings.md`
- `docs/course/04-bit-patterns.md`
- `docs/course/05-records.md`
- `docs/course/06-recursion.md`
- `docs/course/07-composition.md`
- `docs/course/08-pointer-structures.md`
- `docs/course/09-gaps-and-futures.md`

## Unit mapping

Chapter numbers are offset from example unit numbers because `00-introduction.md` is a course introduction chapter, not an example unit.

- Chapter `00` = course introduction
- Chapter `01` maps to `examples/course/unit1/`
- Chapter `02` maps to `examples/course/unit2/`
- ...
- Chapter `09` maps to `examples/course/unit9/`

### 00 Introduction

Purpose:
- explain what ZAX is
- explain what this course is and is not
- explain the audience and assumptions
- explain why the course is organized around algorithms rather than features

### 01 Foundations

Purpose:
- establish the basic voice of ZAX through arithmetic, iteration, and small helper routines
- show assignment, scalar locals, and structured control before arrays and records

Examples:
- `examples/course/unit1/digits.zax`
- `examples/course/unit1/exp_squaring.zax`
- `examples/course/unit1/fibonacci.zax`
- `examples/course/unit1/gcd_iterative.zax`
- `examples/course/unit1/gcd_recursive.zax`
- `examples/course/unit1/power.zax`
- `examples/course/unit1/sqrt_newton.zax`

### 02 Arrays and Loops

Purpose:
- show indexed storage, loop structure, and small algorithmic invariants over arrays
- introduce the strongest early examples of `succ`, `pred`, and `break` / `continue` in ordinary search and sort code
- explicitly explain `break` and `continue` in this chapter, because this is where the reader first sees them as part of ordinary loop structure

Examples:
- `examples/course/unit2/insertion_sort.zax`
- `examples/course/unit2/bubble_sort.zax`
- `examples/course/unit2/selection_sort.zax`
- `examples/course/unit2/binary_search.zax`
- `examples/course/unit2/linear_search.zax`
- `examples/course/unit2/prime_sieve.zax`

### 03 Strings

Purpose:
- show pointer-like traversal over byte arrays and zero-terminated data
- explain where ZAX stays close to Z80 in raw memory-walking code

Examples:
- `examples/course/unit3/strlen.zax`
- `examples/course/unit3/strcpy.zax`
- `examples/course/unit3/strcmp.zax`
- `examples/course/unit3/strcat.zax`
- `examples/course/unit3/str_reverse.zax`
- `examples/course/unit3/atoi.zax`
- `examples/course/unit3/itoa.zax`

### 04 Bit Patterns

Purpose:
- show bitwise algorithms where the machine model is very visible
- keep the prose focused on algorithm shape rather than opcode-by-opcode narration

Examples:
- `examples/course/unit4/popcount.zax`
- `examples/course/unit4/bit_reverse.zax`
- `examples/course/unit4/parity.zax`
- `examples/course/unit4/getbits.zax`

### 05 Records

Purpose:
- show typed aggregate state and field-oriented update in a compact example
- explain how records change the feel of low-level code without hiding the machine

Examples:
- `examples/course/unit5/ring_buffer.zax`

### 06 Recursion

Purpose:
- show recursive decomposition and argument/local discipline over the IX frame model
- make the prose focus on structure and invariants, not just call mechanics

Examples:
- `examples/course/unit6/hanoi.zax`
- `examples/course/unit6/array_sum_recursive.zax`
- `examples/course/unit6/array_reverse_recursive.zax`

### 07 Composition

Purpose:
- show how larger behavior emerges from helper routines, typed storage, and a support module
- keep the lesson centered on the calculator example, not the helper internals

Examples:
- main lesson: `examples/course/unit7/rpn_calculator.zax`
- support module reference only: `examples/course/unit7/word_stack.zax`

`word_stack.zax` is not a standalone lesson chapter. It is support code that the prose may reference briefly when explaining how the calculator is assembled.

### 08 Pointer Structures

Purpose:
- show linked and tree-shaped data with explicit addresses, casts, and traversal
- explain both what works well and what still feels verbose in pointer-heavy ZAX

Examples:
- `examples/course/unit8/linked_list.zax`
- `examples/course/unit8/bst.zax`

### 09 Gaps and Futures

Purpose:
- use `eight_queens` as the capstone reading for control-flow pressure and design limits
- explain which parts of the program are now clearer because of `break` / `continue`
- connect the example back to the friction log and future language/library questions without turning the chapter into a roadmap dump

Examples:
- `examples/course/unit9/eight_queens.zax`

## Writing model

The course must be prose-oriented.

It is not:
- a reference manual
- a Z80 tutorial
- a sequence of full source listings with light commentary

It is:
- an algorithm-driven explanation of how ZAX expresses real programs
- a guided reading of the example corpus
- an editorial layer over the source files

### Per-chapter structure

Each chapter should generally contain, in this order:

1. a short opening overview
2. several prose sections grouped by problem family
3. a short `What this unit teaches about ZAX` section
4. an `Examples in this unit` list with file references
5. suggested exercises or modifications

Short code excerpts should be embedded where they materially help the prose. They are supporting material, not a standalone section and not a substitute for explanation.

### Per-example treatment

For each substantial example, prefer this sequence:

1. state the problem in plain language
2. explain the data model used in ZAX
3. explain the control-flow shape
4. explain the main ZAX idioms used
5. note any pressure points or awkwardness honestly
6. point the reader to the full source file

### Excerpt policy

Use short code excerpts.
Do not dump entire source files into the course.

Excerpts should support the prose, not replace it.

## Tone and style rules

The prose should be:
- clear
- deliberate
- explanatory
- concrete

The prose should not be:
- chatty
- tutorialized down to instruction-by-instruction narration
- overloaded with reference-style syntax detail

Comments about instructions should explain algorithmic purpose, invariants, or
structure, not what a single opcode does.

## Constraints for the writer

- use current syntax only
- do not teach `for`
- do not revive `move`
- do not introduce speculative language features as if they already exist
- do not copy old design-doc examples without checking current `main`
- do not treat support files such as `word_stack.zax` as standalone lessons unless
  the prose explicitly frames them as support material

## Phased writing plan

### Phase 1

Write these first:
- `docs/course/README.md`
- `docs/course/00-introduction.md`
- `docs/course/01-foundations.md`
- `docs/course/02-arrays-and-loops.md`

This phase is the style and structure checkpoint.
Do not write the rest of the course before this phase is reviewed.

Specific requirement for phase 1:
- `docs/course/02-arrays-and-loops.md` must explicitly explain `break` and `continue` as part of the loop discussion, using current course examples rather than abstract syntax-only prose.

### Phase 2

Write:
- `docs/course/03-strings.md`
- `docs/course/04-bit-patterns.md`
- `docs/course/05-records.md`
- `docs/course/06-recursion.md`

### Phase 3

Write:
- `docs/course/07-composition.md`
- `docs/course/08-pointer-structures.md`
- `docs/course/09-gaps-and-futures.md`

For `09-gaps-and-futures.md`, explicitly use the friction log in `docs/work/course-roadmap.md` as source material. The chapter should connect `eight_queens` and the pointer/composition units back to real design pressure already recorded there.

### Phase 4

Editorial pass:
- consistency of tone
- cross-links between chapters
- example-file references checked
- syntax surface checked against `main`

## Writer handoff summary

The writer should be told:
- the output is a prose-first course under `docs/course/`
- phase 1 is the first deliverable
- current examples on `main` are the source truth for what is being taught
- `for` is deferred and must stay out of the active teaching surface
- review should happen after phase 1 before the full course is drafted
