# ZAX Addressing Model (v0.2) — Step Pipelines

Goal: express every allowed load/store addressing shape as a short pipeline of reusable **steps** (concatenative style). Each pipeline begins and ends with all registers restored except the destination. IX is never scratch.

## 1. Steps (reusable words)

Primitive saves/drops (use only when needed):

- `SAVE_HL` → `push hl`
- `SAVE_DE` → `push de`
- `RESTORE_HL` → `pop hl`
- `RESTORE_DE` → `pop de`
- `DROP_SAVED_HL` → `pop de` ; discard saved HL when dest=HL
- `DROP_SAVED_DE` → `inc sp` `inc sp` ; discard saved DE when dest=DE
- `XCHG_DE_HL` → `ex de, hl`
- `XCHG_SP_HL` → `ex (sp), hl`

Base (choose the form for the source):

- `BASE_GLOBAL sym → DE` : `ld de, sym`
- `BASE_LOCAL disp → DE` : `ld e,(ix+disp)` / `ld d,(ix+disp+1)`
- `BASE_ARG disp → DE` : same as local with arg disp

Index:

- `IDX_CONST const → HL` : `ld hl,const`
- `IDX_REG8 r → HL` : `ld h,0` / `ld l,r`
- `IDX_REG16 rp → HL` : `ld hl,rp` (or `ex de,hl` if rp=de and you need DE free)
- `IDX_MEM_GLOBAL sym → HL` : `ld hl,(sym)`
- `IDX_MEM_FRAME disp → HL` : `ld l,(ix+disp)` / `ld h,(ix+disp+1)`

Scaling (power-of-two only):

- `SCALE_1` (no-op)
- `SCALE_2` : `add hl, hl`
- `SCALE_4` : `add hl, hl` twice (repeat as needed for higher powers)

Combine:

- `ADD_BASE` : `add hl, de` ; assumes base in DE, offset in HL, result in HL

Access (destinations: byte→A, word→HL; stores source is A or HL):

- `LOAD_BYTE` : `ld a,(hl)`
- `LOAD_WORD` : `ld e,(hl)` / `inc hl` / `ld d,(hl)` / `ex de,hl`
- `STORE_BYTE` : `ld (hl),a`
- `STORE_WORD` : `ex de,hl` / `ld (hl),e` / `inc hl` / `ld (hl),d` / `ex de,hl`

Save/restore policy per destination:

- Dest = A : save/restore HL and DE if used as scratch.
- Dest = HL : save DE only; if HL was saved for scratch elsewhere, drop saved HL (`DROP_SAVED_HL`).
- Dest = DE : save HL; drop saved DE at end (`DROP_SAVED_DE`).

## 2. Pipelines (exhaustive load/store shapes)

Notation: pipelines are sequences of steps. Element size = 1 (byte) or 2 (word). For word, use `SCALE_2`; higher powers repeat `SCALE_2`.

For each shape below:

- ZAX: source line
- Steps: sequence with parameters
- ASM: emitted instructions (single-instruction lines); `dispL/dispA` are frame displacements; `const` is unsigned.

### A. Scalars (no index)

**A1 load byte from global**

- ZAX: `ld a, glob_b`
- Steps: `LOAD_BYTE` with implicit absolute; no scratch
- ASM:

```
ld a,(glob_b)
```

**A1w load word from global**

- ZAX: `ld hl, glob_w`
- Steps: `SAVE_DE BASE_GLOBAL glob_w → DE LOAD_WORD RESTORE_DE`
- ASM:

```
push de
ld de,glob_w
ld e,(de)
inc de
ld d,(de)
ex de,hl
pop de
```

**A2 load byte from local**

- ZAX: `ld a, loc_b`
- Steps: `LOAD_BYTE` via IX
- ASM:

```
ld a,(ix+dispL)
```

**A2w load word from local**

- ZAX: `ld hl, loc_w`
- Steps: `SAVE_DE BASE_LOCAL dispL → DE LOAD_WORD RESTORE_DE`
- ASM:

```
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld e,(de)
inc de
ld d,(de)
ex de,hl
pop de
```

