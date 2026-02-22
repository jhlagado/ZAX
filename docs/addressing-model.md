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
reg8, reg16        ::= CPU registers (untyped)
reg                ::= reg8 | reg16

addr               ::= typed pointer variable (global/arg/local)
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

- `ld reg, var[var]` and `ld var[var], reg` (index from untyped addr loses element size).
- Any `(IX+d)` using H/L lanes; must shuttle through DE for word moves involving HL.

## 3. Lowering rules (summary)

- **Base must be typed.** Indexing is only permitted when the base is a typed lvalue (`var`/`addr`). If the index resides in memory, load it to a register first.
- **Scaling.** Offset = idx \* element_size (unsigned). For size 2 use `add hl,hl`; for size 1 no scale. Larger sizes: reject or emit a bounded multiply sequence (implementation-defined).
- **Base placement.** Prefer base in DE, offset/scale in HL, then `add hl,de`; keeps HL free to become the final address.
- **Frame accesses.** Locals/args load via `(IX+d)`; word moves involving HL must use the DE shuttle pattern:
  - Load slot → HL: `ex de,hl; ld e,(ix+d0); ld d,(ix+d1); ex de,hl`.
  - Store HL → slot: `ex de,hl; ld (ix+d0),e; ld (ix+d1),d; ex de,hl`.
- **Preservation.** Preserve set = {AF, BC, DE, HL} \ ReturnSet. If DE is in the preserve set, save/restore around its shuttle use.
- **Epilogue/prologue reminders.** Locals before preserves; if HL is preserved, use per-local swap init (`push hl; ld hl,imm; ex (sp),hl`). Epilogue: pop preserves reverse, `ld sp,ix`, `pop ix`, `ret`.

## 4. Example patterns (representative)

- Global byte load with register index (element size 1):
  ```
  ld de, global        ; base
  ld h, 0
  ld l, c              ; idx in C
  add hl, de
  ld a, (hl)
  ```
- Global word store with runtime index (element size 2):
  ```
  ld h, 0
  ld l, c
  add hl, hl           ; scale 2
  ld de, wordArr       ; base
  add hl, de
  ex de, hl            ; shuttle for word store
  ld (hl), e
  inc hl
  ld (hl), d
  ex de, hl
  ```
- Local pointer base + register index (byte):
  ```
  ex de, hl
  ld e, (ix+disp)      ; load base.ptr
  ld d, (ix+disp+1)
  ex de, hl
  ld h, 0
  ld l, c              ; idx
  add hl, de
  ld a, (hl)
  ```

## 5. Diagnostics guidance

- “Indexing requires a typed base; cannot index from register-held address.”
- “Legacy return keywords are invalid; declare registers explicitly.” (kept for consistency with return surface)
- “IX+H/L byte-lane access is not supported; use DE shuttle for word frame slots.”

## 6. Test/fixture expectations

- Addressing mini-suite (issue #374) should cover: globals/locals/args, byte vs word, const vs runtime index, record fields, HL-preserved vs volatile prologues, extern caller-preserve boundary, DE shuttle usage, and rejection of `var[var]`.
- Regression tests should assert absence of `IX+H/L` forms and presence of DE shuttle where required.

## 7. Future considerations (v0.3+)

- Optional typed casts on registers to re-enable reg-based indexing with explicit element size.
- Higher arity scaled addressing only if bounded by runtime-atom budget; otherwise reject.
