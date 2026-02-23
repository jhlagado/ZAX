# ZAX Addressing Model (v0.2)

Status: design/spec alignment for effective-address lowering. Audience: compiler implementers and advanced users.

## 1. Core idea

- **Typed bases, untyped registers.** Only variables (globals, args, locals, record fields, typed pointers) carry element size. Registers do not. Therefore indexing must be anchored on a typed lvalue; registers alone cannot express typed indexing.
- **Unsigned indexing.** Index operands are interpreted as unsigned; scaling uses the element width (1 for byte, 2 for word, field offsets as constants).
- **Minimal legal shapes.** Keep the set of address forms small, reject the rest with clear diagnostics.
- **Per-instruction non-destruction.** For each lowered ZAX instruction, only the destination register(s) may change. Any scratch reg used to synthesize the addressing (e.g., DE shuttle when the destination is not DE) must be saved/restored so all non-destination regs are unchanged at the end of the instruction. IX is the frame anchor and never scratch.

## 2. Grammar (production rules)

```
const8, const16   ::= numeric literal
const             ::= const8 | const16
reg8, reg16        ::= CPU registers (untyped)
reg                ::= reg8 | reg16

addr               ::= array or struct base (typed word lvalue)
arg8,  local8      ::= byte arg/local
arg16, local16     ::= word arg/local | addr
global8            ::= byte global
global16           ::= word global | addr

var8               ::= arg8 | local8 | global8
var16              ::= arg16 | local16 | global16
var                ::= var8 | var16

idx                ::= const8 | const16 | reg8 | reg16   ; zero-extend reg8
```

Allowed loads/stores (element size comes from `var`):

```
ld reg, imm
ld reg, reg
ld reg, var
ld reg, var[idx]

ld var, reg
ld var[idx], reg
```

Struct fields: `var.field` lowers as `var[const]` (const offset only).

## 3. Lowering rules (summary)

- **Base must be typed.** Indexing is only permitted when the base is a typed lvalue (`var`/`addr`). If the index resides in memory, load it to a register first.
- **Scaling (power-of-two only).** Offset = idx \* element_size (unsigned). Allowed element sizes are 1 (no scale) and powers of two. For size 2 use `add hl,hl`; for larger powers of two, repeat shifts/adds. Non-power-of-two element sizes are rejected.
- **Base placement.** Prefer base in DE, offset/scale in HL, then `add hl,de`; keeps HL free to become the final address.
- **Frame accesses.** Locals/args load via `(IX+d)`; word moves involving HL must use the DE shuttle pattern:
  - Load slot → HL: `ex de,hl; ld e,(ix+d0); ld d,(ix+d1); ex de,hl`.
  - Store HL → slot: `ex de,hl; ld (ix+d0),e; ld (ix+d1),d; ex de,hl`.
- **Per-instruction scratch policy.** During lowering of a single ZAX instruction, all registers except the destination must emerge unchanged. If a scratch register (e.g., DE as shuttle) is needed and is not the destination, save/restore it inside the lowered sequence. This is distinct from the function-level preserve set used at call boundaries.

## 4. Stack pipeline model (per instruction)

- Treat each ZAX statement as a short pipeline that begins and ends in the same register state except for the destination.
- Use `push de` / `push hl` to preserve scratch when needed; at the end, restore in reverse. If the destination is HL, discard the saved HL (e.g., `pop de` to drop old HL). If the destination is DE, discard the saved DE (e.g., `pop hl` + `inc sp` twice). Keep HL as the transient TOS during address synthesis to minimize stack traffic.
- Bricks to compose: load typed base → HL, load/zero-extend idx → HL/DE, scale (power-of-two), add base+idx (HL+DE), then load/store via HL (word stores/loads use DE shuttle). Each brick must save/restore any scratch it uses.

### 4.1 Brick library (per-instruction building blocks)

All bricks assume IX is frame-only, never scratch. “Save/restore scratch” means `push`/`pop` around the brick if the scratch reg is not the destination. Destinations: byte → A; word → HL.

**Base → HL (global)**

```
; clobbers HL only
ld hl, global
```

**Base → HL (local/arg word at IX+disp)**

