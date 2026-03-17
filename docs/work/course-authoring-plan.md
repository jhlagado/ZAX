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
- `docs/work/course-roadmap.md` — unit inventory and stream status
- `docs/spec/zax-spec.md` — normative language surface
- `docs/reference/ZAX-quick-guide.md` — practical syntax reference
- `examples/course/` — canonical course example corpus on `main`

If older design prose disagrees with the current examples/spec/reference, the current
examples/spec/reference win.

## Current language assumptions for the course

The course should assume the current active surface on `main`:

- `:=` is the assignment surface
- scalar path-to-path `:=` is available
- `succ` / `pred` are available for typed scalar paths
- `break` / `continue` are available
- `for` is deferred and must not be presented as part of the active course surface

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

### 00 Introduction

Purpose:
- explain what ZAX is
- explain what this course is and is not
- explain the audience and assumptions
- explain why the course is organized around algorithms rather than features

### 01 Foundations

Examples:
- `examples/course/unit0/digits.zax`
- `examples/course/unit0/exp_squaring.zax`
- `examples/course/unit0/fibonacci.zax`
- `examples/course/unit0/gcd_iterative.zax`
- `examples/course/unit0/gcd_recursive.zax`
- `examples/course/unit0/power.zax`
- `examples/course/unit0/sqrt_newton.zax`

### 02 Arrays and Loops

Examples:
- `examples/course/unit1/insertion_sort.zax`
- `examples/course/unit1/bubble_sort.zax`
- `examples/course/unit1/selection_sort.zax`
- `examples/course/unit1/binary_search.zax`
- `examples/course/unit1/linear_search.zax`
- `examples/course/unit1/prime_sieve.zax`

### 03 Strings

Examples:
- `examples/course/unit2/strlen.zax`
- `examples/course/unit2/strcpy.zax`
- `examples/course/unit2/strcmp.zax`
- `examples/course/unit2/strcat.zax`
- `examples/course/unit2/str_reverse.zax`
- `examples/course/unit2/atoi.zax`
- `examples/course/unit2/itoa.zax`

### 04 Bit Patterns

Examples:
- `examples/course/unit3/popcount.zax`
- `examples/course/unit3/bit_reverse.zax`
- `examples/course/unit3/parity.zax`
- `examples/course/unit3/getbits.zax`

### 05 Records

Examples:
- `examples/course/unit4/ring_buffer.zax`

### 06 Recursion

Examples:
- `examples/course/unit5/hanoi.zax`
- `examples/course/unit5/array_sum_recursive.zax`
- `examples/course/unit5/array_reverse_recursive.zax`

### 07 Composition

Examples:
- `examples/course/unit6/rpn_calculator.zax`
- support reference: `examples/course/unit6/word_stack.zax`

### 08 Pointer Structures

Examples:
- `examples/course/unit7/linked_list.zax`
- `examples/course/unit7/bst.zax`

### 09 Gaps and Futures

Examples:
- `examples/course/unit8/eight_queens.zax`

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

Each chapter should generally contain:

1. a short opening overview
2. several sections grouped by problem family
3. focused code excerpts only where they materially help
4. a section on what the unit teaches about ZAX
5. a list of example files in the unit
6. suggested exercises or modifications

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
