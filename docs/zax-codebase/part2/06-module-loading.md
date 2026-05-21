---
layout: default
title: "Chapter 6 — Module Loading"
parent: "Part II — Entry Points and Module Loading"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 2
---
[← Entry Points](05-entry-points.md) | [Part II](index.md) | [The Frontend →](../part3/07-the-frontend.md)

# Chapter 6 — Module Loading

### What it does

`loadProgram()` in `moduleLoader.ts` is responsible for turning an entry-file path into a `LoadedProgram` — a `ProgramNode` that contains a `ModuleFileNode` for every imported module, plus auxiliary maps:

- `sourceTexts` — the raw text of each file (for the listing writer and debug map).
- `sourceLineComments` — a per-file, per-line index of inline comments (used in listings).
- `moduleTraversal` — the deterministic topological traversal order of module IDs.
- `resolvedImportGraph` — the resolved dependency graph as `Map<moduleId, moduleId[]>`.

### Include expansion

ZAX supports a `#include`-like mechanism at the preprocessor level. `expandIncludes()` is an internal async helper that reads a source file, scans it line by line for `include` directives, and splices the included file's lines in-place. The result is a flat expanded-source object with parallel `lineFiles[]` and `lineBaseLines[]` arrays so that diagnostics can always point to the original file and line number, even after inclusion. This expanded source is what actually gets parsed.

### Import resolution

After expansion, any `import` statements in the source are discovered by the parser. The loader re-reads those import targets (following `includeDirs` if provided), builds the `edges` map of dependencies, detects cycles (returning an error diagnostic if found), and assembles everything into the final `ProgramNode` in deterministic topological order.

**Key invariant:** module IDs are canonical (absolute or root-relative) strings. `canonicalModuleId()` in `moduleIdentity.ts` ensures two paths to the same file always produce the same module ID.

### `moduleLoaderIncludePaths.ts`

Contains `resolveImportCandidates()` and `resolveIncludeCandidates()`, which expand a bare module specifier (`"utils"`) into a list of candidate file paths to try, taking `includeDirs` into account.

### `moduleVisibility.ts`

Defines visibility rules: which constants and types exported from module A are visible to module B, given the import graph. Used by `buildEnv()` to populate `visibleConsts`, `visibleEnums`, and `visibleTypes` in the `CompileEnv`.

---

---

[← Entry Points](05-entry-points.md) | [Part II](index.md) | [The Frontend →](../part3/07-the-frontend.md)
