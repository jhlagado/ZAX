# ZAX Addressing Model (v0.2) — Step Pipelines

Goal: express every allowed load/store addressing shape as a short pipeline of reusable **steps** (concatenative/Forth style). A pipeline must leave all registers untouched except the destination (for loads) or the value-carrying register (for stores, typically `A` or `HL`). IX is never scratch.

## 1. Step Library (reusable “words”)

### 1.1 Save / restore

```
SAVE_HL              push hl                  ; saves HL (no clobber)

SAVE_DE              push de                  ; saves DE (no clobber)

RESTORE_DE           pop de                   ; restores DE

SWAP                 ex de,hl                 ; swaps DE<->HL (dest=both)

SWAP_SAVED           ex (sp),hl               ; swaps HL with TOS (dest=HL + TOS word)
```

### 1.2 Base loaders (place base in DE)

```
BASE_GLOBAL const    ld de,const              ; dest=DE

BASE_FRAME disp      ld e,(ix+disp)           ; dest=DE
                     ld d,(ix+disp+1)
```

### 1.3 Index loaders (place index in HL)

```
IDX_CONST const      ld hl,const              ; dest=HL

IDX_REG8 reg8        ld h,0                   ; dest=HL
                     ld l,reg8

IDX_REG16 reg16      ld hl,reg16              ; dest=HL

IDX_GLOBAL const     ld hl,(const)            ; dest=HL

IDX_FRAME disp       ex de,hl                 ; dest=HL
                     ld e,(ix+disp)
                     ld d,(ix+disp+1)
                     ex de,hl
```

### 1.4 Combine

```
ADD_BASE             add hl,de                ; dest=HL (base+offset)

ADD_BASE_2           add hl,hl                ; dest=HL (offset*2)
                     add hl,de                ; dest=HL (base+offset*2)
```

### 1.5 Accessors (byte)

```
LOAD_REG8_HL reg8             ld reg8,(hl)                

STORE_REG8_HL reg8            ld (hl),reg8                

LOAD_REG8_ABS reg8 const      ld reg8,(const)

STORE_REG8_ABS reg8 const     ld (const),reg8

LOAD_REG8_FRAME reg8 disp     ld reg8,(ix+disp)

STORE_REG8_FRAME reg8 disp    ld (ix+disp),reg8

```

### 1.6 Accessors (word)

```
LOAD_REG16_HL reg16           ld reg16L,(hl)                
                              inc hl
                              ld reg16H,(hl)

STORE_REG16_HL reg16          ld (hl),reg16L                
                              inc hl
                              ld (hl),reg16H

LOAD_REG16_ABS reg16 const    ld reg16,(const)

STORE_REG16_ABS reg16 const   ld (const),reg16

LOAD_REG16_FRAME reg16 disp   ld reg16L,(ix+disp)
                              ld reg16H,(ix+disp+1)

STORE_REG16_FRAME reg16 disp  ld (ix+disp),reg16l
                              ld (ix+disp+1),reg16h
```

`disp` is the frame displacement: negative for locals,positive for args. When indexing with a constant,fold the scaled constant into `disp`.

## 2. Pipelines (byte)

For each shape:

- ZAX: the source line.
- Steps: vertical list of step names with parameters.
- ASM: exact codegen (one instruction per line).

### A. Scalars (no index)

#### A1 load byte from global

ZAX

```zax
ld a,glob_b
```

Steps

```
LOAD_REG8_HL
```

ASM

```asm
ld a,(glob_b)
```

#### A2 load byte from frame var

ZAX

```zax
ld a,frame_b
```

Steps

```
FRAME_BYTE_LOAD dispL
```

ASM

```asm
ld a,(ix+dispL)
```

#### A4 store byte to global

ZAX

```zax
ld glob_b,a
```

Steps

```
STORE_REG8_HL
```

ASM

```asm
ld (hl),a
```

#### A5 store byte to frame var

ZAX