```
; clobbers HL, uses DE shuttle; save/restore DE if needed
push de
ex de, hl
ld e, (ix+disp)
ld d, (ix+disp+1)
ex de, hl
pop de
```

**Idx → HL (reg8 unsigned)**

```
; zero-extend reg8 in C
ld h, 0
ld l, c
```

**Idx → HL (reg16)**

```
; HL already holds idx16 (ensure saved if dest != HL later)
```

**Scale idx (size=1)**

```
; no-op
```

**Scale idx (size=2)**

```
add hl, hl
```

**Add base+idx (base in DE, offset in HL)**

```
add hl, de          ; HL = base + offset
```

**Load byte via HL → A**

```
ld a, (hl)
```

**Load word via HL → HL (DE shuttle)**

```
push de
ld e, (hl)
inc hl
ld d, (hl)
ex de, hl
pop de
```

**Store byte A → (HL)**

```
ld (hl), a
```

**Store word HL → (addr in HL) using DE shuttle**

```
push de
ex de, hl           ; DE = value, HL = addr
ld (hl), e
inc hl
ld (hl), d
ex de, hl
pop de
```

**Save/restore patterns for destinations**

- Dest = A: save/restore both DE and HL if used as scratch.
- Dest = HL: save DE; save HL only if some brick needs HL scratch before final value; discard saved HL at end (`pop de` to drop old HL).
- Dest = DE: save HL and DE; at end restore HL; drop saved DE with `inc sp`/`inc sp`.

## 5. Exhaustive pattern list (byte/word; unsigned index)

For each shape below, element size = 1 (byte) or 2/4… (power-of-two only). Record fields map to const offsets. Any idx in memory is first loaded to a register, then uses the register-index shape.

Legend: G = global, L = local, A = arg. idx = const | reg (unsigned).

### A. Scalars (no index)

- A1 `ld reg, G`
- A2 `ld reg, L`
- A3 `ld reg, A`
- A4 `ld G, reg`
- A5 `ld L, reg`
- A6 `ld A, reg`

### B. Indexed by const

- B1 `ld reg, G[imm]`
- B2 `ld reg, L[imm]`
- B3 `ld reg, A[imm]`
- B4 `ld G[imm], reg`
- B5 `ld L[imm], reg`
- B6 `ld A[imm], reg`

### C. Indexed by register (idx unsigned)

- C1 `ld reg, G[idx]`
- C2 `ld reg, L[idx]`
- C3 `ld reg, A[idx]`
- C4 `ld G[idx], reg`
- C5 `ld L[idx], reg`
- C6 `ld A[idx], reg`

### D. Indexed by variable (load idx first, then C\*)

- D1 `ld reg, G[idxVar]`
- D2 `ld reg, L[idxVar]`
- D3 `ld reg, A[idxVar]`
- D4 `ld G[idxVar], reg`
- D5 `ld L[idxVar], reg`
- D6 `ld A[idxVar], reg`

### E. Record fields (const offsets)

- E1 `ld reg, rec.field` (rec in G/L/A) ⇒ B\* with const offset
- E2 `ld rec.field, reg`

## 5. Exhaustive lowering catalog

For every allowed shape in Section 4, this catalog shows a ZAX instruction and one legal lowering. Each sequence must preserve all non-destination registers (save/restore scratch). Element size is power-of-two; examples show size=1 (byte) and size=2 (word).

### A. Scalars (no index)

A1 `ld a, global`

```
ld a, (global)
```

A1w `ld hl, global`

```
ld hl, (global)
```

A2 `ld a, local`

```
ld a, (ix+dispL)
```

A2w `ld hl, local`

```
ex de, hl
ld e, (ix+dispL)
ld d, (ix+dispL+1)
ex de, hl
```

A3 `ld a, arg`

```
ld a, (ix+dispA)
```

A3w `ld hl, arg`

```
ex de, hl
ld e, (ix+dispA)
ld d, (ix+dispA+1)
ex de, hl
```

### B. Indexed by const

B1 `ld a, global[const]`

```
ld a, (global+imm)
```

B1w `ld hl, global[const]`

