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

IDX_FRAME disp       ld l,(ix+disp)           ; dest=HL
                     ld h,(ix+disp+1)
```

### 1.4 Combine

```
ADD_BASE             add hl,de                ; dest=HL (base+offset)

ADD_BASE_2           add hl,hl                ; dest=HL (offset*2)
                     add hl,de                ; dest=HL (base+offset*2)
```

### 1.5 Accessors

```
LOAD_BYTE            ld a,(hl)                ; dest=A

LOAD_WORD            ld e,(hl)                ; dest=HL (uses DE scratch)
                     inc hl
                     ld d,(hl)
                     ex de,hl                 ; HL = word, DE = addr+1 (scratch)

STORE_BYTE           ld (hl),a                ; dest=mem (uses HL,A)

STORE_WORD           push de                  ; dest=mem, preserves HL/DE
                     ex de,hl                 ; DE = value, HL = addr
                     ld (hl),e
                     inc hl
                     ld (hl),d
                     ex de,hl                 ; restore value to HL
                     pop de                   ; restore DE
```

### 1.6 Direct absolute / frame helpers

```
LOAD_BYTE_ABS const      ld a,(const)

LOAD_WORD_ABS const      ld hl,(const)

STORE_BYTE_ABS const     ld (const),a

STORE_WORD_ABS const     ld (const),hl

FRAME_BYTE_LOAD disp     ld a,(ix+disp)

FRAME_WORD_LOAD disp     push de
                         ex de,hl
                         ld e,(ix+disp)
                         ld d,(ix+disp+1)
                         ex de,hl                 ; HL = value, DE = saved HL
                         pop de                   ; restore DE

FRAME_BYTE_STORE disp    ld (ix+disp),a

FRAME_WORD_STORE disp    push de
                         ex de,hl
                         ld (ix+disp),e
                         ld (ix+disp+1),d
                         ex de,hl
                         pop de
```

`disp` is the frame displacement: negative for locals,positive for args. When indexing with a constant,fold the scaled constant into `disp`.

## 2. Pipelines (exhaustive load/store shapes)

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
LOAD_BYTE
```

ASM

```asm
ld a,(glob_b)
```

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

#### A2 load byte from frame var

ZAX

```zax
ld a,loc_b
```

Steps

```
FRAME_BYTE_LOAD dispL
```

ASM

```asm
ld a,(ix+dispL)
```

#### A2w load word from frame var

ZAX

```zax
ld hl,loc_w
```

Steps

```
FRAME_WORD_LOAD dispL
```

ASM

```asm
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ex de,hl
```

#### A4 store byte to global

ZAX

```zax
ld glob_b,a
```

Steps

```
STORE_BYTE
```

ASM

```asm
ld (glob_b),a
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

#### A5 store byte to frame var

ZAX

```zax
ld loc_b,a
```

Steps

```
FRAME_BYTE_STORE dispL
```

ASM

```asm
ld (ix+dispL),a
```

#### A5w store word to frame var

ZAX

```zax
ld loc_w,hl
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

#### B1 load byte: global[const]

ZAX

```zax
ld a,glob_b[const]
```

Steps

```
BASE_GLOBAL const
IDX_CONST const
ADD_BASE
LOAD_BYTE
```

ASM

```asm
ld de,glob_b
ld hl,const
add hl,de
ld l,(hl)
```

#### B1w load word: global[const]

ZAX

```zax
ld hl,glob_w[const]
```

Steps

```
BASE_GLOBAL const
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

#### B2 load byte: frame[const]

ZAX

```zax
ld a,loc_b[const]
```

Steps

```
FRAME_BYTE_LOAD dispL+const
```

ASM

```asm
ld a,(ix+dispL+const)
```

#### B2w load word: frame[const]

ZAX

```zax
ld hl,loc_w[const]
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

#### B4 store byte: global[const]

ZAX

```zax
ld glob_b[const],a
```

Steps

```
BASE_GLOBAL const
IDX_CONST const
ADD_BASE
STORE_BYTE
```

ASM

```asm
ld de,glob_b
ld hl,const
add hl,de
ld (hl),a
```

#### B4w store word: global[const]

ZAX

```zax
ld glob_w[const],hl
```

Steps

```
SAVE_HL
BASE_GLOBAL const
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
ld (hl),e
inc hl
ld (hl),d
```

#### B5 store byte: local[const]

ZAX

```zax
ld loc_b[const],a
```

Steps

```
FRAME_BYTE_STORE dispL+const
```

ASM

```asm
ld (ix+dispL+const),a
```

#### B5w store word: local[const]

ZAX

