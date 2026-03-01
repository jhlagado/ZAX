# ZAX Addressing Model (v0.2) — Step Pipelines

Goal: express every allowed load/store addressing shape as a short pipeline of reusable **steps** (concatenative/Forth style). A pipeline must leave all registers untouched except the destination (for loads) or the value-carrying register (for stores, typically `A` or `HL`). IX is never scratch.

> **Normative** — This document is the contract for addressing lowering in v0.2. The code generator and tests MUST match the Steps/ASM shown here. Any divergence is a bug to be fixed in code or tests, not by relaxing this doc.

## Source Semantics (v0.2)

ZAX uses variable semantics for named storage. A bare variable name means the stored value, not the address of the storage.

> **Key invariant:** Bare variable names (`globals`, frame vars, args, scalar `data`) are value accesses, not address expressions. In load/store contexts, the compiler must lower them as reads/writes of the stored value. Arithmetic on bare scalar variables as if they were addresses is invalid and must be rejected.

- Scalars (`globals`, frame vars, args, scalar `data`) are used by value.
- Indexable aggregates (arrays, records) are still source-level variables, but the compiler transparently passes their storage reference when an aggregate-typed operation needs a base.
- Indexed forms such as `arr[i]` and field forms such as `rec.field` mean the stored element/field value.
- This address materialization is a lowering detail only. It does not change the source-level semantics into raw symbol or pointer arithmetic.
- The only source-level names that are address-like are control-flow labels used by jump/call forms. Raw `DB` / `DW` style storage labels are future work and are out of scope here.

Quick reference:

| Source form         | Meaning in source                  | Lowering intent                       |
| ------------------- | ---------------------------------- | ------------------------------------- |
| `glob_b`            | scalar variable value              | read/write the stored byte            |
| `arr[i]`            | element access                     | load/store element, or continue path  |
| `rec.field`         | field access                       | load/store field, or continue path    |
| `loop` in `jp loop` | control-flow target label          | branch/call target                    |

Practical rule:

- `ld a, glob_b` loads the byte stored in `glob_b`.
- `ld glob_b, a` stores into `glob_b`.
- Bare scalar variables are not pointer values and are not valid for arithmetic.
- Array/record addressing in this document describes how the compiler lowers aggregate access internally; it does not expose general address semantics to user code.
- The emitter must never reinterpret a bare scalar variable as an immediate address operand. If lowering needs an address internally, it derives that from the variable's storage location; source semantics stay value-based.

## 1. Step Library (reusable "words")

### 1.1 Save / restore

```
SAVE_HL                     push hl

SAVE_DE                     push de

RESTORE_HL                  pop hl

RESTORE_DE                  pop de

SWAP_HL_DE                  ex de,hl

SWAP_HL_SAVED               ex (sp),hl
```

### 1.2 Base loaders (place base in DE)

```
LOAD_BASE_GLOB glob         ld de,glob

LOAD_BASE_FVAR fvar         ld e,(ix+fvar)
                            ld d,(ix+fvar+1)
```

### 1.3 Index loaders (place index in HL)

```
LOAD_IDX_CONST const        ld hl,const

LOAD_IDX_REG reg            ld h,0
                            ld l,reg

LOAD_IDX_RP rp              ld hl,rp

LOAD_IDX_GLOB const         ld hl,(const)

LOAD_IDX_FVAR fvar          ex de,hl
                            ld e,(ix+fvar)
                            ld d,(ix+fvar+1)
                            ex de,hl
```

### 1.4 Combine

```
CALC_EA                     add hl,de

CALC_EA_2                   add hl,hl
                            add hl,de
```

### 1.5 Accessors (byte)

```
LOAD_REG_EA reg             ld reg,(hl)

STORE_REG_EA reg            ld (hl),reg

LOAD_REG_GLOB A glob        ld a,(glob)

LOAD_REG_GLOB reg glob      push af                  ; reg != A, borrows AF
                            ld a,(glob)
                            ld reg,a
                            pop af

STORE_REG_GLOB A glob       ld (glob),a

STORE_REG_GLOB reg glob     push af                  ; reg != A, borrows AF
                            ld a,reg
                            ld (glob),a
                            pop af

LOAD_REG_FVAR reg fvar      ld reg,(ix+fvar)

STORE_REG_FVAR reg fvar     ld (ix+fvar),reg

LOAD_REG_REG dreg sreg      ld dreg,sreg

```

