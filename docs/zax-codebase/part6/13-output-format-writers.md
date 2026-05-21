---
layout: default
title: "Chapter 13 — Output Format Writers"
parent: "Part VI — Supporting Systems"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 3
---
[← The Lowered-ASM IR](12-lowered-asm-ir.md) | [Part VI](index.md) | [Diagnostics →](14-diagnostics.md)

# Chapter 13 — Output Format Writers

All format writers are pure functions that take `(EmittedByteMap, SymbolEntry[])` and return an `Artifact`:

```typescript
type Artifact = {
  name: string;     // filename suffix, e.g. ".hex"
  content: string | Uint8Array;
};
```

### `writeBin.ts`
Writes a flat binary. It finds the lowest and highest addresses in the byte map, allocates a `Uint8Array` of the right size, and fills it. Address gaps are zero-padded.

### `writeHex.ts`
Produces Intel HEX format. The byte map is split into records of up to 16 bytes each. Each record is a `:LLAAAATT…CC` line with length, address, type, data, and checksum. Terminates with the `:00000001FF` end record.

### `writeD8m.ts`
Writes a JSON debug map (`.d8.json`) consumed by the D8 debugger. Contains:
- The entry address and entry symbol name (found by looking for `main` or the startup label).
- The full symbol table, with kinds (`label`, `data`, `var`, `const`, `enum`), addresses, sizes, and source file/line info.
- Source-segment attribution (which byte ranges correspond to which source lines).

### `writeListing.ts`
Produces a human-readable listing. Each line shows the hex address, hex bytes, and the original source line. Symbol table is appended at the end.

### `writeAsm80.ts`
Produces a Z80-compatible assembler source from the `LoweredAsmProgram`. It walks each block and item, rendering labels, `org`, `db`/`dw`/`ds`, and instruction lines with their lowered operands.

---

---

[← The Lowered-ASM IR](12-lowered-asm-ir.md) | [Part VI](index.md) | [Diagnostics →](14-diagnostics.md)
