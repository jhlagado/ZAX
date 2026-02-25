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

### A. Scalars (no index)

#### A1 load reg from glob

ZAX Example

```zax
ld reg,glob
```

Steps

```
LOAD_REG_GLOB reg glob
```

ASM

```asm
ld reg,(glob)
```

#### A2 load reg from fvar

ZAX Example

```zax
ld reg,fvar
```

Steps

```
LOAD_REG_FVAR reg fvar
```

ASM

```asm
ld reg,(ix+fvar)
```

#### A4 store reg to glob

ZAX Example

```zax
ld glob,reg
```

Steps

```
STORE_REG_GLOB reg glob
```

ASM

```asm
ld (glob),reg
```

#### A5 store reg to fvar

ZAX Example

```zax
ld fvar,reg
```

Steps

```
STORE_REG_FVAR reg fvar
```

ASM

```asm
ld (ix+fvar),reg
```

#### B1 load reg from glob[const]

ZAX Example

```zax
ld reg,glob[const]
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_CONST const
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld de,glob
ld hl,const
add hl,de
ld reg,(hl)
```

#### B2 load reg from fvar[const]

ZAX Example

```zax
ld reg,fvar[const]
```

Steps

```
LOAD_REG_FVAR reg fvar+const
```

ASM

```asm
ld reg,(ix+fvar+const)
```

#### B4 store reg in glob[const]

ZAX Example

```zax
ld glob[const],reg
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_CONST const
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld de,glob
ld hl,const
add hl,de
ld (hl),reg
```

#### B5 store reg in fvar[const]

ZAX Example

```zax
ld fvar[const],reg
```

Steps

```
STORE_REG_FVAR reg fvar+const
```

ASM

```asm
ld (ix+fvar+const),reg
```

#### C1 load reg glob[ireg]

ZAX Example

```zax
ld reg,glob[ireg]
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_REG ireg
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld de,glob
ld h,0
ld l,ireg
add hl,de
ld reg,(hl)
```

#### C2 load reg from fvar[ireg]

ZAX Example

```zax
ld reg,fvar[ireg]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG ireg
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,ireg
add hl,de
ld reg,(hl)
```

#### C3 load reg from fvar[ireg]

ZAX Example

```zax
ld reg,fvar[ireg]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG ireg
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,ireg
add hl,de
ld reg,(hl)
```

#### C4 store reg in glob[ireg]

ZAX Example

```zax
ld glob[ireg],reg
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_REG ireg
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld de,glob
ld h,0
ld l,ireg
add hl,de
ld (hl),reg
```

#### C5 store reg in fvar[ireg]

ZAX Example

```zax
ld fvar[ireg],reg
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG ireg
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,ireg
add hl,de
ld (hl),reg
```

#### C6 store reg in fvar[ireg]

ZAX Example

```zax
ld fvar[ireg],reg
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG ireg
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld h,0
ld l,ireg
add hl,de
ld (hl),reg
```

#### D1 load reg: glob1[glob2]

ZAX Example

```zax
ld reg,glob1[glob2]
```

Steps

```
LOAD_BASE_GLOB glob1
LOAD_IDX_GLOB glob2
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld de,glob1
ld hl,(glob2)
add hl,de
ld reg,(hl)
```

#### D2 load reg from glob[fvar]

ZAX Example

```zax
ld reg,glob[fvar]
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_FVAR fvar
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld de,glob
ld l,(ix+fvar)
ld h,(ix+fvar+1)
add hl,de
ld reg,(hl)
```

#### D3 load reg from fvar[glob]

ZAX Example

```zax
ld reg,fvar[glob]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ld reg,(hl)
```

#### D4 load reg from fvar[fvar2]

ZAX Example

```zax
ld reg,fvar[fvar2]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_FVAR fvar2
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ld reg,(hl)
```

#### D5 load reg from fvar[glob]

ZAX Example

```zax
ld reg,fvar[glob]
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ld reg,(hl)
```

#### D6 load reg from fvar1[fvar2]

ZAX Example

```zax
ld reg,fvar1[fvar2]
```

Steps

```
LOAD_BASE_FVAR fvar1
LOAD_IDX_FVAR fvar2
CALC_EA
LOAD_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar1)
ld d,(ix+fvar1+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ld reg,(hl)
```