```zax
ld frame_b,a
```

Steps

```
FRAME_BYTE_STORE dispL
```

ASM

```asm
ld (ix+dispL),a
```

#### B1 load byte: global[const]

ZAX

```zax
ld a,glob_b[const]
```

Steps

```
BASE_GLOBAL glob_b
IDX_CONST const
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld de,glob_b
ld hl,const
add hl,de
ld a,(hl)
```

#### B2 load byte: frame[const]

ZAX

```zax
ld a,frame_b[const]
```

Steps

```
FRAME_BYTE_LOAD dispL+const
```

ASM

```asm
ld a,(ix+dispL+const)
```

#### B4 store byte: global[const]

ZAX

```zax
ld glob_b[const],a
```

Steps

```
BASE_GLOBAL glob_b
IDX_CONST const
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld de,glob_b
ld hl,const
add hl,de
ld (hl),a
```

#### B5 store byte: frame[const]

ZAX

```zax
ld frame_b[const],a
```

Steps

```
FRAME_BYTE_STORE dispL+const
```

ASM

```asm
ld (ix+dispL+const),a
```

#### B6 store byte: frame[const]

ZAX

```zax
ld frame_b[const],a
```

Steps

```
FRAME_BYTE_STORE dispA+const
```

ASM

```asm
ld (ix+dispA+const),a
```

#### C1 load byte: global[r]

ZAX

```zax
ld a,glob_b[r]
```

Steps

```
BASE_GLOBAL glob_b
IDX_REG8 reg8
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld de,glob_b
ld h,0
ld l,reg8
add hl,de
ld a,(hl)
```

#### C2 load byte: frame[r]

ZAX

```zax
ld a,frame_b[r]
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
add hl,de
ld a,(hl)
```

#### C3 load byte: frame[r]

ZAX

```zax
ld a,frame_b[r]
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
add hl,de
ld a,(hl)
```

#### C4 store byte: global[r]

ZAX

```zax
ld glob_b[r],a
```

Steps

```
BASE_GLOBAL glob_b
IDX_REG8 reg8
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld de,glob_b
ld h,0
ld l,reg8
add hl,de
ld (hl),a
```

#### C5 store byte: frame[r]

ZAX

```zax
ld frame_b[r],e
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
add hl,de
ld (hl),a
```

#### C6 store byte: frame[r]

ZAX

```zax
ld frame_b[r],a
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
add hl,de
ld (hl),a
```

#### D1 load byte: global[idxG]

ZAX

```zax
ld a,glob_b[idxG]
```

Steps

```
BASE_GLOBAL glob_b
IDX_GLOBAL const
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld de,glob_b
ld hl,(const)
add hl,de
ld a,(hl)
```

#### D2 load byte: global[idxFrame]

ZAX

```zax
ld a,glob_b[idxFrame]
```

Steps

```
BASE_GLOBAL glob_b
IDX_FRAME disp
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld de,glob_b
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld a,(hl)
```

#### D3 load byte: frame[idxG]

ZAX

```zax
ld a,frame_b[idxG]
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld hl,(const)
add hl,de
ld a,(hl)
```

#### D4 load byte: frame[idxFrame]

ZAX

```zax
ld a,frame_b[idxFrame]
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld a,(hl)
```

#### D5 load byte: frame[idxG]

ZAX

```zax
ld a,frame_b[idxG]
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld hl,(const)
add hl,de
ld a,(hl)
```

#### D6 load byte: frame[idxFrame]

ZAX

```zax
ld a,frame_b[idxFrame]
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
LOAD_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld a,(hl)
```

#### D7 store byte: global[idxG]

ZAX

```zax
ld glob_b[idxG],a
```

Steps

```
BASE_GLOBAL glob_b
IDX_GLOBAL const
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld de,glob_b
ld hl,(const)
add hl,de
ld (hl),a
```

#### D8 store byte: global[idxFrame]

