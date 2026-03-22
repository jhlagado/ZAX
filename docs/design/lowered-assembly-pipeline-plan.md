# Lowered-Assembly Pipeline Plan (ASM80 Valid)

## Scope and fixed decisions

This note plans the implementation of a new assembler-valid backend product based on the agreed decisions:

- Introduce a new lowered-assembly product as the primary internal backend product.
- Keep the current trace `.asm` output as-is (separate, not assembler-valid).
- First real assembler backend target: ASM80.
- First ASM80-valid slice supports only:
  - labels
  - constants
  - `ORG`
  - `DB` / `DW` / `DS`
  - lowered instructions
- Preserved user comments are deferred.
- New assembler-valid output gets a distinct temporary artifact name initially.
- First implementation includes ASM80-based validation in tests/harnesses, not CLI invocation.
- First emitter may flatten to ordered `ORG`-anchored blocks.
- Synthetic names should be deterministic, readable, clearly ZAX-generated.
- First implementation uses a concrete ASM80 emitter with a clean seam (no generalized dialect framework).

## Current pipeline (where bytes and trace are formed)

### Pipeline entry

- `compile(...)` in `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/compile.ts` drives the pipeline.
- After parsing and env validation, it calls:
  - `emitProgram(...)` in `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/emit.ts`.
- `compile(...)` then passes the resulting `EmittedByteMap` + symbols to format writers:
  - `writeBin`, `writeHex`, `writeD8m`, `writeListing`, `writeAsm` in `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/formats/types.ts`.

### Byte map formation

- `emitProgram(...)` in `emit.ts` creates the primary byte maps:
  - `codeBytes`, `dataBytes`, `bytes` maps.
- It emits machine code directly during lowering via `encodeInstruction(...)` (see `emitInstr(...)` around `traceInstruction`).
- It accumulates fixups and per-section contribution buffers.
- Final merging happens in `finalizeEmitProgram(...)` in `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/emitFinalization.ts`, which calls:
  - `finalizeProgramEmission(...)` in `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/programLoweringFinalize.ts`.
- Base addresses, fixups, and `writeSection(...)` in `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/sectionLayout.ts` produce the final `EmittedByteMap.bytes`.

### Trace accumulation

- Trace is accumulated in `emit.ts`:
  - `traceInstruction(...)`, `traceLabel(...)`, `traceComment(...)` build `codeAsmTrace`.
- This `asmTrace` is a lowering trace only, not valid assembly.
- `writeAsm(...)` in `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/formats/writeAsm.ts` formats `asmTrace` into the current `.asm` artifact.

### Why current writer inputs are too lossy

- `EmittedByteMap` is a byte-address map with optional `asmTrace` text; it has no preserved directive ordering.
- `asmTrace` entries store only text, no original directive structure or re-emittable AST.
- `writeAsm(...)` emits a human-readable trace, not an assembler-valid stream (no `ORG`, `DB`, `DW`, `DS`, or constant declarations in the proper order).
- Fixups and symbol intent are resolved before formatting, so an assembler-valid output cannot be reconstructed from `EmittedByteMap` alone.

## New lowered-assembly product

### Proposed insertion point

Create the lowered-assembly product **inside `emitProgram(...)`**, after lowering decisions are made but **before** encoding bytes into `codeBytes`/`dataBytes`.

Suggested flow:

1. Lowering constructs a new `LoweredAsmProgram` (new structure).
2. A **byte-emission consumer** walks the `LoweredAsmProgram` to produce `EmittedByteMap` (same outputs as today).
3. A new **ASM80 emitter** walks the same `LoweredAsmProgram` to produce assembler-valid output.

This keeps the current binary/hex/d8m path stable while introducing the assembler-valid product as the primary internal artifact.

### Minimum data shape (v1)

Proposed minimal structure:

```
LoweredAsmProgram {
  blocks: LoweredAsmBlock[]
  symbols: LoweredAsmSymbol[]   // optional for convenience in ASM80 emitter
}

LoweredAsmBlock {
  origin: number               // ORG address
  items: LoweredAsmItem[]
}

LoweredAsmItem =
  | { kind: 'label', name: string }
  | { kind: 'const', name: string, value: ImmExpr }
  | { kind: 'org', value: number }            // optional if origin is per-block
  | { kind: 'db', values: ImmExpr[] }
  | { kind: 'dw', values: ImmExpr[] }
  | { kind: 'ds', size: ImmExpr, fill?: ImmExpr }
  | { kind: 'instr', head: string, operands: AsmOperandNode }
```