#### D7 store reg in glob1[glob2]

ZAX Example

```zax
ld glob1[glob2],reg
```

Steps

```
LOAD_BASE_GLOB glob1
LOAD_IDX_GLOB glob2
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld de,glob1
ld hl,(glob2)
add hl,de
ld (hl),reg
```

#### D8 store reg in glob[fvar]

ZAX Example

```zax
ld glob[fvar],reg
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_FVAR fvar
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld de,glob
ld l,(ix+fvar)
ld h,(ix+fvar+1)
add hl,de
ld (hl),reg
```

#### D9 store reg in fvar[glob]

ZAX Example

```zax
ld fvar[glob],reg
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ld (hl),reg
```

#### D10 store reg in fvar1[fvar2]

ZAX Example

```zax
ld fvar1[fvar2],reg
```

Steps

```
LOAD_BASE_FVAR fvar1
LOAD_IDX_FVAR fvar2
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar1)
ld d,(ix+fvar1+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ld (hl),reg
```

#### D11 store reg in fvar[glob]

ZAX Example

```zax
ld fvar[glob],reg
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_GLOB glob
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(glob)
add hl,de
ld (hl),reg
```

#### D12 store reg in fvar1[fvar2]

ZAX Example

```zax
ld fvar1[fvar2],reg
```

Steps

```
LOAD_BASE_FVAR fvar1
LOAD_IDX_FVAR fvar2
CALC_EA
STORE_REG_EA reg
```

ASM

```asm
ld e,(ix+fvar1)
ld d,(ix+fvar1+1)
ld l,(ix+fvar2)
ld h,(ix+fvar2+1)
add hl,de
ld (hl),reg
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

#### A4w store word to glob

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

#### A5w store word to fvar

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

#### B4w store word: glob[const]

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

#### B6w store word: fvar[const]

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

#### C3w load word: fvar[ireg]

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

#### C4w store word: glob[reg]

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

#### C5w store word: fvar[ireg]

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

#### C6w store word: fvar[ireg]

ZAX Example

```zax
ld fvar[ireg],hl
```

Steps

```
LOAD_BASE_FVAR fvar
LOAD_IDX_REG reg
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
ld h,0
ld l,ireg
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

#### D1w load word: glob[glob]

ZAX Example

```zax
ld hl,glob[glob]
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_GLOB const
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld de,glob
ld hl,(const)
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
LOAD_IDX_FVAR fvar
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld de,glob
ld l,(ix+fvar)
ld h,(ix+fvar+1)
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
LOAD_IDX_GLOB const
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld hl,(const)
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
LOAD_IDX_FVAR fvar
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
LOAD_IDX_FVAR fvar
CALC_EA
LOAD_RP_EA DE
```

ASM

```asm
ld e,(ix+fvar)
ld d,(ix+fvar+1)
ld l,(ix+fvar)
ld h,(ix+fvar+1)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D7w store word: glob[glob]

ZAX Example

```zax
ld glob[glob],hl
```

Steps

```
LOAD_BASE_GLOB glob
LOAD_IDX_GLOB const
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
LOAD_IDX_FVAR fvar
CALC_EA
SWAP_HL_SAVED
SWAP_HL_DE
STORE_RP_EA DE
SWAP_HL_DE
```

ASM

```asm
ld de,glob
ld l,(ix+fvar)
ld h,(ix+fvar+1)
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
LOAD_IDX_GLOB const
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
ld hl,(const)
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
LOAD_IDX_FVAR fvar
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
ld l,(ix+fvar)
ld h,(ix+fvar+1)
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
LOAD_IDX_GLOB const
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
ld hl,(const)
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
LOAD_IDX_FVAR fvar
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
ld l,(ix+fvar)
ld h,(ix+fvar+1)
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

## 4. Notes

- Per-instruction preservation: only the destination register (loads) or value register (`A`/`HL` for stores) may change, all scratch registers are saved/restored in the pipelines above.
- IX is never scratch fvar accesses use explicit displacements.
- Pipelines above cover the full matrix of base (glob/local/arg),index source (const,reg,memory glob/fvar),width (byte/word),and operation (load/store). Additional register-pair shuffles can be composed from the same steps if a lowering conflict arises.