ZAX

```zax
ld glob_b[idxFrame],a
```

Steps

```
BASE_GLOBAL glob_b
IDX_FRAME disp
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld de,glob_b
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld (hl),a
```

#### D9 store byte: frame[idxG]

ZAX

```zax
ld frame_b[idxG],a
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld hl,(const)
add hl,de
ld (hl),a
```

#### D10 store byte: frame[idxFrame]

ZAX

```zax
ld frame_b[idxFrame],a
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld (hl),a
```

#### D11 store byte: frame[idxG]

ZAX

```zax
ld frame_b[idxG],a
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld hl,(const)
add hl,de
ld (hl),a
```

#### D12 store byte: frame[idxFrame]

ZAX

```zax
ld frame_b[idxFrame],a
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
STORE_REG8_HL
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld (hl),a
```

## 3. Pipelines (word)

#### A1w load word from global

ZAX

```zax
ld hl,glob_w
```

Steps

```
LOAD_WORD_ABS glob_w
```

ASM

```asm
ld hl,(glob_w)
```

#### A2w load word from frame var

ZAX

```zax
ld hl,frame_w
```

Steps

```
FRAME_WORD_LOAD dispL
```

ASM

```asm
ex de,hl
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ex de,hl
```

#### A4w store word to global

ZAX

```zax
ld glob_w,hl
```

Steps

```
STORE_WORD_ABS glob_w
```

ASM

```asm
ld (glob_w),hl
```

#### A5w store word to frame var

ZAX

```zax
ld frame_w,hl
```

Steps

```
FRAME_WORD_STORE dispL
```

ASM

```asm
ex de,hl
ld (ix+dispL),e
ld (ix+dispL+1),d
ex de,hl
```

### B. Indexed by const

Element size = 1 for byte,2 for word (use `ADD_BASE_2`; larger powers not supported).

#### B1w load word: global[const]

ZAX

```zax
ld hl,glob_w[const]
```

Steps

```
BASE_GLOBAL glob_w
IDX_CONST const
ADD_BASE_2
LOAD_WORD
```

ASM

```asm
ld de,glob_w
ld hl,const
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### B2w load word: frame[const]

ZAX

```zax
ld hl,frame_w[const]
```

Steps

```
FRAME_WORD_LOAD dispL+const*2
```

ASM

```asm
ex de,hl
ld e,(ix+dispL+const*2)
ld d,(ix+dispL+const*2+1)
ex de,hl
```

#### B4w store word: global[const]

ZAX

```zax
ld glob_w[const],hl
```

Steps

```
SAVE_HL
BASE_GLOBAL glob_w
IDX_CONST const
ADD_BASE_2
RESTORE_DE
STORE_WORD
```

ASM

```asm
push hl
ld de,glob_w
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

#### B5w store word: frame[const]

ZAX

```zax
ld frame_w[const],hl
```

Steps

```
FRAME_WORD_STORE dispL+const*2
```

ASM

```asm
ex de,hl
ld (ix+dispL+const*2),e
ld (ix+dispL+const*2+1),d
ex de,hl
```

#### B6w store word: frame[const]

ZAX

```zax
ld frame_w[const],hl
```

Steps

```
FRAME_WORD_STORE dispA+const*2
```

ASM

```asm
ex de,hl
ld (ix+dispA+const*2),e
ld (ix+dispA+const*2+1),d
ex de,hl
```

### C. Indexed by register (8-bit index in `r8`)

#### C1w load word: global[r]

ZAX

```zax
ld hl,glob_w[r]
```

Steps

```
BASE_GLOBAL glob_w
IDX_REG8 reg8
ADD_BASE_2
LOAD_WORD
```

ASM

```asm
ld de,glob_w
ld h,0
ld l,reg8
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### C2w load word: frame[r]

ZAX

```zax
ld hl,frame_w[r]
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE_2
LOAD_WORD
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### C3w load word: frame[r]

