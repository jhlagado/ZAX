---
layout: default
title: "Chapter 15 — The Test Suite"
parent: "Part VII — Quality and Design"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[← Diagnostics](../part6/14-diagnostics.md) | [Part VII](index.md) | [Cross-Cutting Concerns →](16-cross-cutting-concerns.md)

# Chapter 15 — The Test Suite

### Structure

Tests live in `test/` and use a standard test runner (Vitest/Jest-compatible). They are organised by area:

```
test/
├── language-tour/     # End-to-end golden tests (.zax → compare bytes/symbols)
├── frontend/          # Parser unit tests (grammar conformance, drift detection)
├── lowering/          # Lowering unit tests (addressing pipelines, op expansion, etc.)
├── backend/           # Z80 encoding tests
├── helpers/           # Shared test utilities
└── pr<NNN>_*.test.ts  # Regression tests keyed to a PR
```

### Golden Tests (`language-tour/`)

Each `.zax` file in `language-tour/` has a matching `.d8.json` committed alongside it. The test runner compiles the `.zax` source and compares the output symbol table and entry-point against the golden JSON. These tests exercise the full end-to-end pipeline.

### PR Regression Tests

`pr<NNN>_*.test.ts` files name-check specific features introduced in a given PR. They are typically narrow integration tests: compile a small snippet, check that specific bytes appear at specific offsets, or check that a specific diagnostic is emitted.

### Unit Tests

`test/lowering/` contains deeply focused unit tests for internal modules — e.g. `pr509_addressing_pipeline_builders.test.ts` tests the step-pipeline construction helpers in isolation. `test/frontend/pr762_grammar_data_conformance.test.ts` verifies that the grammar data tables stay in sync with the parser.

### `test/helpers/`

Shared utilities for constructing minimal `CompileEnv` objects, running the parser on a snippet, or invoking just the encoder on a single instruction node.

---

---

[← Diagnostics](../part6/14-diagnostics.md) | [Part VII](index.md) | [Cross-Cutting Concerns →](16-cross-cutting-concerns.md)
