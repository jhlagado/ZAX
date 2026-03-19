# Examples

Developer-facing examples. These are compiler regression fixtures and language-tour sources, not course material.

**Course examples** (Part 1 and Part 2) live under [`learning/`](../learning/README.md).

---

## Contents

### `language-tour/`

Side-by-side `.zax` source and generated `.asm` traces, organised by language feature. Reference material for contributors and users exploring the generated output. Referenced by corpus expansion tests.

### `codegen-corpus/`

Compiler regression fixtures used by code-generation tests. Not intended as reading material.

### Top-level files

`hello.zax`, `control_flow_and_labels.zax`, `stack_and_structs.zax` — minimal self-contained demos. The top-level `.zax` files here are compiled by `test/examples_compile.test.ts`.

Files prefixed `legacy_` are kept for reference and are not part of the current ZAX test surface.
