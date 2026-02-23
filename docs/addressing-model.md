# ZAX Addressing Model (v0.2) — Step Pipelines

Goal: express every allowed load/store addressing shape as a short pipeline of reusable **steps** (concatenative/Forth style). A pipeline must leave all registers untouched except the destination (for loads) or the value-carrying register (for stores, typically `A` or `HL`). IX is never scratch.

## 1. Step Library (reusable “words”)

### 1.1 Save / restore

```
SAVE_HL              push hl
SAVE_DE              push de
RESTORE_HL           pop hl
RESTORE_DE           pop de
DROP_SAVED           inc sp      ; drop low
                     inc sp      ; drop high
XCHG_DE_HL           ex de,hl
XCHG_SP_HL           ex (sp),hl   ; swap HL with top-of-stack
```

### 1.2 Base loaders (place base in DE)

```
BASE_GLOBAL sym      ld de,sym
BASE_FRAME disp      ld e,(ix+disp)
                     ld d,(ix+disp+1)
```

### 1.3 Index loaders (place index in HL)

```
IDX_CONST k          ld hl,k
IDX_REG8 r           ld h,0
                     ld l,r
IDX_REG16 rp         ld hl,rp
IDX_MEM_GLOBAL sym   ld hl,(sym)
IDX_MEM_FRAME disp   ld l,(ix+disp)
                     ld h,(ix+disp+1)
```

### 1.4 Scaling (power-of-two only)

```
SCALE_1              ; no-op
SCALE_2              add hl,hl
SCALE_4              add hl,hl
                     add hl,hl
```

### 1.5 Combine

```
ADD_BASE             add hl,de    ; HL = base(DE) + offset(HL)
```

### 1.6 Accessors

```
LOAD_BYTE            ld a,(hl)

LOAD_WORD            ld e,(hl)
                     inc hl
                     ld d,(hl)
                     ex de,hl     ; HL = word, DE = addr+1 (scratch)

STORE_BYTE           ld (hl),a

STORE_WORD_FROM_DE   ld (hl),e    ; HL = addr, DE = value
                     inc hl
                     ld (hl),d
```

### 1.7 Direct absolute / frame helpers

```
LOAD_BYTE_ABS sym        ld a,(sym)
LOAD_WORD_ABS sym        ld hl,(sym)
STORE_BYTE_ABS sym       ld (sym),a
STORE_WORD_ABS sym       ld (sym),hl

FRAME_BYTE_LOAD disp     ld a,(ix+disp)
FRAME_WORD_LOAD disp     push de
                         ld e,(ix+disp)
                         ld d,(ix+disp+1)
                         ex de,hl          ; HL = value, DE restored by pop
                         pop de

FRAME_BYTE_STORE disp    ld (ix+disp),a
FRAME_WORD_STORE disp    push de
                         ex de,hl
                         ld (ix+disp),e
                         ld (ix+disp+1),d
                         ex de,hl
                         pop de
```

`disp` is the frame displacement: negative for locals, positive for args. When indexing with a constant, fold the scaled constant into `disp`.

## 2. Pipelines (exhaustive load/store shapes)

For each shape:

- ZAX: the source line.
- Steps: vertical list of step names with parameters.
- ASM: exact codegen (one instruction per line).

### A. Scalars (no index)

#### A1 load byte from global

ZAX
```zax
ld a, glob_b
```

Steps
```
LOAD_BYTE_ABS glob_b
```

ASM
```asm
ld a,(glob_b)
```

#### A1w load word from global

ZAX
```zax
ld hl, glob_w
```

Steps
```
LOAD_WORD_ABS glob_w
```

ASM
```asm
ld hl,(glob_w)
```

#### A2 load byte from local

ZAX
```zax
ld a, loc_b
```

Steps
```
FRAME_BYTE_LOAD dispL
```

ASM
```asm
ld a,(ix+dispL)
```

#### A2w load word from local

ZAX
```zax
ld hl, loc_w
```

Steps
```
FRAME_WORD_LOAD dispL
```

ASM
```asm
ld l,(ix+dispL)
ld h,(ix+dispL+1)
```

#### A3 load byte from arg

ZAX
```zax
ld a, arg_b
```

Steps
```
FRAME_BYTE_LOAD dispA
```

ASM
```asm
ld a,(ix+dispA)
```