```
ld hl, (global + const*size)   ; if size=2, fold imm*2 into the address
```

B2 `ld a, local[const]`

```
ld a, (ix+dispL+imm)
```

B2w `ld hl, local[const]`

```
ex de, hl
ld e, (ix+dispL + const*size)      ; fold scaled offset into disp
ld d, (ix+dispL + const*size + 1)
ex de, hl
```

B3 `ld a, arg[const]`

```
ld a, (ix+dispA + imm)
```

B3w `ld hl, arg[const]`

```
ex de, hl
ld e, (ix+dispA + const*size)
ld d, (ix+dispA + const*size + 1)
ex de, hl
```

Stores B5–B8 mirror loads; for word stores use DE shuttle, saving/restoring scratch.

### C. Indexed by register (idx unsigned)

C1 `ld a, global[c]` (size=1)

```
push de
ld de, global
ld h, 0
ld l, c
add hl, de
ld a, (hl)
pop de
```

C1w `ld hl, global[c]` (size=2)

```
push de
ld de, global
ld h, 0
ld l, c
add hl, hl
add hl, de
ld e, (hl)
inc hl
ld d, (hl)
ex de, hl
pop de
```

C2 `ld a, local[c]`

```
push de
ld e, (ix+dispL)
ld d, (ix+dispL+1)    ; DE = base
ld h, 0
ld l, c               ; idx
add hl, de
ld a, (hl)
pop de
```

C2w `ld hl, local[c]` (size=2)

```
push de
ld e, (ix+dispL)
ld d, (ix+dispL+1)    ; DE = base
ld h, 0
ld l, c               ; idx
add hl, hl            ; scale 2
add hl, de            ; HL = base + offset
ld e, (hl)
inc hl
ld d, (hl)
ex de, hl
pop de
```

C3 `ld a, arg[c]`

```
push de
ld e, (ix+dispA)
ld d, (ix+dispA+1)    ; DE = base
ld h, 0
ld l, c               ; idx
add hl, de
ld a, (hl)
pop de
```

C3w `ld hl, arg[c]` (size=2)

```
push de
ld e, (ix+dispA)
ld d, (ix+dispA+1)    ; DE = base
ld h, 0
ld l, c               ; idx
add hl, hl           ; scale 2
add hl, de           ; base
ld e, (hl)
inc hl
ld d, (hl)
ex de, hl
pop de
```

### D. Indexed by variable (idx in memory)

Lower idx to a register, then reuse the matching C pattern.

D1 `ld a, global[idxVar]`

```
push de
ld de, global
ld h, 0
ld l, (idxVar)
add hl, de
ld a, (hl)
pop de
```

D2/D3/D4 loads: load idxVar to C (or HL for word index), then apply C2/C3/C4 skeletons respectively. Stores D5–D8 mirror loads.

### E. Record fields (const offsets)

E1 `ld a, rec.field` (rec in G/L/A)

```
; global form
ld a, (rec+FIELD_OFF)
; local/arg form uses IX+disp+FIELD_OFF, with DE shuttle for word field loads
```

E1w `ld hl, rec.field` (local/arg)

```
ex de, hl
ld e, (ix+dispR+FIELD_OFF)
ld d, (ix+dispR+FIELD_OFF+1)
ex de, hl
```

E2 stores mirror loads; word stores use DE shuttle.

## 6. Diagnostics guidance

- “Indexing requires a typed base; cannot index from register-held address.”
- “Legacy return keywords are invalid; declare registers explicitly.” (kept for consistency with return surface)
- “IX+H/L byte-lane access is not supported; use DE shuttle for word frame slots.”

## 6. Test/fixture expectations

- Addressing mini-suite (issue #374) should cover: globals/locals/args, byte vs word, const vs runtime index, record fields, HL-preserved vs volatile prologues, extern caller-preserve boundary, DE shuttle usage, and rejection of `var[var]`.
- Regression tests should assert absence of `IX+H/L` forms and presence of DE shuttle where required.

## 7. Future considerations (v0.3+)

- Optional typed casts on registers to re-enable reg-based indexing with explicit element size.
- Higher arity scaled addressing only if bounded by runtime-atom budget; otherwise reject.