**A3 load byte from arg**

- ZAX: `ld a, arg_b`
- Steps: `LOAD_BYTE` via IX arg disp
- ASM:

```
ld a,(ix+dispA)
```

**A3w load word from arg**

- ZAX: `ld hl, arg_w`
- Steps: `SAVE_DE BASE_ARG dispA → DE LOAD_WORD RESTORE_DE`
- ASM:

```
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ld e,(de)
inc de
ld d,(de)
ex de,hl
pop de
```

**A4 store byte to global**

- ZAX: `ld glob_b, a`
- Steps: `BASE_GLOBAL glob_b → HL STORE_BYTE`
- ASM:

```
ld hl,glob_b
ld (hl),a
```

**A4w store word to global**

- ZAX: `ld glob_w, hl`
- Steps: `SAVE_DE BASE_GLOBAL glob_w → DE STORE_WORD RESTORE_DE`
- ASM:

```
push de
ld de,glob_w
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

**A5 store byte to local**

- ZAX: `ld loc_b, a`
- Steps: `STORE_BYTE` via IX
- ASM:

```
ld (ix+dispL),a
```

**A5w store word to local**

- ZAX: `ld loc_w, hl`
- Steps: `SAVE_DE BASE_LOCAL dispL → DE STORE_WORD RESTORE_DE`
- ASM:

```
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

**A6 store byte to arg**

- ZAX: `ld arg_b, a`
- Steps: `STORE_BYTE` via IX arg disp
- ASM:

```
ld (ix+dispA),a
```

**A6w store word to arg**

- ZAX: `ld arg_w, hl`
- Steps: `SAVE_DE BASE_ARG dispA → DE STORE_WORD RESTORE_DE`
- ASM:

```
push de
ld e,(ix+dispA)
ld d,(ix+dispA+1)
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

### B. Indexed by const

**B1 load byte: global[const]**

- ZAX: `ld a, glob_b[const]`
- Steps: `BASE_GLOBAL glob_b → DE IDX_CONST const → HL SCALE_1 ADD_BASE LOAD_BYTE`
- ASM:

```
ld de,glob_b
ld hl,const
add hl,de
ld a,(hl)
```

**B1w load word: global[const]**

- ZAX: `ld hl, glob_w[const]`
- Steps: `SAVE_DE BASE_GLOBAL glob_w → DE IDX_CONST const → HL SCALE_2 ADD_BASE LOAD_WORD RESTORE_DE`
- ASM:

```
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

**B2 load byte: local[const]**

- ZAX: `ld a, loc_b[const]`
- Steps: `LOAD_BYTE` with folded disp: `(ix+dispL+const)`
- ASM:

```
ld a,(ix+dispL+const)
```

**B2w load word: local[const]**

- ZAX: `ld hl, loc_w[const]`
- Steps: `SAVE_DE BASE_LOCAL dispL+const*2 → DE LOAD_WORD RESTORE_DE`
- ASM:

```
push de
ld e,(ix+dispL+const*2)
ld d,(ix+dispL+const*2+1)
ld e,(de)
inc de
ld d,(de)
ex de,hl
pop de
```

**B3 load byte: arg[const]**

- ZAX: `ld a, arg_b[const]`
- ASM:

```
ld a,(ix+dispA+const)
```

**B3w load word: arg[const]**

- ZAX: `ld hl, arg_w[const]`
- ASM:

```
push de
ld e,(ix+dispA+const*2)
ld d,(ix+dispA+const*2+1)
ld e,(de)
inc de
ld d,(de)
ex de,hl
pop de
```

**B4 store byte: global[const] = A**

- ZAX: `ld glob_b[const], a`
- Steps: `BASE_GLOBAL glob_b → DE IDX_CONST const → HL SCALE_1 ADD_BASE STORE_BYTE`
- ASM:

```
ld de,glob_b
ld hl,const
add hl,de
ld (hl),a
```

**B4w store word: global[const] = HL**

- Steps: `SAVE_DE BASE_GLOBAL → DE IDX_CONST const → HL SCALE_2 ADD_BASE STORE_WORD RESTORE_DE`
- ASM:

```
push de
ld de,glob_w
ld hl,const
add hl,hl
add hl,de
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

**B5 store byte: local[const]**

- ZAX: `ld loc_b[const], a`
- ASM:

```
ld (ix+dispL+const),a
```

**B5w store word: local[const]**

- ZAX: `ld loc_w[const], hl`
- ASM:

```
push de
ld e,(ix+dispL+const*2)
ld d,(ix+dispL+const*2+1)
ex de,hl
ld (hl),e
inc hl
ld (hl),d
ex de,hl
pop de
```

**B6 store byte/word: arg[const]** — same as local with `dispA`.

### C. Indexed by register

**C1 load byte: global[r]**

- ZAX: `ld a, glob_b[c]`
- Steps: `SAVE_HL SAVE_DE BASE_GLOBAL glob_b → DE IDX_REG8 c → HL SCALE_1 ADD_BASE LOAD_BYTE RESTORE_DE RESTORE_HL`
- ASM:

```
push hl
push de
ld de,glob_b
ld h,0
ld l,c
add hl,de
ld a,(hl)
pop de
pop hl
```

**C1w load word: global[r]**

- Similar, with `SCALE_2` and `LOAD_WORD`.

**C2 load byte: local[r]**

- ZAX: `ld a, loc_b[c]`
- Steps: `SAVE_HL SAVE_DE BASE_LOCAL dispL → DE IDX_REG8 c → HL SCALE_1 ADD_BASE LOAD_BYTE RESTORE_DE RESTORE_HL`
- ASM:

```
push hl
push de
ld e,(ix+dispL)
ld d,(ix+dispL+1)
ld h,0
ld l,c
add hl,de
ld a,(hl)
pop de
pop hl
```

**C2w load word: local[r]** — add `SCALE_2` and `LOAD_WORD`.

**C3/C3w arg[r]** — same as C2/C2w with `dispA`.

Stores C4–C6 mirror loads, ending with `STORE_BYTE`/`STORE_WORD` and the same save/restore envelope.

### D. Indexed by variable in memory

Example: global idx stored in memory, indexing a global byte array.

**D1 load byte: glob_b[idxGlob]**

- ZAX: `ld a, glob_b[idxGlob]`
- Steps: `SAVE_HL SAVE_DE BASE_GLOBAL glob_b → DE IDX_MEM_GLOBAL idxGlob → HL SCALE_1 ADD_BASE LOAD_BYTE RESTORE_DE RESTORE_HL`
- ASM:

```
push hl
push de
ld de,glob_b
ld hl,(idxGlob)
add hl,de
ld a,(hl)
pop de
pop hl
```

**D2 load word: glob_w[idxFrame]**

- ZAX: `ld hl, glob_w[idxFrame]`
- Steps: `SAVE_HL SAVE_DE BASE_GLOBAL glob_w → DE IDX_MEM_FRAME dispIdx → HL SCALE_2 ADD_BASE LOAD_WORD RESTORE_DE RESTORE_HL`

Stores D\* use the same pattern with `STORE_BYTE`/`STORE_WORD`.

### E. Record fields (const offsets)

Treat as const index with `const = field_off` on the base (global/local/arg).

Example load word field from local record:

- ZAX: `ld hl, rec.field`
- Steps: `SAVE_DE BASE_LOCAL dispRec+field_off → DE LOAD_WORD RESTORE_DE`

Example store byte field to arg record:

- ZAX: `ld rec.field, a`
- Steps: `BASE_ARG dispRec+field_off → HL STORE_BYTE`

## 3. Notes

- Power-of-two scaling only; reject other element sizes.
- Each step is side-effect bounded: only its documented scratch may change, and must be restored by the end of the instruction pipeline.
- Pipelines here are exhaustive over global/local/arg bases, byte/word widths, and const/reg/memory-held indices, for both loads and stores. Additional register-pair choices (e.g., base in HL instead of DE) can be derived if a lowering conflict demands it, by composing with the same primitives (`push/pop`, `ex de,hl`).