#### A3w load word from arg

ZAX
```zax
ld hl, arg_w
```

Steps
```
FRAME_WORD_LOAD dispA
```

ASM
```asm
ld l,(ix+dispA)
ld h,(ix+dispA+1)
```

#### A4 store byte to global

ZAX
```zax
ld glob_b, a
```

Steps
```
STORE_BYTE_ABS glob_b
```

ASM
```asm
ld (glob_b),a
```

#### A4w store word to global

ZAX
```zax
ld glob_w, hl
```

Steps
```
STORE_WORD_ABS glob_w
```

ASM
```asm
ld (glob_w),hl
```

#### A5 store byte to local

ZAX
```zax
ld loc_b, a
```

Steps
```
FRAME_BYTE_STORE dispL
```

ASM
```asm
ld (ix+dispL),a
```

#### A5w store word to local

ZAX
```zax
ld loc_w, hl
```

Steps
```
FRAME_WORD_STORE dispL
```

ASM
```asm
push de
ex de,hl
ld (ix+dispL),e
ld (ix+dispL+1),d
ex de,hl
pop de
```

#### A6 store byte to arg

ZAX
```zax
ld arg_b, a
```

Steps
```
FRAME_BYTE_STORE dispA
```

ASM
```asm
ld (ix+dispA),a
```

#### A6w store word to arg

ZAX
```zax
ld arg_w, hl
```

Steps
```
FRAME_WORD_STORE dispA
```

ASM
```asm
push de
ex de,hl
ld (ix+dispA),e
ld (ix+dispA+1),d
ex de,hl
pop de
```

### B. Indexed by const

Element size = 1 for byte, 2 for word (use `SCALE_2`; larger powers repeat `SCALE_2`).

#### B1 load byte: global[const]

ZAX
```zax
ld a, glob_b[const]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_CONST const
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld hl,const
add hl,de
ld a,(hl)
pop de
pop hl
```

#### B1w load word: global[const]

ZAX
```zax
ld hl, glob_w[const]
```

Steps
```
SAVE_DE
BASE_GLOBAL glob_w
IDX_CONST const
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
```

ASM
```asm
push de
ld de,glob_w
ld hl,const
add hl,hl
add hl,de
ld e,(hl)
inc hl
ld d,(hl)
ex de,hl
pop de
```

#### B2 load byte: local[const]

ZAX
```zax
ld a, loc_b[const]
```

Steps
```
FRAME_BYTE_LOAD dispL+const
```

ASM
```asm
ld a,(ix+dispL+const)
```

#### B2w load word: local[const]

ZAX
```zax
ld hl, loc_w[const]
```

Steps
```
FRAME_WORD_LOAD dispL+const*2
```

ASM
```asm
ld l,(ix+dispL+const*2)
ld h,(ix+dispL+const*2+1)
```

#### B3 load byte: arg[const]

ZAX
```zax
ld a, arg_b[const]
```

Steps
```
FRAME_BYTE_LOAD dispA+const
```

ASM
```asm
ld a,(ix+dispA+const)
```

#### B3w load word: arg[const]

ZAX
```zax
ld hl, arg_w[const]
```

Steps
```
FRAME_WORD_LOAD dispA+const*2
```

ASM
```asm
ld l,(ix+dispA+const*2)
ld h,(ix+dispA+const*2+1)
```

#### B4 store byte: global[const]

ZAX
```zax
ld glob_b[const], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_CONST const
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld hl,const
add hl,de
ld (hl),a
pop de
pop hl
```

#### B4w store word: global[const]

ZAX
```zax
ld glob_w[const], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_GLOBAL glob_w
IDX_CONST const
SCALE_2
ADD_BASE
XCHG_SP_HL          ; HL = value, stack top = address
POP_DE              ; DE = address
XCHG_DE_HL          ; HL = address, DE = value
STORE_WORD_FROM_DE
XCHG_DE_HL          ; HL = value, DE = address+1
RESTORE_DE
```

ASM
```asm
push de
push hl
ld de,glob_w
ld hl,const
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

#### B5 store byte: local[const]

ZAX
```zax
ld loc_b[const], a
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
ld loc_w[const], hl
```

Steps
```
FRAME_WORD_STORE dispL+const*2
```

ASM
```asm
push de
ex de,hl
ld (ix+dispL+const*2),e
ld (ix+dispL+const*2+1),d
ex de,hl
pop de
```

#### B6 store byte: arg[const]

ZAX
```zax
ld arg_b[const], a
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
ld arg_w[const], hl
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