ZAX

```zax
ld hl,frame_w[r]
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE_2
LOAD_WORD
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### C4w store word: global[r]

ZAX

```zax
ld glob_w[r],hl
```

Steps

```
BASE_GLOBAL glob_w
IDX_REG8 reg8
ADD_BASE_2
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld de,glob_w
ld h,0
ld l,reg8
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

#### C5w store word: frame[r]

ZAX

```zax
ld frame_w[r],hl
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE_2
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
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

#### C6w store word: frame[r]

ZAX

```zax
ld frame_w[r],hl
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld h,0
ld l,reg8
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

Two index sources shown: a global word `idxG` and a frame word at `dispIdx`.

#### D1w load word: global[idxG]

ZAX

```zax
ld hl,glob_w[idxG]
```

Steps

```
BASE_GLOBAL glob_w
IDX_GLOBAL const
ADD_BASE
LOAD_WORD
```

ASM

```asm
ld de,glob_w
ld hl,(const)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D2w load word: global[idxFrame]

ZAX

```zax
ld hl,glob_w[idxFrame]
```

Steps

```
BASE_GLOBAL glob_w
IDX_FRAME disp
ADD_BASE
LOAD_WORD
```

ASM

```asm
ld de,glob_w
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D3w load word: frame[idxG]

ZAX

```zax
ld hl,frame_w[idxG]
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
LOAD_WORD
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld hl,(const)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D4w load word: frame[idxFrame]

ZAX

```zax
ld hl,frame_w[idxFrame]
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
LOAD_WORD
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D5w load word: frame[idxG]

ZAX

```zax
ld hl,frame_w[idxG]
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
LOAD_WORD
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld hl,(const)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D6w load word: frame[idxFrame]

ZAX

```zax
ld hl,frame_w[idxFrame]
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
LOAD_WORD
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
```

#### D7w store word: global[idxG]

ZAX

```zax
ld glob_w[idxG],hl
```

Steps

```
BASE_GLOBAL glob_w
IDX_GLOBAL const
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld de,glob_w
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

#### D8w store word: global[idxFrame]

ZAX

```zax
ld glob_w[idxFrame],hl
```

Steps

```
BASE_GLOBAL glob_w
IDX_FRAME disp
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld de,glob_w
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### D9w store word: frame[idxG]

ZAX

```zax
ld frame_w[idxG],hl
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
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

#### D10w store word: frame[idxFrame]

ZAX

```zax
ld frame_w[idxFrame],hl
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
add hl,de
ex (sp),hl
ex de,hl
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
```

#### D11w store word: frame[idxG]

ZAX

```zax
ld frame_w[idxG],hl
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
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

#### D12w store word: frame[idxFrame]

ZAX

```zax
ld frame_w[idxFrame],hl
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
ld e,(ix+disp)
ld d,(ix+disp+1)
ld l,(ix+disp)
ld h,(ix+disp+1)
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

Example load word field from a frame record:

ZAX

```zax
ld hl,rec.field
```

Steps

```
FRAME_WORD_LOAD dispRec+field_offset
```

ASM

```asm
ex de,hl
ld e,(ix+dispRec+field_offset)
ld d,(ix+dispRec+field_offset+1)
ex de,hl
```

Example store byte field into a frame record:

ZAX

```zax
ld rec.field,a
```

Steps

```
FRAME_BYTE_STORE dispRec+field_offset
```

ASM

```asm
ld (ix+dispRec+field_offset),a
```

## 4. Notes

- Per-instruction preservation: only the destination register (loads) or value register (`A`/`HL` for stores) may change; all scratch registers are saved/restored in the pipelines above.
- IX is never scratch; frame accesses use explicit displacements.
- Pipelines above cover the full matrix of base (global/local/arg),index source (const,reg8,memory global/frame),width (byte/word),and operation (load/store). Additional register-pair shuffles can be composed from the same steps if a lowering conflict arises.