Notes:
- In v1, `org` can be implicit via `LoweredAsmBlock.origin` and omitted in item stream.
- `ImmExpr` can be reused from the existing AST (`ImmExprNode`) to avoid a new expression layer.
- `AsmOperandNode` can be reused as-is for lowered instructions (already compatible with `encodeInstruction`).
- Deterministic synthetic labels should be generated in `emit.ts` where `traceLabel(...)` and `generatedLabelCounter` are already managed.

### Reuse candidates

- Expression nodes from `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/frontend/ast.ts` for constants and DB/DW/DS.
- Operand nodes for lowered instructions from `AsmInstructionNode` in `emit.ts`.
- Existing section placement/layout logic (`sectionLayout.ts`, `sectionContributions.ts`) can still drive the final ORG ordering used to form blocks.

## Consumer arrangement

### Direct object emission (existing path)

- Add a `loweredAsmToByteMap(...)` step (or equivalent) that walks `LoweredAsmProgram` and:
  - produces `codeBytes`, `dataBytes`, fixups, rel8 fixups
  - fills `EmittedByteMap` the same way `emitProgram(...)` currently does
- This becomes the new primary path for `writeBin`, `writeHex`, `writeD8m`, `writeListing`.

### Existing trace path

- Keep `asmTrace` as a side-channel for now.
- The current `.asm` trace writer in `writeAsm.ts` remains unchanged and separate.
- Trace stays intentionally non-assembler-valid.

### ASM80 emitter path (new)

- Add `writeAsm80(...)` (new writer, or new path inside `formats/`) that consumes `LoweredAsmProgram`.
- The output artifact should use a temporary distinct name (e.g., `.lasm` or `.asm80`) until the trace `.asm` can be retired.
- Tests/harnesses should run ASM80 parsing/validation on this artifact only (no CLI invocation in v1).

## Migration sequence (smallest safe first patch)

### Phase 0: Planning + data model

- Add new types in a minimal location (likely `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/formats/types.ts` or a new `loweredAsmTypes.ts`).
- No behavior changes yet.

### Phase 1: Produce lowered-assembly in `emitProgram(...)`

- Construct `LoweredAsmProgram` alongside existing byte emission.
- Still emit bytes directly (no consumer yet).
- Keep byte map and trace intact.

### Phase 2: Byte-map consumer

- Introduce a consumer that converts `LoweredAsmProgram` -> `EmittedByteMap`.
- Switch `emitProgram(...)` to use the consumer for byte emission.
- Keep output artifacts unchanged.

### Phase 3: ASM80 emitter + tests

- Add an ASM80 emitter that consumes the lowered assembly product.
- Add ASM80 validation in tests/harnesses (no CLI invocation).
- Keep trace `.asm` unchanged and separate.

### Phase 4: Optional cleanup

- Once ASM80 is stable, decide on the permanent artifact name.
- Only then consider changes to trace `.asm` or CLI options.

## Deferred items

- Preserved user comments in lowered-assembly output.
- Generalized dialect abstraction across assemblers.
- CLI assembler invocation or toolchain integration.
- Richer section modeling beyond ordered ORG blocks.

## Specific file/function touchpoints (for later implementation)

- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/compile.ts`
  - `emitProgram(...)` call site and artifact wiring.
- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/emit.ts`
  - `emitProgram(...)` and `traceInstruction(...)` / `traceLabel(...)` / `traceComment(...)`.
- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/emitFinalization.ts`
  - `finalizeEmitProgram(...)` where fixups and placement are resolved.
- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/programLoweringFinalize.ts`
  - `finalizeProgramEmission(...)` where base addresses and fixups are applied.
- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/sectionLayout.ts`
  - `writeSection(...)` and `computeWrittenRange(...)`.
- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/lowering/sectionContributions.ts`
  - named section contribution sinks.
- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/formats/writeAsm.ts`
  - trace `.asm` generation remains separate.
- `/Users/johnhardy/.codex/worktrees/7e4e/ZAX/src/formats/types.ts`
  - `EmittedByteMap` and format writer interfaces.

## Proposed insertion point (summary)

- Primary: inside `emitProgram(...)` in `emit.ts`, directly after lowering decisions are made and before encoding bytes.
- Consumers: one for byte emission (existing behavior), one for ASM80 output (new).

## Minimal data model (summary)

- `LoweredAsmProgram` consisting of ordered ORG blocks with:
  - labels, constants, `DB`/`DW`/`DS`, and lowered instructions.
- Reuse `ImmExprNode` and `AsmOperandNode` to avoid new expression layers.

## Migration sequence (summary)

1. Add data model types.
2. Emit lowered-assembly alongside current byte emission.
3. Switch byte emission to consume lowered-assembly.
4. Add ASM80 emitter + validation in tests.
5. Defer trace `.asm` changes and CLI until later.
