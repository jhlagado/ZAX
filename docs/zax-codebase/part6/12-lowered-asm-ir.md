---
layout: default
title: "Chapter 12 — The Lowered-ASM IR"
parent: "Part VI — Supporting Systems"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 2
---
[← Z80 Encoding](11-z80-encoding.md) | [Part VI](index.md) | [Output Format Writers →](13-output-format-writers.md)

# Chapter 12 — The Lowered-ASM Intermediate Representation

Between the high-level AST and the final byte map there is a second, lower-level IR: the **Lowered-ASM stream**, defined in `loweredAsmTypes.ts`.

```typescript
type LoweredAsmProgram = {
  blocks: LoweredAsmBlock[];
};

type LoweredAsmBlock = {
  label?: string;
  address?: number;       // set after placement
  items: LoweredAsmItem[];
};

type LoweredAsmItem =
  | { kind: 'label'; name: string }
  | { kind: 'const'; name: string; value: number }
  | { kind: 'db'; values: number[] }
  | { kind: 'dw'; values: Array<number | LoweredImmExpr> }
  | { kind: 'ds'; size: number }
  | { kind: 'instr'; mnemonic: string; operands: LoweredAsmOperand[] }
  | { kind: 'comment'; text: string };
```

This IR is produced alongside byte emission during phase 3 by `loweredAsmStreamRecording.ts`. It records every instruction emitted, with simplified lowered operands (no EA paths — everything has been flattened to registers, immediates, and memory operands). It exists for two purposes:

1. **The `.z80` format writer** (`formats/writeAsm80.ts`) turns it into a valid plain-Z80 assembler source that another tool could assemble and get identical bytes.
2. **Debugging** — the IR preserves the structure of the original code (labels, comments, instruction order) in a form that maps cleanly back to the output listing.

---

---

[← Z80 Encoding](11-z80-encoding.md) | [Part VI](index.md) | [Output Format Writers →](13-output-format-writers.md)