### C. Indexed by register (8-bit index in `r8`)

#### C1 load byte: global[r]

ZAX
```zax
ld a, glob_b[r]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_REG8 r
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld h,0
ld l,r
add hl,de
ld a,(hl)
pop de
pop hl
```

#### C1w load word: global[r]

ZAX
```zax
ld hl, glob_w[r]
```

Steps
```
SAVE_DE
BASE_GLOBAL glob_w
IDX_REG8 r
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
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
ld a, loc_b[r]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispL
IDX_REG8 r
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld h,0
ld l,r
add hl,de
ld a,(hl)
pop de
pop hl
```

#### C2w load word: local[r]

ZAX
```zax
ld hl, loc_w[r]
```

Steps
```
SAVE_DE
BASE_FRAME dispL
IDX_REG8 r
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
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
ld a, arg_b[r]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispA
IDX_REG8 r
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld h,0
ld l,r
add hl,de
ld a,(hl)
pop de
pop hl
```

#### C3w load word: arg[r]

ZAX
```zax
ld hl, arg_w[r]
```

Steps
```
SAVE_DE
BASE_FRAME dispA
IDX_REG8 r
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
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
ld glob_b[r], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_REG8 r
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld h,0
ld l,r
add hl,de
ld (hl),a
pop de
pop hl
```

#### C4w store word: global[r]

ZAX
```zax
ld glob_w[r], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_GLOBAL glob_w
IDX_REG8 r
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
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
ld loc_b[r], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispL
IDX_REG8 r
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld h,0
ld l,r
add hl,de
ld (hl),a
pop de
pop hl
```

#### C5w store word: local[r]

ZAX
```zax
ld loc_w[r], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_FRAME dispL
IDX_REG8 r
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
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
ld arg_b[r], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispA
IDX_REG8 r
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld h,0
ld l,r
add hl,de
ld (hl),a
pop de
pop hl
```

#### C6w store word: arg[r]

ZAX
```zax
ld arg_w[r], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_FRAME dispA
IDX_REG8 r
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
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
ld a, glob_b[idxG]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_MEM_GLOBAL idxG
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld hl,(idxG)
add hl,de
ld a,(hl)
pop de
pop hl
```

#### D1w load word: global[idxG]

ZAX
```zax
ld hl, glob_w[idxG]
```

Steps
```
SAVE_DE
BASE_GLOBAL glob_w
IDX_MEM_GLOBAL idxG
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
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
ld a, glob_b[idxFrame]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_MEM_FRAME dispIdx
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
add hl,de
ld a,(hl)
pop de
pop hl
```

#### D2w load word: global[idxFrame]

ZAX
```zax
ld hl, glob_w[idxFrame]
```

Steps
```
SAVE_DE
BASE_GLOBAL glob_w
IDX_MEM_FRAME dispIdx
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
```

ASM
```asm
push de
ld de,glob_w
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
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
ld a, loc_b[idxG]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispL
IDX_MEM_GLOBAL idxG
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld hl,(idxG)
add hl,de
ld a,(hl)
pop de
pop hl
```

#### D3w load word: local[idxG]

ZAX
```zax
ld hl, loc_w[idxG]
```

Steps
```
SAVE_DE
BASE_FRAME dispL
IDX_MEM_GLOBAL idxG
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
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
ld a, loc_b[idxFrame]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispL
IDX_MEM_FRAME dispIdx
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
add hl,de
ld a,(hl)
pop de
pop hl
```

#### D4w load word: local[idxFrame]

ZAX
```zax
ld hl, loc_w[idxFrame]
```

Steps
```
SAVE_DE
BASE_FRAME dispL
IDX_MEM_FRAME dispIdx
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
```

ASM
```asm
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
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
ld a, arg_b[idxG]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispA
IDX_MEM_GLOBAL idxG
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld hl,(idxG)
add hl,de
ld a,(hl)
pop de
pop hl
```

#### D5w load word: arg[idxG]

ZAX
```zax
ld hl, arg_w[idxG]
```