### 1.6 Accessors (word)

```
LOAD_RP_EA rp               ld e,(hl)
                            inc hl
                            ld d,(hl)
                            ld lo(rp),e
                            ld hi(rp),d

STORE_RP_EA rp              ld e,lo(rp)              ; rp = DE or BC, HL = EA
                            ld d,hi(rp)
                            ld (hl),e
                            inc hl
                            ld (hl),d

STORE_RP_EA HL              pop de                   ; value from stack (SW-HL)
                            ld (hl),e
                            inc hl
                            ld (hl),d

LOAD_RP_GLOB rp glob        ld rp,(glob)

STORE_RP_GLOB rp glob       ld (glob),rp

LOAD_RP_FVAR rp fvar        ld lo(rp),(ix+fvar)
                            ld hi(rp),(ix+fvar+1)

STORE_RP_FVAR rp fvar       ld (ix+fvar),lo(rp)
                            ld (ix+fvar+1),hi(rp)
```

`fvar` is the frame displacement (IX-relative). Positive displacements address args; negative displacements address locals. When indexing with a constant, fold the scaled constant into `fvar`.

## 2. Pipelines (byte)

For each shape:

- ZAX: the source line.
- Steps: vertical list of step names with parameters.
- ASM: exact codegen (one instruction per line).

**Scalar fast path:** If there is no index and the operand is a direct scalar variable, use the step library accessors directly (no template):

- Globals: `LOAD_REG_GLOB` / `STORE_REG_GLOB` are scalar-accessor intents. `A` uses the direct Z80 absolute-byte form; non-`A` registers borrow AF internally.
- Frame vars: `ld reg,fvar` → `LOAD_REG_FVAR` / `ld fvar,reg` → `STORE_REG_FVAR`
  Examples:

```
ld a, glob_b         ; LOAD_REG_GLOB A glob_b
ld b, (ix-4)         ; LOAD_REG_FVAR B fvar=-4
ld (ix+6), e         ; STORE_REG_FVAR E fvar=+6
```

### Scalars (byte, no index)

Use the scalar accessors. Frame-byte accesses and global `A` accesses are direct. Global non-`A` accesses borrow AF inside `LOAD_REG_GLOB` / `STORE_REG_GLOB`.

#### Loads

- Global byte: `ld reg, glob` → `LOAD_REG_GLOB reg glob`

```
ld a, glob_b                ; LOAD_REG_GLOB A glob_b
ld b, glob_b                ; LOAD_REG_GLOB B glob_b
```

For global non-`A` byte loads, `LOAD_REG_GLOB` expands as:

```asm
push af
ld a,(glob)
ld reg,a
pop af
```

- Frame byte: `ld reg, fvar` → `LOAD_REG_FVAR reg fvar`

```
ld l, (ix-4)                ; LOAD_REG_FVAR L fvar=-4
```

#### Stores

- Global byte: `ld glob, reg` → `STORE_REG_GLOB reg glob`

```
ld glob_b, a                ; STORE_REG_GLOB A glob_b
ld glob_b, b                ; STORE_REG_GLOB B glob_b
```

For global non-`A` byte stores, `STORE_REG_GLOB` expands as:

```asm
push af
ld a,reg
ld (glob),a
pop af
```

- Frame byte: `ld fvar, reg` → `STORE_REG_FVAR reg fvar`

```
ld (ix-4), l                ; STORE_REG_FVAR L fvar=-4
```

> **Routing rule (byte):** If there is **no `[]` index**, stay on the scalar accessors above. If the index is a **constant**, fold it into the frame displacement and use the constant-index EA builders; otherwise use the EA*\* builders plus the load/store templates below. Routing scalars through EA*\* only adds wasted base+index math and save/restore traffic.

| Access shape             | Path to use                            |
| ------------------------ | -------------------------------------- |
| glob / frame var (no []) | Scalars (byte) accessors               |
| glob / frame[var+const]  | EA\_\* with CONST idx (fold disp)      |
| glob / frame[r8]         | EA\_\* + L-ABC/L-HL/L-DE or S-ANY/S-HL |
| glob / frame[word index] | EA\_\* (word idx) + templates          |

### Load templates (8-bit only)

These templates define how to preserve HL/DE while materializing an indexed address and loading one byte. Pick the template by destination register; plug any EA builder (`EA_*`) in the slot noted below. EA\_\* may borrow HL/DE; the saves/restores here provide the protection.

