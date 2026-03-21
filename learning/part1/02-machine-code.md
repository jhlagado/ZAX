[← The Computer](01-the-computer.md) | [Part 1](README.md) | [The Assembler →](03-the-assembler.md)

# Chapter 2 — Machine Code

A program is a sequence of bytes in memory. The CPU fetches one byte, executes the corresponding operation, advances PC, and fetches the next. This chapter shows what that looks like concretely — actual opcodes, an actual hex program decoded instruction by instruction, and the reason assembly was invented.

---

## Opcodes

The byte (or bytes) that represent an instruction are called its **opcode**. Each opcode is a fixed numeric code that the Z80's hardware decodes into an operation. Some instructions are one byte; others include one or more additional bytes carrying a constant value, a memory address, or an offset.

A few examples from the Z80 instruction set:

| Byte sequence | Instruction | What it does |
|---------------|-------------|--------------|
| `$3E n` | `LD A, n` | Load the constant value `n` into A |
| `$06 n` | `LD B, n` | Load the constant value `n` into B |
| `$47` | `LD B, A` | Copy A into B |
| `$80` | `ADD A, B` | Add B to A; result goes into A |
| `$32 lo hi` | `LD (nn), A` | Store A at the 16-bit address `nn` |
| `$3A lo hi` | `LD A, (nn)` | Load A from the 16-bit address `nn` |
| `$76` | `HALT` | Stop the CPU |

Address operands always follow the Z80's little-endian convention: low byte first, high byte second. The address `$8000` appears in the instruction stream as `$00 $80`.

---

## A Complete Hex Program

Here is a complete Z80 program written entirely as bytes, placed in memory starting at address `$0000`. It loads the values 5 and 3 into registers, adds them, and stores the result at address `$8000`.

```
$0000:  3E 05        ; LD A, 5         — load 5 into A
$0002:  47           ; LD B, A         — copy A into B; B now holds 5, A holds 5
$0003:  3E 03        ; LD A, 3         — load 3 into A; B still holds 5
$0005:  80           ; ADD A, B        — A = A + B = 3 + 5 = 8
$0006:  32 00 80     ; LD ($8000), A   — store A at address $8000
$0009:  76           ; HALT
```

Ten bytes, starting at `$0000`, ending at `$0009`.

### Stepping Through It

The CPU starts with PC = `$0000`.

**PC = `$0000`:** The byte there is `$3E`. The Z80 recognises this as a two-byte instruction: "load the next byte into A." It reads the following byte, `$05`, and loads 5 into A. PC advances to `$0002`.

**PC = `$0002`:** The byte is `$47`: "copy A into B." One byte, no operand. B becomes 5; A remains 5. PC advances to `$0003`.

**PC = `$0003`:** `$3E $03` — load 3 into A. B is unchanged and still holds 5. A is now 3. PC advances to `$0005`.

**PC = `$0005`:** `$80` — add B to A. The Z80 adds the contents of B (5) to the contents of A (3) and puts the result (8) into A. The flags register is updated: Zero is clear (8 ≠ 0), Carry is clear (8 < 256), Sign is clear (bit 7 of 8 is 0). PC advances to `$0006`.

**PC = `$0006`:** `$32 $00 $80` — store A at a 16-bit address. The opcode `$32` is followed by two address bytes: `$00` (low) and `$80` (high), giving address `$8000`. The value 8 is written to memory location `$8000`. PC advances to `$0009`.

**PC = `$0009`:** `$76` — HALT. The CPU stops. Address `$8000` now contains `$08`.

---

## Variables

From the CPU's point of view, a variable is just a byte (or several bytes) of memory at some address. It has no name, no type, and no relationship to any other byte. The only way to refer to it is by its numeric address.

In the program above, the result was written to the fixed address `$8000`. But `$8000` is embedded as raw bytes in the instruction at `$0006`. If you later decide the result should live at `$8100` instead, you must find that instruction and change bytes `$07` and `$08` by hand. If you have fifty instructions referencing the same address, you change fifty places.

This is the core problem with raw machine code: there is no concept of a name. Everything is a position number. The programmer must manually track what every address means and keep every reference consistent.

Assembly solves this with **labels**. A label is a name that the assembler associates with a particular address at assembly time. Everywhere you write the label, the assembler substitutes the correct address automatically. If the variable moves, you update the label's definition and every reference updates with it.

In a Z80 assembler a label definition looks like this:

```
Result:          ; the assembler records "Result" as the current address
  DB 0           ; allocate one byte at this address, initial value 0
```

(`DB` stands for "define byte." `DW` defines a 16-bit word.) From this point on, writing `LD (Result), A` in the code is equivalent to writing `LD ($8000), A` — but the programmer never has to know or write `$8000`. The assembler handles it.

Labels also name positions within the code — the targets of jumps and branches. Instead of writing `JP $0034`, you write `JP loop_top`, and the assembler works out the address of `loop_top` itself.

This is the single most important difference between machine code and assembly. Machine code is just bytes. Assembly adds names for addresses.

---

## Why Raw Machine Code Is Impractical

The program above was ten bytes. Real programs are thousands. Writing them as raw hex creates compounding problems:

**No names.** Every address is a number. `$8000` might be your result, or it might be a display buffer, or it might be the start of a lookup table. Nothing in the code tells you which.

**Fragility.** Insert one instruction in the middle of the program and every address calculated from that point shifts. You update them all by hand, and one missed update produces a silent wrong result — not an error message.

**Unreadability.** You cannot skim `3E 05 47 3E 03 80 32 00 80 76` and understand what the program does. You have to decode each byte from memory.

**No structure.** Machine code has no subroutines, no loops, no conditionals — just bytes and addresses. Everything that programs need beyond raw arithmetic must be built by hand from jumps to raw addresses.

An assembler does not change the fact that the CPU sees bytes. It changes what you, the programmer, have to write and maintain.

---

## Summary

- Every Z80 instruction has a specific numeric opcode; the CPU reads this byte and carries out the corresponding operation
- Multi-byte instructions include operand bytes after the opcode: constants, addresses, or offsets
- Address operands are always little-endian: low byte first
- The CPU steps through instructions one at a time by following PC; PC advances by the length of each instruction
- Raw machine code has no names, no structure, and breaks silently whenever you move things around
- Labels — names for addresses — are the fundamental thing assembly adds over raw machine code

---

[← The Computer](01-the-computer.md) | [Part 1](README.md) | [The Assembler →](03-the-assembler.md)
