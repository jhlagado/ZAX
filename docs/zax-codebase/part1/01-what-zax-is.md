---
layout: default
title: "Chapter 1 — What ZAX Is"
parent: "Part I — Orientation"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[Part I](index.md) | [Repository Layout →](02-repository-layout.md)

# Chapter 1 — What ZAX Is

ZAX is a structured assembler for the Z80 processor. It accepts `.zax` source files that look a lot like assembly but add:

- **Named, typed variables** at module scope (`globals`/`var`) and function scope (`var`).
- **Typed function declarations** with named parameters and declared return registers.
- **Structured control flow** — `if/else/end`, `while/end`, `repeat/until`, `select/case/end` — that compile down to conditional jumps.
- **Typed effective addresses** — you write `pair_buf.lo` and the compiler resolves the field offset.
- **Op declarations** — parameterised macro-instructions that can accept registers, immediates, or effective addresses as arguments.
- **Named sections** with placement anchors, enabling fine-grained memory-map control.
- **Import system** — modules can split across files.

The compiler turns this into standard Z80 machine code, producing flat binary, Intel HEX, a listing file, a debug-map JSON (`.d8.json`), and optionally a lowered plain-Z80 source file (`.z80`).

---

---

[Part I](index.md) | [Repository Layout →](02-repository-layout.md)