- **L-ABC (dest in A/B/C)** — protected path even for non-overlapping dests

  ```
  SAVE_DE              ; DE may be borrowed by EA/LOAD
  SAVE_HL              ; protect both H/L
  EA_*                 ; result EA in HL (may borrow HL/DE internally)
  LOAD_REG_EA dest     ; direct load into dest
  RESTORE_HL           ; restore original H/L
  RESTORE_DE
  ```

- **L-HL (dest in H or L)** — protect the non-dest half of HL

  ```
  SAVE_DE              ; DE may be borrowed by EA/LOAD
  SAVE_HL              ; protect both H/L
  EA_*                 ; EA in HL
  LOAD_REG_EA E        ; temp byte in E
  RESTORE_HL           ; restore original H/L
  LOAD_REG_REG dest E  ; dest = H or L
  RESTORE_DE
  ```

- **L-DE (dest in D or E)** — protect DE while using HL as EA

  ```
  SAVE_HL              ; HL will hold EA
  SAVE_DE              ; protect D/E pair
  EA_*                 ; EA in HL
  LOAD_REG_EA L        ; temp byte in L
  RESTORE_DE           ; restore original D/E
  LOAD_REG_REG dest L  ; dest = D or E
  RESTORE_HL
  ```

### Store templates (8-bit only)

These templates define how to preserve HL/DE while materializing an indexed address and storing one byte held in `vreg`. EA\_\* may borrow HL/DE, so we save/restore around it.

- **S-ANY (vreg not in H/L)** — non-destructive store

  ```
  SAVE_DE              ; if EA/STORE borrow DE
  SAVE_HL              ; HL used for EA
  EA_*                 ; EA in HL
  STORE_REG_EA vreg    ; write byte (vreg ≠ H/L)
  RESTORE_HL           ; restore original H/L
  RESTORE_DE
  ```

- **S-HL (vreg in H or L)** — value on stack, EA in HL

  ```
  SAVE_DE              ; stack: [orig DE]
  SAVE_HL              ; stack: [orig DE, value] ← TOS holds H/L
  EA_*                 ; HL = EA, stack unchanged
  POP DE               ; DE = saved value (E=L, D=H)
  STORE_REG_EA E|D     ; use E if dest=L, D if dest=H
  RESTORE_DE           ; stack: []
  ```

EA\_\* is any of the byte-width EA builders above (size = 1). Word-sized store templates will follow in Section 3.

### EA builders (byte width, HL=EA on exit)

Element size = 1. HL returns the effective address; DE must be preserved. EA\_\* borrows HL/DE; callers save/restore as shown in the load/store templates.

#### EA_GLOB_CONST (base=glob, idx=const)

ZAX example: `ld reg, glob[const]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_CONST const
CALC_EA
```

ASM

```asm
ld de,glob
ld hl,const
add hl,de
```

#### EA_GLOB_REG (base=glob, idx=reg8)

ZAX example: `ld reg, glob[ireg]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_REG reg8
CALC_EA
```

ASM

```asm
ld de,glob
ld h,0
ld l,reg8
add hl,de
```

#### EA_GLOB_RP (base=glob, idx=reg16)

ZAX example: `ld reg, glob[rp]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_RP rp
CALC_EA
```

ASM

```asm
ld de,glob
ld hl,rp
add hl,de
```

#### EA_FVAR_CONST (base=fvar, idx=const)

ZAX example: `ld reg, fvar[const]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_CONST const
CALC_EA
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,const
add hl,de
```

#### EA_FVAR_REG (base=fvar, idx=reg8)

ZAX example: `ld reg, fvar[ireg]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG reg8
CALC_EA
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,reg8
add hl,de
```

#### EA_FVAR_RP (base=fvar, idx=reg16)

ZAX example: `ld reg, fvar[rp]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_RP rp
CALC_EA
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,rp
add hl,de
```

#### EA_GLOB_FVAR (base=glob, idx=word at fvar)

ZAX example: `ld reg, glob[fvar]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_FVAR fvar
CALC_EA
```

ASM

```asm
ld de,glob
ex de,hl
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ex de,hl
add hl,de
```

#### EA_FVAR_FVAR (base=fvar, idx=word at fvar2)

ZAX example: `ld reg, fvar[fvar2]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_FVAR fvar2
CALC_EA
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ex de,hl
ld e,(ix+fvar2)
ld d,(ix+fvar2+1)
ex de,hl
add hl,de
```

