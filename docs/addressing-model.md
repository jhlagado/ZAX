# ZAX Addressing Model (v0.2)

Status: design/spec alignment for effective-address lowering. Audience: compiler implementers and advanced users.

## 1. Core idea

- **Typed bases, untyped registers.** Only variables (globals, args, locals, record fields, typed pointers) carry element size. Registers do not. Therefore indexing must be anchored on a typed lvalue; registers alone cannot express typed indexing.
- **Unsigned indexing.** Index operands are interpreted as unsigned; scaling uses the element width (1 for byte, 2 for word, field offsets as constants).
- **Minimal legal shapes.** Keep the set of address forms small, reject the rest with clear diagnostics.
- **Per-instruction non-destruction.** For each lowered ZAX instruction, only the destination register(s) may change. Any scratch reg used to synthesize the addressing (e.g., DE shuttle when the destination is not DE) must be saved/restored so all non-destination regs are unchanged at the end of the instruction. IX is the frame anchor and never scratch.

## 2. Grammar (production rules)

```
imm8, imm16        ::= numeric literal
imm                ::= imm8 | imm16
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

idx                ::= imm8 | imm16 | reg8 | reg16   ; zero-extend reg8
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

Disallowed (emit diagnostic):

- `ld reg, var[var]` and `ld var[var], reg` — the inner `var` yields a typed address, but once loaded into a register the type/element size is lost, so the outer index has no scale information.
- Any `(IX+d)` using H/L lanes; must shuttle through DE for word moves involving HL.

## 3. Lowering rules (summary)

- **Base must be typed.** Indexing is only permitted when the base is a typed lvalue (`var`/`addr`). If the index resides in memory, load it to a register first.
- **Scaling (power-of-two only).** Offset = idx \* element_size (unsigned). Allowed element sizes are 1 (no scale) and powers of two. For size 2 use `add hl,hl`; for larger powers of two, repeat shifts/adds. Non-power-of-two element sizes are rejected.
- **Base placement.** Prefer base in DE, offset/scale in HL, then `add hl,de`; keeps HL free to become the final address.
- **Frame accesses.** Locals/args load via `(IX+d)`; word moves involving HL must use the DE shuttle pattern:
  - Load slot → HL: `ex de,hl; ld e,(ix+d0); ld d,(ix+d1); ex de,hl`.
  - Store HL → slot: `ex de,hl; ld (ix+d0),e; ld (ix+d1),d; ex de,hl`.
- **Per-instruction scratch policy.** During lowering of a single ZAX instruction, all registers except the destination must emerge unchanged. If a scratch register (e.g., DE as shuttle) is needed and is not the destination, save/restore it inside the lowered sequence. This is distinct from the function-level preserve set used at call boundaries.

## 4. Example patterns (representative)

Each pattern shows the source ZAX instruction first, then one possible lowered sequence. The lowered sequences here are illustrative; a real lowering must also honor the per-instruction scratch rule (only the destination may change) by saving/restoring any extra registers it clobbers.

## 4. Exhaustive pattern list (byte/word; unsigned index)

For each shape below, element size = 1 (byte) or 2/4… (power-of-two only). Record fields map to const offsets. Any idx in memory is first loaded to a register, then uses the register-index shape.

Legend: G = global, L = local, A = arg. idx = imm | reg (unsigned).

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

B1 `ld a, global+imm`

```
ld a, (global+imm)
```

B1w `ld hl, global+imm`

```
ld hl, (global+imm)
```

B2 `ld a, local+imm`

```
ld a, (ix+dispL+imm)
```

B2w `ld hl, local+imm`

```
ex de, hl
ld e, (ix+dispL+imm)
ld d, (ix+dispL+imm+1)
ex de, hl
```

B3/B3w (args) — same as B2/B2w with arg displacement.

B4 `ld a, P[imm]`

```
push de
ld e, (P)
ld d, (P+1)
ex de, hl
ld bc, imm
add hl, bc
ld a, (hl)
pop de
```

B4w — same, then word load via DE shuttle.

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
ld h, 0
ld l, c
add hl, hl
ld de, global
add hl, de
ex de, hl
ld l, (hl)
inc hl
ld h, (hl)
ex de, hl
pop de
```

C2 `ld a, local[c]`

```
push de
ex de, hl
ld e, (ix+dispL)
ld d, (ix+dispL+1)    ; DE = base
ex de, hl             ; HL = base
ld d, 0
ld e, c               ; idx
add hl, de
ld a, (hl)
pop de
```

C2w `ld hl, local[c]` — add `add hl,hl` after `ld de,c` zero-extend; word load via DE shuttle; save/restore DE.

C3/C3w (args) — same as C2/C2w with arg displacement.

C4 `ld a, P[c]`

```
push de
ld e, (P)
ld d, (P+1)           ; DE = base
ex de, hl             ; HL = base
ld d, 0
ld e, c               ; idx
add hl, de
ld a, (hl)
pop de
```

C4w — add scaling, then DE shuttle for word load.

Stores C5–C8 mirror loads, using DE shuttle for word stores, saving/restoring DE when not the destination.

### D. Indexed by variable (idx in memory)

Lower idx to a register, then reuse the matching C pattern.

D1 `ld a, global[idxVar]`

```
ld c, (idxVar)        ; or ld c,(ix+dispIdx) for frame idx
; then C1 skeleton
push de
ld de, global
ld h, 0
ld l, c
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
