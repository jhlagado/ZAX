# ZAX Addressing Model (v0.2) — Step Pipelines

Goal: express every allowed load/store addressing shape as a short pipeline of reusable **steps** (concatenative/Forth style). A pipeline must leave all registers untouched except the destination (for loads) or the value-carrying register (for stores, typically `A` or `HL`). IX is never scratch.

## 1. Step Library (reusable “words”)

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
LOAD_BASE_GLOB glob         ld de,(glob)              dest=DE

LOAD_BASE_FVAR fvar         ld e,(ix+fvar)            dest=DE
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

LOAD_REG_GLOB reg glob      ld reg,(glob)

STORE_REG_GLOB reg glob     ld (glob),reg

LOAD_REG_FVAR reg fvar      ld reg,(ix+fvar)

STORE_REG_FVAR reg fvar     ld (ix+fvar),reg

LOAD_REG_REG dreg sreg      ld dreg,sreg

```

### 1.6 Accessors (word)

```
LOAD_RP_EA rp               ld lo(rp),(hl)
                            inc hl
                            ld hi(rp),(hl)

STORE_RP_EA rp              ld (hl),lo(rp)
                            inc hl
                            ld (hl),hi(rp)

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

These templates define how to preserve HL/DE while materializing an indexed address and storing one byte held in `vreg`. A single template works for any source register; EA\_\* may borrow HL/DE, so we save/restore around it.

- **S-ANY (vreg in any reg8)** — non-destructive store

  ```
  SAVE_DE              ; if EA/STORE borrow DE
  SAVE_HL              ; HL used for EA
  EA_*                 ; EA in HL
  RESTORE_HL           ; restore original H/L (source byte back)
  RESTORE_DE
  STORE_REG_EA vreg    ; write byte
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
ld l,(ix+fvar)
ld h,(ix+fvar+1)
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
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
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

#### A1w load word from glob

ZAX Example

```zax
ld hl,glob
```

Steps

```
LOAD_RP_GLOB HL glob
```

ASM

```asm
ld hl,(glob)
```

#### A2w load word from fvar

ZAX Example

```zax
ld hl,fvar
```

Steps

```
LOAD_RP_FVAR DE fvar
```

ASM

```asm
ex de,hl
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ex de,hl
```

#### A3w store word to glob

ZAX Example

```zax
ld glob,hl
```

Steps

```
STORE_RP_GLOB DE glob
```

ASM

```asm
ld (glob),hl
```

#### A4w store word to fvar

ZAX Example

```zax
ld fvar,hl
```

Steps

```
STORE_RP_FVAR DE fvar
```

ASM

```asm
ex de,hl
ld (ix+fvar),e
ld (ix+fvar+1),d
ex de,hl
```

### B. Indexed by const

Element size = 1 for byte,2 for word (use `CALC_EA_2`, larger powers not supported).

#### B1w load word: glob[const]

ZAX Example

```zax
ld hl,glob[const]
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_CONST const
CALC_EA_2
LOAD_RP_EA DE
```

ASM

```asm
ld de,glob
ld hl,const
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### B2w load word: fvar[const]

ZAX Example

```zax
ld hl,fvar[const]
```

Steps

```
LOAD_RP_FVAR DE fvar+const*2
```

ASM

```asm
ex de,hl
ld e,(ix+fvar+const*2)
ld d,(ix+fvar+const*2+1)
ex de,hl
```

#### B3w store word: glob[const]

ZAX Example

```zax
ld glob[const],hl
```

Steps

```
SAVE_HL
LOAD_BASE_GLOB glob
LOAD_IDX_CONST const
CALC_EA_2
RESTORE_DE
STORE_RP_EA DE
```

ASM

