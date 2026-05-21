---
layout: default
title: "Understanding the ZAX Compiler"
nav_order: 4
has_children: true
---
# Understanding the ZAX Compiler

A chapter-by-chapter engineering reference for the ZAX structured assembler. Covers every phase of the compilation pipeline — from source text to Z80 machine code — with enough detail to understand, modify, or extend the compiler.

> **Audience** — Someone reading the ZAX source code for the first time and wanting a coherent mental model before diving in. By the end you should be able to open any file in `src/`, understand which phase it belongs to, why it exists, and how it connects to its neighbours.

---

## [Part I — Orientation](part1/)

What ZAX is, how the repository is laid out, the full compilation pipeline at a glance, and a running example that we trace through every subsequent chapter.

---

## [Part II — Entry Points and Module Loading](part2/)

The command-line interface and the `compile()` pipeline coordinator. How source files are read from disk, includes are expanded, imports are resolved, and the program tree is assembled.

---

## [Part III — The Frontend](part3/)

Everything from raw text to a fully populated AST: logical-line splitting, grammar data tables, the parser entry point, dispatch to per-keyword handlers, ASM body parsing, and the immediate/effective-address expression parsers.

---

## [Part IV — Semantics](part4/)

Building the `CompileEnv` from the AST: constant and type collection, compile-time expression evaluation, type-layout computation, and the two pre-lowering validation passes.

---

## [Part V — Lowering](part5/)

The largest subsystem. The four-phase pipeline that converts the AST and compile environment into machine-code bytes: workspace setup, prescan, declaration lowering, and finalization. Covers function frames, instruction dispatch, the `ld` sub-pipeline, op expansion, value materialisation, and fixup resolution.

---

## [Part VI — Supporting Systems](part6/)

The pure Z80 instruction encoder, the Lowered-ASM intermediate representation, the output format writers (`.bin`, `.hex`, `.lst`, `.d8.json`, `.z80`), and the diagnostics system.

---

## [Part VII — Quality and Design](part7/)

The test suite structure, golden tests, PR regression tests, and the cross-cutting design patterns that appear throughout the codebase.

---

## [Appendices](appendices/)

Quick-reference tables for engineers navigating the source.

---

> **Mermaid diagrams** — This book is Mermaid-ready. All ` ``` `mermaid` ``` ` fenced blocks render as live diagrams in the hosted site. Future revisions will add flowcharts for the pipeline stages, sequence diagrams for phase interactions, and state diagrams for the control-flow frame stack.
