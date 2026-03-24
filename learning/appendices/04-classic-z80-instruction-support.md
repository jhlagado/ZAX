# Appendix 4 — Classic Z80 Instruction Support Table

This appendix is a **searchable support table** for the classic Z80 instruction
set.

It includes:

- the standard documented instruction families
- the classic undocumented forms most programmers still treat as part of the
  real Z80 machine model

It does **not** include:

- host-, firmware-, or emulator-specific `ED` aliases
- non-Z80 extensions from later or different CPUs
- cycle counts

Status values used below:

- `documented` — part of the standard documented Z80 set
- `documented prefix family` — standard, but lives in `CB`, `ED`, `DD`, `FD`,
  `DDCB`, or `FDCB`
- `undocumented but classic` — not in the original documented set, but widely
  supported and commonly treated as standard practice

---

| Mnemonic | Supported classic forms | Prefix families | Status | Notes |
|----------|-------------------------|-----------------|--------|-------|
| `ADC` | `adc a,r`, `adc a,n`, `adc a,(hl)`, `adc a,(ix+d)`, `adc a,(iy+d)`, `adc hl,ss` | base, `DD`, `FD`, `ED` | documented | two separate families: 8-bit accumulator and 16-bit `HL` |
| `ADD` | `add a,r`, `add a,n`, `add a,(hl)`, `add a,(ix+d)`, `add a,(iy+d)`, `add hl,ss`, `add ix,pp`, `add iy,rr` | base, `DD`, `FD` | documented | 16-bit add always writes back to first pair |
| `AND` | `and r`, `and n`, `and (hl)`, `and (ix+d)`, `and (iy+d)` | base, `DD`, `FD` | documented | accumulator-only logical op |
| `BIT` | `bit b,r`, `bit b,(hl)`, `bit b,(ix+d)`, `bit b,(iy+d)` | `CB`, `DDCB`, `FDCB` | documented prefix family | bit test, no stored result |
| `CALL` | `call nn`, `call cc,nn` | base | documented | absolute subroutine call |
| `CCF` | `ccf` | base | documented | complement carry |
| `CP` | `cp r`, `cp n`, `cp (hl)`, `cp (ix+d)`, `cp (iy+d)` | base, `DD`, `FD` | documented | compare against `A`, flags only |
| `CPD` | `cpd` | `ED` | documented prefix family | block compare, decrement |
| `CPDR` | `cpdr` | `ED` | documented prefix family | repeated `CPD` |
| `CPI` | `cpi` | `ED` | documented prefix family | block compare, increment |
| `CPIR` | `cpir` | `ED` | documented prefix family | repeated `CPI` |
| `CPL` | `cpl` | base | documented | complement accumulator |
| `DAA` | `daa` | base | documented | BCD adjust after add/subtract |
| `DEC` | `dec r`, `dec rr`, `dec (hl)`, `dec (ix+d)`, `dec (iy+d)`, `dec ixh`, `dec ixl`, `dec iyh`, `dec iyl` | base, `DD`, `FD` | documented plus undocumented-but-classic half-register forms | half-index-register forms are the undocumented part |
| `DI` | `di` | base | documented | disable interrupts |
| `DJNZ` | `djnz disp` | base | documented | relative counted branch using `B` |
| `EI` | `ei` | base | documented | enable interrupts |
| `EX` | `ex de,hl`, `ex af,af'`, `ex (sp),hl`, `ex (sp),ix`, `ex (sp),iy` | base, `DD`, `FD` | documented | swap, not copy |
| `EXX` | `exx` | base | documented | swaps `BC/DE/HL` with shadow set |
| `HALT` | `halt` | base | documented | stop until interrupt |
| `IM` | `im 0`, `im 1`, `im 2` | `ED` | documented prefix family | interrupt mode control |
| `IN` | `in a,(n)`, `in r,(c)` | base, `ED` | documented | `in f,(c)` is not a meaningful portable form |
| `INC` | `inc r`, `inc rr`, `inc (hl)`, `inc (ix+d)`, `inc (iy+d)`, `inc ixh`, `inc ixl`, `inc iyh`, `inc iyl` | base, `DD`, `FD` | documented plus undocumented-but-classic half-register forms | half-index-register forms are the undocumented part |
| `IND` | `ind` | `ED` | documented prefix family | block input, decrement |
| `INDR` | `indr` | `ED` | documented prefix family | repeated `IND` |
| `INI` | `ini` | `ED` | documented prefix family | block input, increment |
| `INIR` | `inir` | `ED` | documented prefix family | repeated `INI` |
| `JP` | `jp nn`, `jp cc,nn`, `jp (hl)`, `jp (ix)`, `jp (iy)` | base, `DD`, `FD` | documented | absolute branch or indirect jump |
| `JR` | `jr disp`, `jr nz,disp`, `jr z,disp`, `jr nc,disp`, `jr c,disp` | base | documented | short relative branch only |
| `LD` | register/register, register/immediate, `(hl)` forms, `(ix+d)` / `(iy+d)` forms, `a` with `(bc)` / `(de)`, absolute memory forms, `sp <- hl/ix/iy`, `i/r` transfers, block forms below, classic half-register forms with `ixh/ixl/iyh/iyl` | base, `DD`, `FD`, `ED` | documented plus undocumented-but-classic half-register forms | the biggest family and the one with the most exceptions |
| `LDD` | `ldd` | `ED` | documented prefix family | block transfer, decrement |
| `LDDR` | `lddr` | `ED` | documented prefix family | repeated `LDD` |
| `LDI` | `ldi` | `ED` | documented prefix family | block transfer, increment |
| `LDIR` | `ldir` | `ED` | documented prefix family | repeated `LDI` |
| `NEG` | `neg` | `ED` | documented prefix family | historically duplicated across several `ED` opcodes |
| `NOP` | `nop` | base | documented | no operation |
| `OR` | `or r`, `or n`, `or (hl)`, `or (ix+d)`, `or (iy+d)` | base, `DD`, `FD` | documented | accumulator-only logical op |
| `OTDR` | `otdr` | `ED` | documented prefix family | repeated block output, decrement |
| `OTIR` | `otir` | `ED` | documented prefix family | repeated block output, increment |
| `OUT` | `out (n),a`, `out (c),r` | base, `ED` | documented | `out (c),0` is not treated here as standard classic course material |
| `OUTD` | `outd` | `ED` | documented prefix family | block output, decrement |
| `OUTI` | `outi` | `ED` | documented prefix family | block output, increment |
| `POP` | `pop bc`, `pop de`, `pop hl`, `pop af`, `pop ix`, `pop iy` | base, `DD`, `FD` | documented | word-sized only |
| `PUSH` | `push bc`, `push de`, `push hl`, `push af`, `push ix`, `push iy` | base, `DD`, `FD` | documented | word-sized only |
| `RES` | `res b,r`, `res b,(hl)`, `res b,(ix+d)`, `res b,(iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | classic CPUs commonly copy indexed result into target register |
| `RET` | `ret`, `ret cc` | base | documented | return from subroutine |
| `RETI` | `reti` | `ED` | documented prefix family | interrupt return |
| `RETN` | `retn` | `ED` | documented prefix family | interrupt/non-maskable return |
| `RL` | `rl r`, `rl (hl)`, `rl (ix+d)`, `rl (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | rotate through carry |
| `RLA` | `rla` | base | documented | accumulator rotate through carry |
| `RLC` | `rlc r`, `rlc (hl)`, `rlc (ix+d)`, `rlc (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | circular rotate left |
| `RLCA` | `rlca` | base | documented | accumulator circular rotate left |
| `RLD` | `rld` | `ED` | documented prefix family | nibble rotate between `A` and `(HL)` |
| `RR` | `rr r`, `rr (hl)`, `rr (ix+d)`, `rr (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | rotate through carry |
| `RRA` | `rra` | base | documented | accumulator rotate through carry |
| `RRC` | `rrc r`, `rrc (hl)`, `rrc (ix+d)`, `rrc (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | circular rotate right |
| `RRCA` | `rrca` | base | documented | accumulator circular rotate right |
| `RRD` | `rrd` | `ED` | documented prefix family | nibble rotate between `A` and `(HL)` |
| `RST` | `rst $00/$08/$10/$18/$20/$28/$30/$38` | base | documented | fixed low-memory call vectors |
| `SBC` | `sbc a,r`, `sbc a,n`, `sbc a,(hl)`, `sbc a,(ix+d)`, `sbc a,(iy+d)`, `sbc hl,ss` | base, `DD`, `FD`, `ED` | documented | two separate families: 8-bit accumulator and 16-bit `HL` |
| `SCF` | `scf` | base | documented | set carry |
| `SET` | `set b,r`, `set b,(hl)`, `set b,(ix+d)`, `set b,(iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | sets bit and writes back |
| `SLA` | `sla r`, `sla (hl)`, `sla (ix+d)`, `sla (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | arithmetic left shift |
| `SLL` / `SLS` | `sll r`, `sll (hl)`, `sll (ix+d)`, `sll (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | undocumented but classic | same operation, two common mnemonic names |
| `SRA` | `sra r`, `sra (hl)`, `sra (ix+d)`, `sra (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | arithmetic right shift |
| `SRL` | `srl r`, `srl (hl)`, `srl (ix+d)`, `srl (iy+d)`, indexed result-copy forms | `CB`, `DDCB`, `FDCB` | documented prefix family plus undocumented-but-classic indexed result-copy forms | logical right shift |
| `SUB` | `sub r`, `sub n`, `sub (hl)`, `sub (ix+d)`, `sub (iy+d)` | base, `DD`, `FD` | documented | accumulator-only subtract |
| `XOR` | `xor r`, `xor n`, `xor (hl)`, `xor (ix+d)`, `xor (iy+d)` | base, `DD`, `FD` | documented | accumulator-only logical op |

---

## Notes On The Undocumented Forms Included Here

The undocumented forms included in this appendix are the ones most likely to be
treated by real Z80 programmers as part of the practical machine:

- `IXH`, `IXL`, `IYH`, `IYL` in many 8-bit `LD`, `INC`, `DEC`, and ALU forms
- `SLL` / `SLS`
- `DDCB` / `FDCB` indexed rotate/shift/bit-result-copy forms such as
  `rlc (ix+3),b`

These are exactly the sorts of forms that make a searchable appendix useful.
They are also exactly the forms that justify checking a table rather than
trusting your memory.