```zax
ld loc_w[const],hl
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

#### B6 store byte: arg[const]

ZAX

```zax
ld arg_b[const],e
```

Steps

```
FRAME_BYTE_STORE dispA+const
```

ASM

```asm
ld (ix+dispA+const),a
```

#### B6w store word: arg[const]

ZAX

```zax
ld arg_w[const],hl
```

Steps

```
FRAME_WORD_STORE dispA+const*2
```

ASM

```asm
push de
ex de,hl
ld (ix+dispA+const*2),e
ld (ix+dispA+const*2+1),d
ex de,hl
pop de
```

> **Routing rule:** use the simplest path that matches the source shape. If there is **no `[]` index**, stay on the A-series scalar paths (direct glob/frame accessors). If the index is a **constant**, fold it into the frame displacement and use the B-series constant-index paths. Only use the indexed pipelines (C/D/E) when a runtime index is present. Do not send scalars through the indexed pipelines—they will add unnecessary base+index math and save/restore traffic.

| Access shape             | Path to use          |
| ---                      | ---                  |
| glob / frame var (no []) | A-series (scalar)    |
| glob / frame[var+const]  | B-series (const idx) |
| glob / frame[r8]         | C-series             |
| glob / frame[word index] | D/E-series           |

### C. Indexed by register (8-bit index in `r8`)

#### C1 load byte: global[r]

ZAX

```zax
ld a,glob_b[r]
```

Steps

```
BASE_GLOBAL const
IDX_REG8 reg8
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld de,glob_b
ld h,0
ld l,r
add hl,de
ld l,(hl)
pop de
```

#### C1w load word: global[r]

ZAX

```zax
ld hl,glob_w[r]
```

Steps

```
BASE_GLOBAL const
IDX_REG8 reg8
ADD_BASE_2
LOAD_WORD
```

ASM

```asm
push de
ld de,glob_w
ld h,0
ld l,r
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### C2 load byte: local[r]

ZAX

```zax
ld a,loc_b[r]
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld h,0
ld l,r
add hl,de
ld l,(hl)
pop de
```

#### C2w load word: local[r]

ZAX

```zax
ld hl,loc_w[r]
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
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld h,0
ld l,r
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### C3 load byte: arg[r]

ZAX

```zax
ld a,arg_b[r]
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld h,0
ld l,r
add hl,de
ld l,(hl)
pop de
```

#### C3w load word: arg[r]

ZAX

```zax
ld hl,arg_w[r]
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
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld h,0
ld l,r
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### C4 store byte: global[r]

ZAX

```zax
ld glob_b[r],e
```

Steps

```
BASE_GLOBAL const
IDX_REG8 reg8
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld de,glob_b
ld h,0
ld l,r
add hl,de
ld (hl),e
pop de
```

#### C4w store word: global[r]

ZAX

```zax
ld glob_w[r],hl
```

Steps

```
BASE_GLOBAL const
IDX_REG8 reg8
ADD_BASE_2
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
push de
push hl
ld de,glob_w
ld h,0
ld l,r
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

#### C5 store byte: local[r]

ZAX

```zax
ld loc_b[r],e
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld h,0
ld l,r
add hl,de
ld (hl),e
pop de
```

#### C5w store word: local[r]

ZAX

```zax
ld loc_w[r],hl
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
push de
push hl
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld h,0
ld l,r
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

#### C6 store byte: arg[r]

ZAX

```zax
ld arg_b[r],e
```

Steps

```
BASE_FRAME disp
IDX_REG8 reg8
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld h,0
ld l,r
add hl,de
ld (hl),e
pop de
```

#### C6w store word: arg[r]

ZAX

```zax
ld arg_w[r],hl
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
push de
push hl
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld h,0
ld l,r
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

### D. Indexed by variable in memory (typed address kept in memory)

Two index sources shown: a global word `idxG` and a frame word at `dispIdx`.

#### D1 load byte: global[idxG]

ZAX

```zax
ld a,glob_b[idxG]
```

Steps

```
BASE_GLOBAL const
IDX_GLOBAL const
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld de,glob_b
ld hl,(idxG)
add hl,de
ld l,(hl)
pop de
```

#### D1w load word: global[idxG]

ZAX

```zax
ld hl,glob_w[idxG]
```

Steps

```
BASE_GLOBAL const
IDX_GLOBAL const
ADD_BASE
LOAD_WORD
```

ASM

```asm
push de
ld de,glob_w
ld hl,(idxG)
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### D2 load byte: global[idxFrame]

ZAX

```zax
ld a,glob_b[idxFrame]
```

Steps

```
BASE_GLOBAL const
IDX_FRAME disp
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld de,glob_b
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,de
ld l,(hl)
pop de
```

#### D2w load word: global[idxFrame]

ZAX

```zax
ld hl,glob_w[idxFrame]
```

Steps

```
BASE_GLOBAL const
IDX_FRAME disp
ADD_BASE
LOAD_WORD
```

ASM