```asm
push hl
ld de,glob
ld hl,const
add hl,hl
add hl,de
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### B4w store word: fvar[const]

ZAX Example

```zax
ld fvar[const],hl
```

Steps

```
STORE_RP_FVAR DE fvar+const*2
```

ASM

```asm
ex de,hl
ld (ix+fvar+const*2),e
ld (ix+fvar+const*2+1),d
ex de,hl
```

#### B5w store word: fvar[const]

ZAX Example

```zax
ld fvar[const],hl
```

Steps

```
STORE_RP_FVAR DE fvar+const*2
```

ASM

```asm
ex de,hl
ld (ix+fvar+const*2),e
ld (ix+fvar+const*2+1),d
ex de,hl
```

### C. Indexed by register (8-bit index in `r8`)

#### C1w load word: glob[reg]

ZAX Example

```zax
ld hl,glob[ireg]
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_REG reg
CALC_EA_2
LOAD_RP_EA DE
```

ASM

```asm
ld de,glob
ld h,0
ld l,ireg
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### C2w load word: fvar[ireg]

ZAX Example

```zax
ld hl,fvar[ireg]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG reg
CALC_EA_2
LOAD_RP_EA DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,ireg
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### C3w store word: glob[reg]

ZAX Example

```zax
ld glob[ireg],hl
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_REG reg
CALC_EA_2
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld de,glob
ld h,0
ld l,ireg
add hl,hl
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
ex de,hl
```

#### C4w store word: fvar[ireg]

ZAX Example

```zax
ld fvar[ireg],hl
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG reg
CALC_EA_2
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,ireg
add hl,hl
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

### D. Indexed by variable in memory (typed address kept in memory)

Two index sources shown: a glob word `glob` and a fvar word at `fvarIdx`.

#### D1w load word: glob1[glob2]

ZAX Example

```zax
ld hl,glob1[glob2]
```

Steps

```
LOAD_BASE_GLOB glob1
LOAD_IDX_GLOB glob2
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld de,glob1
ld hl,(glob2)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D2w load word: glob[fvar2]

ZAX Example

```zax
ld hl,glob[fvar2]
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_FVAR fvar2
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld de,glob
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D3w load word: fvar[glob]

ZAX Example

```zax
ld hl,fvar[glob]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D4w load word: fvar[fvar2]

ZAX Example

```zax
ld hl,fvar[fvar2]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_FVAR fvar2
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D5w load word: fvar[glob]

ZAX Example

```zax
ld hl,fvar[glob]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D6w load word: fvar[fvar2]

ZAX Example

```zax
ld hl,fvar[fvar2]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_FVAR fvar2
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D7w store word: glob1[glob2]

ZAX Example

```zax
ld glob1[glob2],hl
```

Steps

```
LOAD_BASE_GLOB glob1
LOAD_IDX_GLOB glob2
CALC_EA
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld de,glob1
ld hl,(glob2)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### D8w store word: glob[fvar2]

ZAX Example

```zax
ld glob[fvar2],hl
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_FVAR fvar2
CALC_EA
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld de,glob
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### D9w store word: fvar[glob]

ZAX Example

```zax
ld fvar[glob],hl
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### D10w store word: fvar[fvar2]

ZAX Example

```zax
ld fvar[fvar2],hl
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_FVAR fvar2
CALC_EA
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### D11w store word: fvar[glob]

ZAX Example

```zax
ld fvar[glob],hl
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### D12w store word: fvar[fvar2]

ZAX Example

```zax
ld fvar[fvar2],hl
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_FVAR fvar2
CALC_EA
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

### E. Record fields (const offsets)

Record field access is the const-index case with `const = field_offset`.

Example load word field from a fvar record:

ZAX Example

```zax
ld hl,rec.field
```

Steps

```
LOAD_RP_FVAR DE fvarRec+field_offset
```

ASM

```asm
ex de,hl
ld e,(ix+fvarRec+field_offset)
ld d,(ix+fvarRec+field_offset+1)
ex de,hl
```

Example store reg field into a fvar record:

ZAX Example

```zax
ld rec.field,reg
```

Steps

```
STORE_REG_FVAR reg fvarRec+field_offset
```

ASM

```asm
ld (ix+fvarRec+field_offset),reg
```