Steps
```
SAVE_DE
BASE_FRAME dispA
IDX_MEM_GLOBAL idxG
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
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
ld a, arg_b[idxFrame]
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispA
IDX_MEM_FRAME dispIdx
SCALE_1
ADD_BASE
LOAD_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
add hl,de
ld a,(hl)
pop de
pop hl
```

#### D6w load word: arg[idxFrame]

ZAX
```zax
ld hl, arg_w[idxFrame]
```

Steps
```
SAVE_DE
BASE_FRAME dispA
IDX_MEM_FRAME dispIdx
SCALE_2
ADD_BASE
LOAD_WORD
RESTORE_DE
```

ASM
```asm
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
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
ld glob_b[idxG], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_MEM_GLOBAL idxG
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld hl,(idxG)
add hl,de
ld (hl),a
pop de
pop hl
```

#### D7w store word: global[idxG]

ZAX
```zax
ld glob_w[idxG], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_GLOBAL glob_w
IDX_MEM_GLOBAL idxG
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
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
ld glob_b[idxFrame], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_GLOBAL glob_b
IDX_MEM_FRAME dispIdx
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld de,glob_b
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
add hl,de
ld (hl),a
pop de
pop hl
```

#### D8w store word: global[idxFrame]

ZAX
```zax
ld glob_w[idxFrame], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_GLOBAL glob_w
IDX_MEM_FRAME dispIdx
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
```

ASM
```asm
push de
push hl
ld de,glob_w
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
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
ld loc_b[idxG], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispL
IDX_MEM_GLOBAL idxG
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld hl,(idxG)
add hl,de
ld (hl),a
pop de
pop hl
```

#### D9w store word: local[idxG]

ZAX
```zax
ld loc_w[idxG], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_FRAME dispL
IDX_MEM_GLOBAL idxG
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
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
ld loc_b[idxFrame], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispL
IDX_MEM_FRAME dispIdx
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
add hl,de
ld (hl),a
pop de
pop hl
```

#### D10w store word: local[idxFrame]

ZAX
```zax
ld loc_w[idxFrame], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_FRAME dispL
IDX_MEM_FRAME dispIdx
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
```

ASM
```asm
push de
push hl
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
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
ld arg_b[idxG], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispA
IDX_MEM_GLOBAL idxG
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld hl,(idxG)
add hl,de
ld (hl),a
pop de
pop hl
```

#### D11w store word: arg[idxG]

ZAX
```zax
ld arg_w[idxG], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_FRAME dispA
IDX_MEM_GLOBAL idxG
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
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
ld arg_b[idxFrame], a
```

Steps
```
SAVE_HL
SAVE_DE
BASE_FRAME dispA
IDX_MEM_FRAME dispIdx
SCALE_1
ADD_BASE
STORE_BYTE
RESTORE_DE
RESTORE_HL
```

ASM
```asm
push hl
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
add hl,de
ld (hl),a
pop de
pop hl
```

#### D12w store word: arg[idxFrame]

ZAX
```zax
ld arg_w[idxFrame], hl
```

Steps
```
SAVE_DE
SAVE_HL
BASE_FRAME dispA
IDX_MEM_FRAME dispIdx
SCALE_2
ADD_BASE
XCHG_SP_HL
POP_DE
XCHG_DE_HL
STORE_WORD_FROM_DE
XCHG_DE_HL
RESTORE_DE
```

ASM
```asm
push de
push hl
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld l,(ix+dispIdx)
ld h,(ix+dispIdx+1)
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
ld hl, rec.field
```

Steps
```
FRAME_WORD_LOAD dispRec+field_offset
```

ASM
```asm
ld l,(ix+dispRec+field_offset)
ld h,(ix+dispRec+field_offset+1)
```

Example store byte field into an arg record:

ZAX
```zax
ld rec.field, a
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

- Scaling is power-of-two only; larger sizes repeat `SCALE_2`.
- Per-instruction preservation: only the destination register (loads) or value register (`A`/`HL` for stores) may change; all scratch registers are saved/restored in the pipelines above.
- IX is never scratch; frame accesses use explicit displacements.
- Pipelines above cover the full matrix of base (global/local/arg), index source (const, reg8, memory global/frame), width (byte/word), and operation (load/store). Additional register-pair shuffles can be composed from the same steps if a lowering conflict arises.
