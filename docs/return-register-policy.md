# ZAX Return Register Policy (v0.2 Detailed Design)

Status: non-normative companion to `docs/zax-spec.md` §8.2. Intended for developers and reviewers implementing register-based returns and preservation.

## 1. Goals

- Make return channels explicit and user-controlled via declared registers.
- Derive preservation mechanically from the declared return set.
- Keep a single-pass-friendly model: no body analysis required to know volatility.
- Avoid accidental clobber during local initializers (the HL-save problem).

## 2. Surface Syntax (recap)

- Canonical: `func name(...): <register-list>` where each entry is one of `HL`, `DE`, `BC`, `AF`.
- Return lists publish the volatile registers. Preservation = {AF, BC, DE, HL} \ ReturnSet.
- No aliases/keywords: `void/byte/word/long/verylong/none/flags` are rejected.
- Omitting the colon means “no returns” (preserve all). `extern func` uses the same form; `op` has no return declaration.

## 3. Preservation Matrix (derived)

Preserve = {AF, BC, DE, HL} \ ReturnSet (IX always preserved).

| Declared returns | Preserved regs |
| ---------------- | -------------- |
| (no returns)     | AF, BC, DE, HL |
| HL               | AF, BC, DE     |
| HL,AF            | BC, DE         |
| HL,DE            | AF, BC         |
| HL,DE,AF         | BC             |
| HL,DE,BC         | AF             |
| HL,DE,BC,AF      | —              |

Extern typed calls: same return registers, but preservation is caller-responsible unless an explicit ABI is provided.

## 4. Prologue/Epilogue Strategies

Rule of thumb: decide based on whether **HL is preserved**.

- If HL is in the return set (volatile): use the simple strategy.
- If HL is preserved (not in the return set): use the swap strategy.

### 4.1 Non-void (HL volatile)

- Locals-before-preserves ordering is fine: use HL for initializers, then push preserves (AF/BC/DE as needed).
  Example (HL return):

```asm
; locals init
ld hl, imm16
push hl
; preserves
push af
push bc
push de
; epilogue
pop de
pop bc
pop af
ld sp, ix
pop ix
ret
```

### 4.2 No-return / HL-preserved cases (HL not in returns)

Problem: locals initialized via HL would clobber the incoming HL before it’s saved.

Solution (swap pattern):

Prologue:

```asm
push ix
ld ix,0
add ix,sp
push hl                 ; save incoming HL
; for each local init:
ld hl, <init>
ex (sp), hl             ; init on stack, saved HL restored
; preserves
push de
push bc
push af
```

Epilogue:

```asm
pop af
pop bc
pop de
pop hl                  ; discard saved-HL slot
ld sp, ix
pop ix
ret
```

- Only used when the declared return set does **not** include HL.

### 4.3 Non-HL return registers (e.g., `DE` while HL is preserved)

- Declaring `DE` alone (`func foo(): DE`) means HL is preserved. If locals are initialized via HL, use the void-pattern swap to avoid clobbering HL. DE is the return channel and must be left set on exit; preserves follow from the matrix.
- For `HL,DE` returns, both HL and DE are volatile return channels; no swap needed—locals may use HL freely.

### 4.4 Flags in return set

- Including `AF` in the return list drops AF from the preserve set. No extra prologue steps; just omit pushing AF.

### 4.5 Summary: when to use the HL swap pattern

- Use swap when HL is **preserved** (HL not in ReturnSet) and locals are initialized via HL at entry. Cases: `none` (or omitted), `DE`, `DE,AF`. Not needed when HL is in ReturnSet (`HL`, `HL,DE`, `HL,DE,BC`, with/without AF).

## 5. Lowering Rules for Address Materialization

- Prefer base in DE, offset/scale in HL; `add hl, de` for the final address.
- Use DE shuttle for IX+d lane transfers when semantic register is HL (per v0.2 byte-lane rule).
- Local+local base/index is high-cost; warn/reject under runtime-atom budget unless one side is hoisted to a register (per `docs/arrays.md`). If allowed, save/restore any scratch pair used.

## 6. Call-Site Semantics

- Internal typed calls: callee preserves per matrix; caller cleans args; HL volatility per declared returns.
- Extern typed calls: caller must preserve anything it cares about beyond the return set; declarations only publish the return registers.
- Raw `call` mnemonics: no contract.

## 7. Migration Notes

- Legacy aliases (`void/none/byte/word/long/verylong/flags`) are no longer accepted. Declare explicit registers instead:
  - No returns: `func f()` (omit the colon).
  - Single return: `func f(): HL`.
  - Wider returns: `func f(): HL,DE` or `func f(): HL,DE,BC`.
  - Flags: append `AF` to the list if the function intentionally publishes flags.

## 8. Tests to Add/Update

- Parser: accept register lists; aliases still parse.
- Preservation matrix: one test per return set (with/without AF) validating prologue/epilogue pushes/pops.
- Void prologue swap: assert HL is not clobbered by local initializers (see pattern above).
- Array/record lowering: ensure temp preserves and destination-only mutation with new preservation rules.

## 9. Notes

- `byte` alias will be removed; programmers choose registers explicitly for return width.
- Extern declarations use the same return-register notation to publish return channels. Preservation stays caller-responsible unless the extern ABI explicitly states otherwise.
