---
layout: default
title: "Chapter 10 — Lowering"
parent: "Part V — Lowering"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[← Semantics](../part4/09-semantics.md) | [Part V](index.md) | [Z80 Encoding →](../part6/11-z80-encoding.md)

# Chapter 10 — Lowering: From AST to Bytes

The lowering phase lives entirely in `src/lowering/`. It is by far the largest subsystem. `emitProgram()` in `emit.ts` is the entry point.

### 10.1 The Four Phases (`lowering/emit.ts` and `emitPipeline.ts`)

`emitPipeline.ts` documents and names the four phases. `emit.ts` runs them:

```typescript
// Phase 1: workspace wiring
const workspace = createEmitPhase1Workspace(program, env, options);
const phase1 = createEmitPhase1Helpers({ program, env, diagnostics, workspace, options });

// Phase 2: prescan
const prescan = runEmitPrescanPhase(phase1.programLoweringContext);

// Phase 3: lowering
const lowered = runEmitLoweringPhase(phase1.programLoweringContext, prescan);

// Phase 4: finalization
const finalized = runEmitPlacementAndArtifactPhase(
  mergeEmitFinalizationContext(lowered, buildEmitFinalizationPhaseEnv(...))
);
```

### 10.2 Phase 1 — Workspace Setup

`createEmitPhase1Workspace()` in `emitPhase1Workspace.ts` initialises the mutable data structures that will be written into during lowering. The workspace has five top-level sub-objects (instead of one flat bag):

- **`emission`:** merged and per-section byte maps, listing `codeSourceSegments`, and the lowered-asm stream buffers.
- **`symbols`:** symbol tables, `PendingSymbol` queues, `taken` names, and `fixups` / `rel8Fixups` pending relocation entries.
- **`callables`:** per-file and merged callable/op maps, declared `op`/`bin` name sets, and visibility resolver closures.
- **`config`:** `opStackPolicyMode`, `rawTypedCallWarningsEnabled`, `primaryFile`, and `includeDirs`.
- **`storage`:** `storageTypes`, alias maps, stack slot maps, `rawAddressSymbols`, and section `baseExprs`.

Phase 1 helpers still create per-phase offset refs (`codeOffsetRef`, and similar) inside `createEmitStateHelpers`; those live alongside the workspace, not inside it.

`createEmitPhase1Helpers()` in `emitPhase1Helpers.ts` then wires callbacks and utilities around the workspace to build the `ProgramLoweringContext` that phases 2–3 consume.

### 10.3 Phase 2 — Prescan

`preScanProgramDeclarations()` in `programLowering.ts` does a *first* pass over the program to collect metadata needed by the lowering pass:

- **Callables map:** for every `FuncDeclNode` and `ExternFuncNode`, records name, file, parameter types, and return registers into a `Map<string, Callable>`, keyed by canonical function name.
- **Ops map:** for every `OpDeclNode`, records the overloads under the op name.
- **Storage type map:** collects the type annotation of every `VarDecl` and `DataDecl`.
- **Module alias map:** collects `var x = other_var` alias declarations.
- **Raw-address symbols:** identifies `extern` declarations that have a fixed address.

Returns a `PrescanResult` that phase 3 unpacks.

### 10.4 Phase 3 — Lowering Declarations

`lowerProgramDeclarations()` in `programLowering.ts` is the main emission loop. It iterates through every `ModuleItemNode` across all files (in module-traversal order) and dispatches each to an appropriate handler in `programLoweringDeclarations.ts`:

- **`FuncDeclNode`** → `lowerFunction()` (the big one — see §10.5).
- **`DataBlockNode`** → `lowerDataBlock()` in `programLoweringData.ts` — serialises the typed initialiser into the data section byte map.
- **`VarBlockNode`** (module-scope globals) → reserves space in the var section and records symbols.
- **`BinDeclNode`** / **`HexDeclNode`** → reads the binary asset from disk and splices it into the appropriate section.
- **`AlignDirectiveNode`** → advances the active section offset to the next alignment boundary.
- **`ConstDeclNode`** / **`EnumDeclNode`** / **`TypeDeclNode`** → already processed by `buildEnv()`; no code is emitted.
- **`NamedSectionNode`** → recursively processes the section's items inside the context of the named section.

