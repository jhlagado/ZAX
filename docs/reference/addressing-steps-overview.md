# Addressing step library (`src/addressing/steps.ts`)

Status: non-normative map of the step-pipeline DSL. The source of truth is the TypeScript module;
this page helps you jump to the right **family** without reading the file top-to-bottom.

**Register roles (typical):** `DE` holds a base address, `HL` holds an index or computed EA after
`CALC_EA` / `CALC_EA_WIDE`. Templates save/restore registers around nested EA work.

---

## 1. Types and rendering

- **`StepInstr`**, **`StepPipeline`** — serializable micro-ops (`push`/`pop`, `ld`, IX+disp, …).
- **`renderStepInstr`**, **`renderStepPipeline`** — pseudo-assembly strings for tests and debugging.

---

## 2. Save / restore and exchange

- **`SAVE_HL`**, **`SAVE_DE`**, **`RESTORE_HL`**, **`RESTORE_DE`**, **`SWAP_HL_DE`** — stack/exchange
  glue used by templates.

---

## 3. Base and index loaders

- **Base (into DE):** `LOAD_BASE_GLOB`, `LOAD_BASE_FVAR`
- **Index (into HL):** `LOAD_IDX_CONST`, `LOAD_IDX_REG`, `LOAD_IDX_RP`, `LOAD_IDX_GLOB`, `LOAD_IDX_FVAR`

---

## 4. EA combination

- **`CALC_EA`** — `HL ← HL + DE` (byte stride).
- **`CALC_EA_2`**, **`CALC_EA_WIDE`** — wider or scaled indexing (e.g. word-sized elements).

---

## 5. Direct accessors (byte and word)

- **Byte at EA in HL:** `LOAD_REG_EA`, `STORE_REG_EA`; reg↔glob: `LOAD_REG_GLOB`, `STORE_REG_GLOB`,
  `LOAD_REG_REG`.
- **Word at EA:** `LOAD_RP_EA`, `STORE_RP_EA`, `STORE_RP_EA_FROM_STACK`; glob/fvar:
  `LOAD_RP_GLOB`, `STORE_RP_GLOB`, `LOAD_RP_FVAR`, `STORE_RP_FVAR`.

---

## 6. EA builder families (`EA_*` / `EAW_*`)

Named for **base × index** shape: glob vs frame-var (`FVAR`), const vs reg vs RP vs nested glob.

- **Byte (`EA_*`):** e.g. `EA_GLOB_CONST`, `EA_FVAR_REG`, `EA_GLOB_GLOB`, … — finish with `CALC_EA`.
- **Word (`EAW_*`):** same naming pattern — use `CALC_EA_WIDE` with default `elemSize` (typically 2).

---

## 7. Templates (compose builders + accessors)

High-level patterns that wrap an inner `ea: StepPipeline` with saves/restores and the right load/store:

- **Byte load:** `TEMPLATE_L_ABC`, `TEMPLATE_L_HL`, `TEMPLATE_L_DE`
- **Byte store:** `TEMPLATE_S_ANY`, `TEMPLATE_S_HL`
- **Word load:** `TEMPLATE_LW_HL`, `TEMPLATE_LW_DE`, `TEMPLATE_LW_BC`
- **Word store:** `TEMPLATE_SW_DEBC`, `TEMPLATE_SW_HL`

---

## 8. In-file section markers

`steps.ts` uses `// --- Section: … ---` comments aligned with the groups above. For the exact export
list, search by prefix (`EA_`, `TEMPLATE_`, …) or follow those section headers.
