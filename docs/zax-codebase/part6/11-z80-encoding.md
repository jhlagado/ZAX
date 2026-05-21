---
layout: default
title: "Chapter 11 — Z80 Machine-Code Encoding"
parent: "Part VI — Supporting Systems"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[← Lowering](../part5/10-lowering.md) | [Part VI](index.md) | [The Lowered-ASM IR →](12-lowered-asm-ir.md)

# Chapter 11 — Z80 Machine-Code Encoding

The `z80/` folder is the pure instruction-encoding layer. It knows nothing about ZAX types, functions, or sections — it only knows how to turn `(mnemonic, operands)` into a byte array.

`encode.ts` is the dispatcher. It looks up the instruction family for a mnemonic in `encoderRegistry.ts`, then calls the appropriate family encoder:

| File | Instructions |
|------|--------------|
| `encodeCoreOps.ts` | `nop`, `halt`, `di`, `ei`, `ex`, `exx`, `daa`, `cpl`, `scf`, `ccf`, `rlca`, `rrca`, `rla`, `rra`, `rld`, `rrd`, `neg`, `retn`, `reti`, `ldi`, `ldir`, `ldd`, `lddr`, `cpi`, `cpir`, `cpd`, `cpdr` |
| `encodeAlu.ts` | `add`, `adc`, `sub`, `sbc`, `and`, `or`, `xor`, `cp`, `inc`, `dec` |
| `encodeBitOps.ts` | `bit`, `set`, `res`, `rl`, `rr`, `rlc`, `rrc`, `sla`, `sra`, `srl` |
| `encodeControl.ts` | `jp`, `jr`, `call`, `ret`, `djnz` |
| `encodeIo.ts` | `in`, `out`, `im`, `rst` |
| `encodeLd.ts` | `ld` (the most complex — handles all 2- and 3-operand forms) |

Each encoder inspects the operand kinds and emits the correct opcode bytes. For instructions that encode a fixup reference (like `call target_address`), they emit placeholder bytes and push a fixup record onto the queue.

`encoderRegistry.ts` holds a `Map<mnemonic, EncoderFamily>` and provides `getEncoderRegistryEntry()`, which also validates arity (number of operands) before dispatching, so arity errors get a clean diagnostic rather than a crash.

---

---

[← Lowering](../part5/10-lowering.md) | [Part VI](index.md) | [The Lowered-ASM IR →](12-lowered-asm-ir.md)
