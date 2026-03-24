# Appendix 3 — Addressing, Prefixes, and Instruction Forms

This appendix gives the compact machine-side tables that help when you need to
recognise a form quickly.

---

## Addressing Shapes

| Shape | Example | Meaning | Typical use |
|-------|---------|---------|-------------|
| immediate byte | `ld a, $2A` | constant encoded in the instruction | constants, masks, small values |
| immediate word | `ld hl, $8000` | 16-bit constant encoded in the instruction | addresses, counters, setup |
| register | `ld d, a` | copy between registers | cheap data movement |
| register pair | `add hl, de` | operate on a 16-bit pair | addresses, word arithmetic |
| register indirect | `ld a, (hl)` | memory at address in `HL` | pointer-based table walk |
| indexed indirect | `ld a, (ix+3)` | memory at `IX + displacement` | records, stack frames |
| absolute memory | `ld a, ($8000)` | memory at a fixed 16-bit address | globals, I/O-mapped data |
| relative branch | `jr nz, loop` | branch by signed offset | short local branches |
| absolute branch | `jp nz, target` | branch to full 16-bit address | long-range control flow |

---

## Prefix Families

| Prefix | Family | What it usually means |
|--------|--------|-----------------------|
| none | base | ordinary documented Z80 instruction set |
| `CB` | rotate/shift/bit family | `RLC`, `BIT`, `RES`, `SET`, and friends |
| `ED` | extended family | block ops, `NEG`, `RETI/RETN`, `IM`, `RLD/RRD`, 16-bit `ADC/SBC`, port forms |
| `DD` | IX substitution | many `HL`-based forms become `IX`-based |
| `FD` | IY substitution | many `HL`-based forms become `IY`-based |
| `DD CB d` | indexed bit/shift family | operate on `(IX+d)` |
| `FD CB d` | indexed bit/shift family | operate on `(IY+d)` |

Important caution: `DD` and `FD` do **not** magically legalise every `HL`
instruction. The Z80 has many exceptions.

---

## `LD` Quick Table

| Family | Examples | Notes |
|--------|----------|-------|
| 8-bit register to register | `ld a, b`, `ld d, h` | common and fast |
| immediate to register | `ld a, $2A`, `ld hl, $8000` | constants encoded in instruction |
| register with `(HL)` | `ld a, (hl)`, `ld (hl), a`, `ld (hl), 0` | main indirect byte access |
| register with `(IX+d)` / `(IY+d)` | `ld a, (ix+3)`, `ld (iy-1), a` | indexed access |
| `A` with `(BC)` / `(DE)` | `ld a, (bc)`, `ld (de), a` | only `A` is allowed |
| absolute memory | `ld a, ($8000)`, `ld ($8000), a`, `ld hl, ($8000)` | globals and fixed addresses |
| stack pointer load | `ld sp, hl`, `ld sp, ix`, `ld sp, iy` | special-case form |

Illegal pattern to remember:

```z80
ld ($8001), ($8000)   ; impossible
```

Memory-to-memory moves must go through a register.

---

## Arithmetic, Logic, and Compare Quick Table

| Family | Main forms | Result goes to | Notes |
|--------|------------|----------------|-------|
| `ADD` | `add a,x`, `add hl,ss`, `add ix,pp`, `add iy,rr` | first operand | 8-bit add is accumulator-based |
| `ADC` | `adc a,x`, `adc hl,ss` | first operand | includes carry |
| `SUB` | `sub x` | `A` | accumulator only |
| `SBC` | `sbc a,x`, `sbc hl,ss` | first operand | subtract with carry/borrow |
| `AND` | `and x` | `A` | accumulator only |
| `OR` | `or x` | `A` | accumulator only |
| `XOR` | `xor x` | `A` | accumulator only |
| `CP` | `cp x` | no stored result | flags only |
| `INC` | `inc r`, `inc rr`, `inc (hl)`, `inc (ix+d)` | operand itself | does not mean “new temporary value” |
| `DEC` | `dec r`, `dec rr`, `dec (hl)`, `dec (ix+d)` | operand itself | often used for loops |

---

## Rotate, Shift, and Bit Quick Table

| Family | Examples | Notes |
|--------|----------|-------|
| accumulator rotates | `rlca`, `rrca`, `rla`, `rra` | short one-byte accumulator forms |
| general rotates | `rlc r`, `rrc r`, `rl r`, `rr r` | base `CB` family |
| shifts | `sla r`, `sra r`, `srl r` | base `CB` family |
| bit test | `bit n,r`, `bit n,(hl)` | tests a bit, does not store a new value |
| bit clear | `res n,r`, `res n,(hl)` | writes back changed value |
| bit set | `set n,r`, `set n,(hl)` | writes back changed value |
| indexed forms | `bit 3,(ix+2)`, `srl (iy-1)` | `DD CB d` / `FD CB d` families |
| classic-undocumented shift | `sll r` / `sls r` | widely used but not part of the original documented set |

---

## Control Flow, Stack, and Exchange Quick Table

| Family | Examples | Notes |
|--------|----------|-------|
| absolute jump | `jp target`, `jp nz,target`, `jp (hl)` | long-range branch |
| relative jump | `jr target`, `jr z,target` | short branch only |
| counted branch | `djnz loop` | `B := B - 1`, branch if result not zero |
| call/return | `call fn`, `ret`, `ret z` | uses hardware stack |
| restart | `rst $38` | call to fixed low-memory vector |
| stack | `push bc`, `pop hl` | word-sized only |
| exchange | `ex de,hl`, `ex af,af'`, `exx`, `ex (sp),hl` | swaps rather than copies |
| interrupt state | `di`, `ei`, `im 0/1/2` | machine control, not everyday data movement |

---

## Block Instructions At A Glance

| Family | Mnemonics | What they do |
|--------|-----------|--------------|
| block transfer | `LDI`, `LDIR`, `LDD`, `LDDR` | copy bytes between `(HL)` and `(DE)` while updating pointers/counter |
| block compare | `CPI`, `CPIR`, `CPD`, `CPDR` | compare `A` against bytes in memory while updating pointers/counter |
| block input | `INI`, `INIR`, `IND`, `INDR` | port input plus memory store |
| block output | `OUTI`, `OTIR`, `OUTD`, `OTDR` | memory read plus port output |
