---
layout: default
title: "Chapter 3 — The Compilation Pipeline"
parent: "Part I — Orientation"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 3
---
[← Repository Layout](02-repository-layout.md) | [Part I](index.md) | [A Running Example →](04-a-running-example.md)

# Chapter 3 — The Compilation Pipeline

Compiling a ZAX program happens in a clearly phased pipeline. Before looking at any individual file, it pays to have the whole sequence in your head:

```
 Source text(s)
       │
       ▼
┌─────────────────┐
│  Module Loading │  Read files from disk, expand includes, resolve imports
└────────┬────────┘
         │  ProgramNode (tree of ModuleFileNodes, each a parsed .zax file)
         ▼
┌─────────────────┐
│    Parsing      │  Text → AST (frontend/)
└────────┬────────┘
         │  ProgramNode (fully populated AST)
         ▼
┌─────────────────┐
│   Semantics     │  Build CompileEnv, validate assignments/steps
└────────┬────────┘
         │  CompileEnv (consts, enums, types, visibility)
         ▼
┌──────────────────────────────────────────────────────────┐
│  Lowering (lowering/)                                    │
│                                                          │
│  Phase 1: Workspace setup (section maps, fixup queues)   │
│  Phase 2: Prescan (build callables/ops/alias maps)       │
│  Phase 3: Lower declarations (emit bytes + fixups)       │
│  Phase 4: Finalize (place sections, resolve fixups)      │
└────────┬─────────────────────────────────────────────────┘
         │  EmittedByteMap + SymbolEntry[] + LoweredAsmProgram
         ▼
┌─────────────────┐
│  Format Writers │  Produce .bin, .hex, .d8.json, .lst, .z80
└─────────────────┘
```

Each phase can emit diagnostics. The pipeline performs a `hasErrors()` check after each major phase and short-circuits early on fatal errors. This means diagnostics accumulate up to the point of the first fatal error set, and you always see errors from the *highest* phase that successfully ran.

---

> **Future diagram** — The ASCII pipeline above is an ideal candidate for a Mermaid flowchart. When converted, each phase will be a `graph TD` node with labelled edges showing the data contracts passed between them.

---

[← Repository Layout](02-repository-layout.md) | [Part I](index.md) | [A Running Example →](04-a-running-example.md)
