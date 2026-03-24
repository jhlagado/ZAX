# Appendix 2 — Registers, Flags, and Conditions

This appendix collects the machine-state tables you look up often while reading
or writing Z80 code.

---

## Main Registers

| Register | Width | Usual role | Notes |
|----------|------:|------------|-------|
| `A` | 8 | accumulator | main byte arithmetic/logic destination |
| `F` | 8 | flags | holds `S Z H P/V N C`; not a general data register |
| `B` | 8 | general purpose | often used as a loop counter |
| `C` | 8 | general purpose | also used with port I/O |
| `D` | 8 | general purpose | often paired with `E` |
| `E` | 8 | general purpose | often paired with `D` |
| `H` | 8 | general purpose | high byte of `HL` |
| `L` | 8 | general purpose | low byte of `HL` |
| `BC` | 16 | register pair | counts, addresses, `A`-only indirect through `(BC)` |
| `DE` | 16 | register pair | data/address pair, `A`-only indirect through `(DE)` |
| `HL` | 16 | primary pointer pair | main indirect memory register |
| `IX` | 16 | index register | indexed access with displacement |
| `IY` | 16 | index register | second indexed access register |
| `SP` | 16 | stack pointer | points into the hardware stack |
| `PC` | 16 | program counter | address of next instruction |
| `I` | 8 | interrupt vector high byte | used in interrupt mode 2 |
| `R` | 8 | refresh register | normally not useful in everyday code |

---

## Shadow Registers

| Register set | What it is |
|--------------|------------|
| `AF'` | shadow accumulator and flags |
| `BC'`, `DE'`, `HL'` | shadow copies of the main 16-bit working pairs |

You reach these through `EX AF,AF'` and `EXX`, not through ordinary `LD`
forms.

---

## Flags Register

| Bit | Name | Meaning when set | Common beginner use |
|----:|------|------------------|---------------------|
| 7 | `S` | result is negative in signed interpretation | signed comparisons |
| 6 | `Z` | result is zero | `JP Z`, `JR NZ`, loop exits |
| 5 | unused / undocumented | varies | usually ignore |
| 4 | `H` | half-carry from bit 3 to bit 4 | BCD support |
| 3 | unused / undocumented | varies | usually ignore |
| 2 | `P/V` | parity or overflow, depends on instruction | signed overflow / parity / block ops |
| 1 | `N` | last arithmetic op was subtraction | mostly internal / BCD support |
| 0 | `C` | carry out or borrow | unsigned comparisons, rotates, shifts |

Not every instruction updates every flag. Always check the instruction's own
rules.

---

## Condition Codes

| Condition | Meaning | Flag test |
|-----------|---------|-----------|
| `Z` | zero | `Z = 1` |
| `NZ` | not zero | `Z = 0` |
| `C` | carry | `C = 1` |
| `NC` | no carry | `C = 0` |
| `M` | minus | `S = 1` |
| `P` | plus | `S = 0` |
| `PE` | parity even / overflow | `P/V = 1` |
| `PO` | parity odd / no overflow | `P/V = 0` |

These appear in conditional `JP`, `JR`, `CALL`, and `RET` forms. `JR` only
supports `NZ`, `Z`, `NC`, and `C`.

---

## Signed and Unsigned Landmarks

| Width | Unsigned range | Signed range (two's complement) |
|------:|----------------|---------------------------------|
| 8-bit byte | `0` to `255` | `-128` to `127` |
| 16-bit word | `0` to `65535` | `-32768` to `32767` |

Useful byte landmarks:

| Value | Unsigned | Signed |
|------:|---------:|-------:|
| `$00` | 0 | 0 |
| `$7F` | 127 | 127 |
| `$80` | 128 | -128 |
| `$FF` | 255 | -1 |

---

## Relative Branch Range

| Instruction family | Range |
|--------------------|-------|
| `JR cc,target` | `-128` to `+127` bytes from the next instruction |
| `DJNZ target` | `-128` to `+127` bytes from the next instruction |

If the target is farther away, use `JP` instead.