#### EA_FVAR_GLOB (base=fvar, idx=word at glob)

ZAX example: `ld reg, fvar[glob]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
```

#### EA_GLOB_GLOB (base=glob1, idx=word at glob2)

ZAX example: `ld reg, glob1[glob2]`

Steps

```
LOAD_BASE_GLOB glob1
LOAD_IDX_GLOB glob2
CALC_EA
```

ASM

```asm
ld de,glob1
ld hl,(glob2)
add hl,de
```

## 3. Pipelines (word)

### Scalars (word, no index)

#### Load global word into rp

ZAX

```zax
ld rp, glob_w
```

Steps

```
LOAD_RP_GLOB rp glob_w
```

ASM

```asm
ld rp,(glob_w)
```

#### Load frame word into rp

ZAX

```zax
ld rp, (ix-4)
```

Steps

```
LOAD_RP_FVAR rp fvar=-4
```

ASM

```asm
ld lo(rp),(ix-4)
ld hi(rp),(ix-3)
```

#### Store rp into global word

ZAX

```zax
ld glob_w, rp
```

Steps

```
STORE_RP_GLOB rp glob_w
```

ASM

```asm
ld (glob_w),rp
```

#### Store rp into frame word

ZAX

```zax
ld (ix-4), rp
```

Steps

```
STORE_RP_FVAR rp fvar=-4
```

ASM

```asm
ld (ix-4),lo(rp)
ld (ix-3),hi(rp)
```

> **Routing rule (word):** If there is **no `[]` index**, use these scalar word accessors directly. For frame vars with constant offsets, fold the constant into the displacement and stay scalar. Only use `EAW_*` plus the LW/SW templates when a runtime index is present; sending scalars through EAW\_\* introduces needless scaling and save/restore traffic.

| Access shape             | Path to use                         |
| ------------------------ | ----------------------------------- |
| glob / frame var (no []) | Scalars (word) accessors            |
| glob / frame[var+const]  | Scalars (word), folded displacement |
| glob / frame[r8]         | EAW\__ + LW-HL/LW-DE/LW-BC or SW-_  |
| glob / frame[word index] | EAW\__ + LW-HL/LW-DE/LW-BC or SW-_  |

### Load templates (16-bit only)

- **LW-HL (dest HL)** — preferred channel

  ```
  SAVE_DE
  EAW_*                ; EA in HL (scale by 2 where needed)
  LOAD_RP_EA HL        ; load into HL
  RESTORE_DE
  ```

- **LW-DE (dest DE)** — load via HL then swap

  ```
  SAVE_HL
  EAW_*                ; EA in HL
  LOAD_RP_EA HL        ; word in HL
  SWAP_HL_DE           ; move result into DE
  RESTORE_HL           ; restore caller HL
  ```

- **LW-BC (dest BC)** — load via HL then move

  ```
  SAVE_DE
  SAVE_HL
  EAW_*                ; EA in HL
  LOAD_RP_EA HL        ; word in HL
  LOAD_REG_REG C L     ; move lo byte
  LOAD_REG_REG B H     ; move hi byte
  RESTORE_HL           ; restore caller HL
  RESTORE_DE           ; restore caller DE
  ```

EAW\_\* denotes any word-width EA builder (below).

### Store templates (16-bit only)

Non-destructive store of a word in a register pair to EAW\_\*.

- **SW-DE (vpair = DE)** — EA in HL, value in DE. `SAVE_DE` preserves the value so it can be restored after `EAW_*` clobbers DE.

  ```
  SAVE_HL
  SAVE_DE
  EAW_*                ; EA in HL
  RESTORE_DE           ; restore value to DE
  STORE_RP_EA DE
  RESTORE_HL           ; restore caller HL
  ```

- **SW-BC (vpair = BC)** — EA in HL, value in BC. `STORE_RP_EA BC` uses DE as scratch, so caller DE must be restored after the store.

  ```
  SAVE_HL
  SAVE_DE
  EAW_*                ; EA in HL
  RESTORE_DE           ; restore value to DE
  STORE_RP_EA DE
  RESTORE_HL           ; restore caller HL
  ```

- **SW-BC (vpair = BC)** — EA in HL, value in BC. `STORE_RP_EA BC` uses DE as scratch, so caller DE must be restored after the store.

  ```
  SAVE_DE              ; preserve caller DE (scratch)
  SAVE_HL
  EAW_*                ; EA in HL
  STORE_RP_EA BC       ; uses DE scratch
  RESTORE_HL           ; restore caller HL
  RESTORE_DE           ; restore caller DE
  ```