```asm
push de
ld de,glob_w
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### D3 load byte: local[idxG]

ZAX

```zax
ld a,loc_b[idxG]
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld hl,(idxG)
add hl,de
ld l,(hl)
pop de
```

#### D3w load word: local[idxG]

ZAX

```zax
ld hl,loc_w[idxG]
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
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld hl,(idxG)
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### D4 load byte: local[idxFrame]

ZAX

```zax
ld a,loc_b[idxFrame]
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,de
ld l,(hl)
pop de
```

#### D4w load word: local[idxFrame]

ZAX

```zax
ld hl,loc_w[idxFrame]
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
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### D5 load byte: arg[idxG]

ZAX

```zax
ld a,arg_b[idxG]
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld hl,(idxG)
add hl,de
ld l,(hl)
pop de
```

#### D5w load word: arg[idxG]

ZAX

```zax
ld hl,arg_w[idxG]
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
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld hl,(idxG)
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### D6 load byte: arg[idxFrame]

ZAX

```zax
ld a,arg_b[idxFrame]
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
LOAD_BYTE
```

ASM

```asm
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,de
ld l,(hl)
pop de
```

#### D6w load word: arg[idxFrame]

ZAX

```zax
ld hl,arg_w[idxFrame]
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
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### D7 store byte: global[idxG]

ZAX

```zax
ld glob_b[idxG],e
```

Steps

```
BASE_GLOBAL const
IDX_GLOBAL const
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld de,glob_b
ld hl,(idxG)
add hl,de
ld (hl),e
pop de
```

#### D7w store word: global[idxG]

ZAX

```zax
ld glob_w[idxG],hl
```

Steps

```
BASE_GLOBAL const
IDX_GLOBAL const
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
push de
push hl
ld de,glob_w
ld hl,(idxG)
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

#### D8 store byte: global[idxFrame]

ZAX

```zax
ld glob_b[idxFrame],e
```

Steps

```
BASE_GLOBAL const
IDX_FRAME disp
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld de,glob_b
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,de
ld (hl),e
pop de
```

#### D8w store word: global[idxFrame]

ZAX

```zax
ld glob_w[idxFrame],hl
```

Steps

```
BASE_GLOBAL const
IDX_FRAME disp
ADD_BASE
SWAP_SAVED
SWAP
STORE_WORD
SWAP
```

ASM

```asm
push de
push hl
ld de,glob_w
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

#### D9 store byte: local[idxG]

ZAX

```zax
ld loc_b[idxG],e
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld hl,(idxG)
add hl,de
ld (hl),e
pop de
```

#### D9w store word: local[idxG]

ZAX

```zax
ld loc_w[idxG],hl
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
push de
push hl
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld hl,(idxG)
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

#### D10 store byte: local[idxFrame]

ZAX

```zax
ld loc_b[idxFrame],e
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,de
ld (hl),e
pop de
```

#### D10w store word: local[idxFrame]

ZAX

```zax
ld loc_w[idxFrame],hl
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
push de
push hl
ld e,(ix+dispL)
ld d,(ix+dispL+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

#### D11 store byte: arg[idxG]

ZAX

```zax
ld arg_b[idxG],e
```

Steps

```
BASE_FRAME disp
IDX_GLOBAL const
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld hl,(idxG)
add hl,de
ld (hl),e
pop de
```

#### D11w store word: arg[idxG]

ZAX

```zax
ld arg_w[idxG],hl
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
push de
push hl
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld hl,(idxG)
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

#### D12 store byte: arg[idxFrame]

ZAX

```zax
ld arg_b[idxFrame],e
```

Steps

```
BASE_FRAME disp
IDX_FRAME disp
ADD_BASE
STORE_BYTE
```

ASM

```asm
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,de
ld (hl),e
pop de
```

#### D12w store word: arg[idxFrame]

ZAX

```zax
ld arg_w[idxFrame],hl
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
push de
push hl
ld e,(ix+dispA)
ld d,(ix+dispA+1)
push de
ld e,(ix+dispIdx)
ld d,(ix+dispIdx+1)
ex de,hl
pop de
add hl,hl
add hl,de
ex (sp),hl
pop de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

### E. Record fields (const offsets)

Record field access is the const-index case with `const = field_offset`.

Example load word field from a local record:

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
push de
ld e,(ix+dispRec+field_offset)
ld d,(ix+dispRec+field_offset+1)
ex de,hl
pop de
```

Example store byte field into an arg record:

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

## 3. Notes

- Per-instruction preservation: only the destination register (loads) or value register (`A`/`HL` for stores) may change; all scratch registers are saved/restored in the pipelines above.
- IX is never scratch; frame accesses use explicit displacements.
- Pipelines above cover the full matrix of base (global/local/arg),index source (const,reg8,memory global/frame),width (byte/word),and operation (load/store). Additional register-pair shuffles can be composed from the same steps if a lowering conflict arises.
