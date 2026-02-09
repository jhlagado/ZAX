# ZAX Assembler Pipeline (v0.1, Current Implementation)

This document explains how the ZAX toolchain turns a `.zax` entry file into output artifacts (`.bin`, `.hex`, `.d8dbg.json`, `.lst`), and how it handles forward references (fixups).

This describes **current code**, not an aspirational design.

---

## 1. Inputs and Outputs

Inputs:

- An entry module path (a `.zax` file).
- Optional `includeDirs` used when resolving `import` statements.

Outputs (in-memory artifacts returned by the compiler):

- Flat binary image (`.bin`)
- Intel HEX (`.hex`)
- D8 debug map (`.d8dbg.json`)
- Listing (`.lst`) (currently a minimal byte dump + symbols; not yet a full source listing)

Implementation entrypoint:

- `src/compile.ts` (`compile(...)`)

---

## 2. High-Level Stages

### Stage A: Load modules (imports)

ZAX is compiled as a whole-program unit. Starting from the entry file:

1. Read and parse the entry module.
2. Collect `import` targets.
3. Resolve each import against:
   1. The importing module directory
   2. Each `includeDirs` entry (in order)
4. Read and parse imported modules, recursively.
5. Detect:
   - Import cycles
   - Module ID collisions (case-insensitive), where module ID is derived from the filename (without extension)
6. Topologically sort modules so dependencies are processed first (deterministic ordering).

Implementation:

- `src/compile.ts`: `loadProgram(...)`

### Stage B: Build semantic environment (names + types)

The compiler builds a global environment from the whole program:

- Declared symbols (functions, ops, consts, data/var names, etc.)
- Type layouts for `type` declarations (records/unions) and derived layouts for `data`/`var`

Implementation:

- `src/semantics/env.ts`: `buildEnv(...)`
- `src/semantics/layout.ts`: type layout helpers

### Stage C: Lower + emit (code/data bytes + fixups)

Lowering walks the AST and emits:

- Code section bytes
- Data section bytes
- A symbol table (addresses for labels / globals)
- Fixups: “patch this placeholder once the target address is known”

The key point is that **forward references are allowed** in many forms (labels before definition, calls/jumps to later symbols). Emission records a fixup at the use site and patches it once layout is complete.

Implementation:

- `src/lowering/emit.ts`: `emitProgram(...)`
- See `docs/zax-spec.md` “Fixups and Forward References (v0.1)” for the language-level contract.

### Stage D: Format writers (artifacts)

The emitter returns a memory map + symbols. Format writers turn that into artifacts:

- `src/formats/writeBin.ts`
- `src/formats/writeHex.ts`
- `src/formats/writeD8m.ts`
- `src/formats/writeListing.ts`

The compile pipeline currently does **not** write to disk itself; it returns artifacts in-memory and the CLI (or caller) decides what to do with them.

Implementation:

- `src/compile.ts`: calls `deps.formats.*`

---

## 3. Forward References and Fixups (How It Works)

### What is a fixup?

A fixup is a record that says:

- Where in the output bytes a placeholder was emitted
- What symbol/expression it should be patched with
- What encoding rule applies (e.g., absolute 16-bit address, rel8 displacement)

Examples of things that generally require fixups:

- `jp label` (absolute 16-bit)
- `jr label` (relative 8-bit displacement, range-checked)
- `call func` (absolute 16-bit)
- `ld hl, dataSymbol` (absolute 16-bit immediate)

### When do fixups resolve?

Fixups resolve after enough emission has happened to know final addresses, i.e. after:

- All code/data bytes are emitted
- The symbol table has final addresses

At that point the compiler patches placeholder bytes.

### What if a fixup cannot resolve?

If a referenced symbol cannot be resolved, emission reports an error diagnostic like:

- `Unresolved symbol "<name>" in 16-bit fixup.`
- `Unresolved symbol "<name>" in rel8 <mnemonic> fixup.`

Implementation:

- `src/lowering/emit.ts` (unresolved symbol diagnostics during fixup resolution)

---

## 4. Determinism Notes (Why Ordering Matters)

Several pipeline steps intentionally impose deterministic ordering so builds are stable:

- Import graph traversal and topo ordering is sorted by `(moduleId, path)`.
- Emission uses stable symbol maps where practical; instability here shows up as non-deterministic output bytes or symbol addresses.

Implementation:

- `src/compile.ts`: deterministic topo sort for modules