- **SW-HL (vpair = HL)** — EA in HL, value on stack (from SAVE_HL)

  ```
  SAVE_DE              ; stack: [orig DE]
  SAVE_HL              ; stack: [orig DE, value]  ← TOS holds value
  EAW_*                ; HL = EA, stack unchanged
  STORE_RP_EA HL       ; pops value into DE, stores through HL
  RESTORE_DE           ; stack: []
  ```

EAW\_\* is any word-width EA builder (size = 2). Scaling is baked into EAW\_\*.

### EA builders (word width, HL=EA on exit, size = 2)

Element size = 2. These scale the index by 2 (CALC_EA_2). HL returns the effective address; DE must be preserved. ZAX examples show typical shapes.

#### EA_GLOB_CONST_W (base=glob, idx=const)

ZAX example: `ld rp, glob[const]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_CONST const
CALC_EA_2
```

ASM

```asm
ld de,glob
ld hl,const
add hl,hl
add hl,de
```

#### EA_GLOB_REG_W (base=glob, idx=reg8)

ZAX example: `ld rp, glob[ireg]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_REG reg8
CALC_EA_2
```

ASM

```asm
ld de,glob
ld h,0
ld l,reg8
add hl,hl
add hl,de
```

#### EA_GLOB_RP_W (base=glob, idx=reg16)

ZAX example: `ld rp, glob[rp]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_RP rp
CALC_EA_2
```

ASM

```asm
ld de,glob
ld hl,rp
add hl,hl
add hl,de
```

#### EA_FVAR_CONST_W (base=fvar, idx=const)

ZAX example: `ld rp, fvar[const]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_CONST const
CALC_EA_2
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,const
add hl,hl
add hl,de
```

#### EA_FVAR_REG_W (base=fvar, idx=reg8)

ZAX example: `ld rp, fvar[ireg]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG reg8
CALC_EA_2
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,reg8
add hl,hl
add hl,de
```

#### EA_FVAR_RP_W (base=fvar, idx=reg16)

ZAX example: `ld rp, fvar[rp]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_RP rp
CALC_EA_2
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,rp
add hl,hl
add hl,de
```

#### EA_GLOB_FVAR_W (base=glob, idx=word at fvar)

ZAX example: `ld rp, glob[fvar]`

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_FVAR fvar
CALC_EA_2
```

ASM

```asm
ld de,glob
ex de,hl
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ex de,hl
add hl,hl
add hl,de
```

#### EA_FVAR_FVAR_W (base=fvar, idx=word at fvar2)

ZAX example: `ld rp, fvar[fvar2]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_FVAR fvar2
CALC_EA_2
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ex de,hl
ld e,(ix+fvar2)
ld d,(ix+fvar2+1)
ex de,hl
add hl,hl
add hl,de
```

#### EA_FVAR_GLOB_W (base=fvar, idx=word at glob)

ZAX example: `ld rp, fvar[glob]`

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA_2
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,hl
add hl,de
```

#### EA_GLOB_GLOB_W (base=glob1, idx=word at glob2)

ZAX example: `ld rp, glob1[glob2]`

Steps

```
LOAD_BASE_GLOB glob1
LOAD_IDX_GLOB glob2
CALC_EA_2
```

ASM

```asm
ld de,glob1
ld hl,(glob2)
add hl,hl
add hl,de
```

## Notes / Appendix

- Choose an EA/EAW builder based on the base and index source. If the index is a constant, fold it into the frame displacement (`fvar+const`) when that keeps the EA simple.
- Choose a load/store template based on the destination (for loads) or source register (for stores):
  - Byte: L-ABC, L-HL, L-DE, S-ANY, S-HL
  - Word: LW-HL, LW-DE, LW-BC, SW-HL, SW-DE, SW-BC
- EA/EAW builders may borrow HL/DE internally; the templates already save/restore HL/DE to protect caller state. Do not add extra saves outside the templates.
- Per-instruction preservation: the only registers allowed to change are the destination register (load) or the value register/pair (store). All other registers must be restored by the end of the pipeline.
- IX is the frame pointer. Never repurpose IX as a scratch register; keep all scratch and EA work to HL/DE with proper saves/restores.
