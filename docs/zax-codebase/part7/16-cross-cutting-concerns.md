---
layout: default
title: "Chapter 16 — Cross-Cutting Concerns and Design Patterns"
parent: "Part VII — Quality and Design"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 2
---
[← The Test Suite](15-the-test-suite.md) | [Part VII](index.md) | [File Reference →](../appendices/a-file-reference.md)

# Chapter 16 — Cross-Cutting Concerns and Design Patterns

### Discriminated Unions for AST Nodes

Every AST node type uses a `kind: 'SomeString'` discriminant. TypeScript's control-flow narrowing means any `switch (node.kind)` is exhaustively checked. If you add a new node variant to `ast.ts` you will get type errors wherever the existing exhaustive switches live — a built-in safety net.

### Mutable Reference Objects (`{ current: T }`)

The lowering code uses `{ current: T }` objects for values that are shared and mutated across closures — for example, `codeOffsetRef: { current: number }`. This pattern avoids closure capture issues when passing offsets between helpers and makes mutation explicit at the call site (`codeOffsetRef.current += bytes.length`).

### Best-Effort Parsing and Error Recovery

The parser never throws on bad input. Instead it calls `parseDiag()` to append an error and returns a `{ nextIndex }` that advances past the bad line. `parseParserRecovery.ts` collects recovery strategies for common mistake patterns (missing `end`, unrecognised keyword, etc.) and tries to emit a helpful diagnostic rather than just "parse error".

### Phase Gating with `hasErrors()`

`compile.ts` calls `hasErrors(diagnostics)` after every major phase. This keeps error messages clean: if the parser fails you never see lowering errors caused by a broken AST.

### Separation of Type Contracts from Logic

`ast.ts`, `loweringTypes.ts`, `loweredAsmTypes.ts`, and `pipeline.ts` are all type-only files. No logic lives in them. This makes it straightforward to understand the data shapes without also understanding the algorithms.

### `PipelineDeps` for Testability

The format writers are injected via `PipelineDeps` rather than imported directly. Tests can supply a mock `PipelineDeps` that captures output as strings, enabling end-to-end testing without touching the filesystem.

---

---

[← The Test Suite](15-the-test-suite.md) | [Part VII](index.md) | [File Reference →](../appendices/a-file-reference.md)
