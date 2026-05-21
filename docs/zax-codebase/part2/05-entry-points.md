---
layout: default
title: "Chapter 5 — Entry Points"
parent: "Part II — Entry Points and Module Loading"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[← A Running Example](../part1/04-a-running-example.md) | [Part II](index.md) | [Module Loading →](06-module-loading.md)

# Chapter 5 — Entry Points

### `cli.ts`

The command-line interface. It parses `process.argv`, constructs a `CompilerOptions` object, and calls the `compile()` function with a `PipelineDeps` object that wires in the real format writers (`writeHex`, `writeBin`, `writeD8m`, `writeListing`, `writeAsm80`). After compilation it writes artifacts to disk and prints diagnostics to `stderr`.

`PipelineDeps` (defined in `pipeline.ts`) is an interface that declares the format writers as a bundle. This indirection makes the compiler core fully testable without touching the filesystem — tests supply mock writers that capture the output in memory.

### `compile.ts`

This is the heart of the pipeline coordinator. `compile()` is an `async` function (because module loading reads from disk). It:

1. Calls `loadProgram()` to load all `.zax` files into a `ProgramNode`.
2. Checks for errors. If any, returns early.
3. Collects named-section keys via `collectNonBankedSectionKeys()`.
4. Validates that the program contains at least one declaration.
5. Optionally checks for a `main` function (`requireMain` option).
6. Runs `lintCaseStyle()` to warn about inconsistent register/keyword casing.
7. Builds the `CompileEnv` with `buildEnv()`.
8. Runs `validateAssignmentAcceptance()` and `validateStepAcceptance()`.
9. Calls `emitProgram()` which returns `{ map, symbols, placedLoweredAsmProgram }`.
10. Passes those products to the format writers to produce `Artifact[]`.
11. Returns `{ diagnostics, artifacts }`.

Notice the `withDefaults()` helper at the top of `compile.ts`. If the caller specifies *any* primary emit flag (`emitBin`, `emitHex`, `emitD8m`) then only those are written. If none is specified, all three default to `true`. `emitListing` defaults to `true` independently; `emitAsm80` defaults to `false`.

---

---

[← A Running Example](../part1/04-a-running-example.md) | [Part II](index.md) | [Module Loading →](06-module-loading.md)