Returns a `LoweringResult` which is the fully populated byte maps plus all pending fixups and symbols.

### 10.5 Function Lowering in Detail

`lowerFunction()` in `functionLowering.ts` is responsible for turning a single `FuncDeclNode` into machine-code bytes. It creates several helper bundles:

**Frame setup** (`functionFrameSetup.ts`):
- Allocates a stack frame for local variables. Each `VarDecl` in the function's `var` block gets a slot in the frame, sized by its type.
- Records the negative IX displacements for each variable (Z80 convention: locals are at `(IX-n)`).
- Emits the function prologue: `push ix`, `ld ix, 0`, `add ix, sp`, `ld sp, (IX)`.

**Body setup** (`functionBodySetup.ts`):
- Parses the flat list of `AsmItemNode[]` to reconstruct the *nesting* of structured control-flow constructs.
- Builds a `FlowState` — a stack of open control frames for `if/while/select/…`.
- Generates fresh label names for control-flow branch targets (e.g. `__while_top_0`, `__if_else_1`).

**Instruction lowering** (delegated to `asmBodyOrchestration.ts`): see §10.6.

**ASM rewriting** (`functionAsmRewriting.ts`):
- Post-pass peephole rewrites applied after the main lowering.

**Call lowering** (`functionCallLowering.ts`):
- Emits `call` instructions for function invocations with proper argument marshalling.

### 10.6 Instruction Lowering

`asmInstructionLowering.ts` provides the instruction-level dispatch. For each `AsmInstructionNode` it inspects the `head` string and routes to the appropriate sub-handler:

| Head | Handler |
|------|---------|
| `:=` | `asmLoweringAssign.ts` |
| `ld` | `asmLoweringLd.ts` (then into the ld sub-pipeline) |
| `step` | `asmLoweringStep.ts` |
| Branch mnemonics (`jp`, `jr`, `call`, `ret`, `djnz`) | `asmLoweringBranchCall.ts` |
| Range/loop instructions | `asmRangeLowering.ts` |
| Op invocations | `opExpansionOrchestration.ts` |
| Everything else | `z80/encode.ts` directly |

Structured control-flow tokens (`If`, `While`, `Repeat`, etc.) are handled in `asmBodyOrchestration.ts` by emitting the appropriate jump and label pairs. For example:

```zax
if Z
  ...body...
end
```

becomes (approximately):

```asm
jp nz, __if_end_0
  ...body bytes...
__if_end_0:
```

The label names are generated and deduped by the `FlowState` helpers.

### 10.7 The `ld` Sub-Pipeline

The `ld` instruction is the most complex in ZAX because it bridges the high-level typed world (EA expressions with field paths) and the restricted Z80 addressing modes. It has its own multi-file sub-pipeline:

1. `asmLoweringLd.ts` — top entry point; decides whether the operand is simple enough for direct Z80 encoding or needs the EA sub-pipeline.
2. `ldLowering.ts` — integrates EA resolution and transfer planning.
3. `ldTransferPlan.ts` — constructs a *transfer plan*: the sequence of primitive operations needed to move data between two memory locations via Z80 registers.
4. `ldFormSelection.ts` — chooses the correct Z80 `ld` form (register-to-register, immediate-to-register, register-to-memory, etc.).
5. `ldEncoding.ts` / `ldEncodingRegMemHelpers.ts` — emit the actual bytes.

For a simple case like `ld a, b` this reduces to a single opcode. For `de := input_word` (loading a 16-bit local variable into DE), it expands to a sequence of `ld` instructions accessing `(IX+offset)`.

### 10.8 Op Expansion (Macro-Instructions)

`op` declarations define parameterised instruction templates. When the lowerer encounters a call to an op, it:

1. Identifies the op's overloads by name lookup (`opMatching.ts`).
2. Matches the call-site operands against each overload's parameter matchers to find the best match.
3. Executes the expansion (`opExpansionExecution.ts`): runs the op body as if it were inlined, substituting parameters for their call-site arguments (`opSubstitution.ts`).
4. Emits the resulting instructions into the output stream as if they had been written directly.

`opStackAnalysis.ts` optionally checks that the op body does not leave the stack in an inconsistent state (controlled by the `opStackPolicy` option).

### 10.9 Value Materialization and the Step Library

When an instruction operand is a typed EA expression (like `pair_buf.lo` or `arr[ix+2]`), the lowerer needs to turn it into a valid Z80 addressing mode. This is **value materialisation**, the job of the `valueMaterialization*.ts` family.

The materialiser resolves each `EaExprNode` variant:
- `EaName` → looks up the storage location in the `CompileEnv` / `storageView` (global, local/IX, or raw address).
- `EaField` → resolves the base EA, then adds the field offset (from `offsetOfPathInTypeExpr`).
- `EaIndex` → resolves base + index, generating pointer arithmetic code.
- `EaAdd` / `EaSub` → applies a compile-time displacement.

The output is a sequence of **step instructions** defined in `steps.ts`. The step library is a catalogue of pure, typed micro-operations:

```typescript
type StepInstr =
  | { kind: 'push'; reg: StepStackReg }
  | { kind: 'pop'; reg: StepStackReg }
  | { kind: 'ldRegMemHl'; reg: StepReg8 }       // ld reg, (HL)
  | { kind: 'ldIxDispReg'; disp: number; reg: StepReg8 } // ld (IX+d), reg
  | { kind: 'ldRpGlob'; rp: 'DE'|'HL'; glob: string } // ld HL, (global)
  // … many more …
```

A `StepPipeline` is an ordered array of `StepInstr` that collectively implement a read or write of a memory location. These pipelines are built by `addressingPipelines.ts` and then rendered to actual Z80 bytes during emission.

`eaResolution.ts` maps an EA name to its concrete storage kind (global variable, local via IX, raw address, …). `eaMaterialization.ts` turns that resolution into a step pipeline.

### 10.10 Phase 4 — Finalization, Fixups, and Placement

`finalizeEmitProgram()` in `emitFinalization.ts` does four things:

1. **Named-section placement** (`sectionPlacement.ts`): for each named section with an `at` anchor, verifies that no two sections overlap and computes the final base address.
2. **Section base calculation** (`programLoweringFinalize.ts`): `computeSectionBases()` determines the final base address of the default code, data, and var sections. By default, code starts at address 0, data immediately follows (word-aligned), and var follows data (word-aligned). The `defaultCodeBase` option can relocate code.
3. **Fixup resolution** (`fixupEmission.ts` and the finalization loop): every entry in the `fixups` array is a `{ offset, symbol, addend }` triple. The finaliser looks up the symbol in the now-resolved symbol table, computes the final address, and patches the two bytes at `offset`. `rel8Fixups` do the same for 8-bit signed relative displacements (used by `jr` and `djnz`).
4. **Lowered-ASM placement** (`loweredAsmPlacement.ts`): assigns final addresses to all blocks in the `LoweredAsmStream`, producing the `LoweredAsmProgram` that the `.z80` writer consumes.

Returns `{ map: EmittedByteMap, symbols: SymbolEntry[], placedLoweredAsmProgram }`.

---

> **Future diagrams** — Several subsections benefit from diagrams:
> - §10.1: a `graph TD` of the four phases with their input/output contracts
> - §10.5: a sequence diagram showing function-lowering coordinator calls to frame setup, body setup, and instruction lowering
> - §10.7: a flowchart of the `ld` sub-pipeline decision tree
> - §10.9: a diagram showing EA resolution → step pipeline → byte emission

---

[← Semantics](../part4/09-semantics.md) | [Part V](index.md) | [Z80 Encoding →](../part6/11-z80-encoding.md)
