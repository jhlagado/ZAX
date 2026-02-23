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

Notation: pipelines are sequences of steps. Element size = 1 (byte) or 2 (word). For word, use the SCALE step appropriate to size (size=1 → `SCALE_1`, size=2 → `SCALE_2`; higher powers repeat `SCALE_2`).

### A. Scalars (no index)

Load byte from global/local/arg:

- `SAVE_HL SAVE_DE BASE_GLOBAL sym → DE ADD_BASE?` (not needed) `LOAD_BYTE RESTORE_DE RESTORE_HL`
  - Minimal form (no scratch beyond dest=A): `ld a,(sym)` (global), `ld a,(ix+disp)` (frame)

Load word from global/local/arg:

- `SAVE_DE BASE_* → DE`  
  For frame: `BASE_LOCAL/BASE_ARG`
- `LOAD_WORD RESTORE_DE`

Store byte to global/local/arg (src=A):

- `BASE_* → HL` (global: `ld hl,sym`; frame: `ld l,(ix+disp)` / `ld h,(ix+disp+1)` then `xchg_de_hl` as needed)
- `STORE_BYTE`

Store word to global/local/arg (src=HL):

- `SAVE_DE BASE_* → DE` / `XCHG_DE_HL` if needed
- `STORE_WORD RESTORE_DE`

### B. Indexed by const (global/local/arg)

Load byte:

- `SAVE_HL SAVE_DE BASE_* → DE`
- `IDX_CONST const → HL` (folded: HL = const)
- `SCALE_n` (according to element size)
- `ADD_BASE`
- `LOAD_BYTE`
- `RESTORE_DE RESTORE_HL`

Load word: same pipeline, end with `LOAD_WORD`.

Store byte/word: same pipeline, end with `STORE_BYTE` or `STORE_WORD`.

Const folding note: for globals, scale may be folded into the address; for IX-based locals/args, fold `const*size` into the displacements.

### C. Indexed by register (global/local/arg)

Load byte:

- `SAVE_HL SAVE_DE`
- `BASE_* → DE`
- `IDX_REG8 r → HL` (or `IDX_REG16`)
- `SCALE_n`
- `ADD_BASE`
- `LOAD_BYTE`
- `RESTORE_DE RESTORE_HL`

Load word: same but `LOAD_WORD`.

Store byte/word: same pipeline ending with `STORE_BYTE` / `STORE_WORD`.

### D. Indexed by variable in memory (global or frame idx)

Load idx to HL first, then reuse C:

- `SAVE_HL SAVE_DE`
- `BASE_* → DE`
- `IDX_MEM_GLOBAL sym → HL` **or** `IDX_MEM_FRAME disp → HL`
- `SCALE_n`
- `ADD_BASE`
- `LOAD_BYTE` / `LOAD_WORD`
- `RESTORE_DE RESTORE_HL`

Stores analogous.

### E. Record fields (const offsets)

Treat as B with `const = field_offset`:

- Load byte/word: pipeline B with folded const.
- Store byte/word: pipeline B with store op.

## 3. Notes

- Power-of-two scaling only; reject other element sizes.
- Each step is side-effect bounded: only its documented scratch may change, and must be restored by the end of the instruction pipeline.
- Pipelines here are exhaustive over global/local/arg bases, byte/word widths, and const/reg/memory-held indices, for both loads and stores. Additional register-pair choices (e.g., base in HL instead of DE) can be derived if a lowering conflict demands it, by composing with the same primitives (`push/pop`, `ex de,hl`).
