# ZAX Assembler (Node CLI) — AI Team Prompt

Use this prompt to instruct an AI (or multiple AIs acting as a team) to **plan and execute** the implementation of the ZAX assembler and its Debug80 integration.

This prompt is intentionally “meta”: it comes *before* detailed planning. Its job is to force the AI to produce a robust plan, break work into PR-sized chunks, coordinate agents, and follow a rigorous testing and review workflow.

---

## Prompt

You are an AI engineering team building a **ZAX assembler**: a Node.js command-line executable that compiles `.zax` modules into machine-code artifacts for Z80-family projects, per `docs/zax-spec.md`.

Treat this like a production tool: cross-platform (macOS/Windows/Linux), deterministic outputs, excellent diagnostics, strong tests, and developed via small PRs using `git` + the GitHub CLI (`gh`).

### 0) Mission

Implement a Node-based assembler for ZAX that:

- reads an entry `.zax` file, resolves imports, and compiles the whole program
- produces **at minimum**:
  - flat binary output (`.bin`)
  - Intel HEX output (`.hex`) (per the spec constraints)
  - Debug80-compatible debug map: **D8 Debug Map (D8M) v1 JSON** (`.d8dbg.json`)
- optionally produces a listing (`.lst`) and/or a human-readable map/symbol report
- integrates cleanly with the **Debug80** project so Debug80 can build + debug `.zax` sources alongside existing `.asm` flows (currently assembled via `asm80`)

### 1) Non‑negotiables (quality gates)

- **Cross-platform**
  - Handle Windows paths, quoting, drive letters, and CRLF tolerance.
  - Do not assume `/` path separators in user input.
  - Do not rely on case-sensitive filesystem behavior.
  - Do not use platform-specific shell utilities in core logic.
- **Determinism**
  - Same inputs → identical outputs.
  - Never depend on filesystem enumeration order.
  - Make ordering rules explicit and tested.
- **Diagnostics**
  - Every error includes file + line/column (when possible) and a clear message.
  - Fail with non-zero exit code on error.
- **Artifacts required**
  - `.bin`, `.hex`, and `.d8dbg.json` are first-class and must be supported.
- **Testing**
  - High coverage and many negative tests.
  - Integration tests run the CLI on fixtures and compare outputs.

### 2) CLI design requirement (assembler-like, simple + advanced switches)

Design the CLI like conventional assemblers (e.g., `asm80`): one “simple” invocation and a focused set of switches.

#### 2.0 CLI contract (required)

Implement the CLI to follow this contract (assembler-like, `asm80`-style):

- Invocation: `zax [options] <entry.zax>`
  - `<entry.zax>` must be the **last** argument.
- Primary output:
  - `-o, --output <file>` sets the **primary output file path**.
  - If `-o` is omitted, the primary output path is `<entryDir>/<base>.hex`.
  - Default primary output type is **HEX**.
- Artifact base:
  - `artifactBase = primaryOutputPath without its extension`
  - Sibling outputs (when enabled) are written alongside the primary output:
    - BIN: `artifactBase + ".bin"`
    - LST: `artifactBase + ".lst"`
    - D8M: `artifactBase + ".d8dbg.json"`
- Directory handling:
  - If `--output` points into a directory that does not exist, create it.
  - Accept user-supplied paths as-is; do not rewrite path separators on write.

This naming and co-location rule is required for Debug80 integration.

#### 2.1 Default behavior (simple mode)

- `zax [options] <entry.zax>`
- By default, produce **HEX + LST + D8M + BIN** next to the primary output.
  - Users can opt out of any output via switches (`--nolist`, `--nobin`, `--nod8m`, or equivalent).

#### 2.2 Switches (must propose final set; keep it small)

Your proposal must include at least:

- `-o, --output <file>`: assembler-style output target (like `asm80 -o`)
- `-t, --type <type>`: primary output type (default: `hex`)
  - Supported types for ZAX should include at least: `hex`, `bin`.
- Output selection:
  - `--nolist`, `--nobin`, `--nod8m` (or equivalent)
  - `--nolist` to suppress `.lst`
  - If user disables an output, do not produce it.
- Module resolution:
  - `-I, --include <dir>` (repeatable)
  - optional `--project <dir>` / `--root <dir>` if needed
- Build strictness:
  - `--warn-as-error` (or similar)
  - Determinism should be default (and effectively always-on)
- Debug/log:
  - `--verbose` / `--trace` to print resolution and lowering steps

**File-format agnosticism requirement:** accept Windows paths exactly as users pass them; normalize only for internal determinism and for emitted debug maps.

### 3) Debug80 integration (first-class requirement)

Debug80 currently integrates `asm80` by spawning it and expecting `.hex` + `.lst`, and it uses D8M debug maps.

You must plan and implement:

- A way for Debug80 to detect `.zax` projects (or entry files) and invoke `zax` instead of `asm80`.
- Ensure the ZAX assembler can be invoked from a working directory like Debug80 does:
  - Debug80 often sets `cwd` to the source directory and passes relative output paths.
- Artifact naming must fit Debug80 expectations:
  - `.hex` and `.lst` should be produced where Debug80 can find them.
  - `.d8dbg.json` must be produced with canonical naming `<artifactBase>.d8dbg.json`.

Deliverables for integration:

- a small PR to Debug80 adding “ZAX awareness” (file extension, build pipeline invocation, error reporting)
- an end-to-end test or documented manual recipe showing Debug80 stepping through ZAX output using the D8M map

### 4) Architecture expectations

Propose and implement a compiler pipeline with clear boundaries. A reasonable starting point:

- `cli/`: args parsing, IO policy, exit codes
- `frontend/`: lexer/parser/AST/source spans
- `semantics/`: name resolution, collisions, types/layout, const eval
- `lowering/`: structured control flow → labels/jumps, lowering of non-encodable operands, `op` expansion
- `backend/`: Z80 encoding, fixups, address→byte map, section packing, overlap checks
- `formats/`: BIN/HEX writers, optional LST writer, D8M writer
- `diagnostics/`: error objects + renderers

Call out explicitly where:

- determinism is enforced (sorting, ordering, normalization)
- Windows path edge cases are handled
- spec rules map to implementation (e.g., `select` lowering, `op` expansion, stack frame/trampoline model)

### 5) Testing regime (must be explicit and enforced)

You must propose a testing strategy with:

- Unit tests for lexer/parser/layout/const-eval/name resolution/lowering/encoding
- Integration tests that run the CLI on fixtures and compare:
  - `.hex` output
  - `.bin` output
  - `.d8dbg.json` output (structure + key fields)
  - `.lst` output if produced
- Negative fixtures: syntax errors, collisions, invalid HEX checksum, overlaps, out-of-range addresses, invalid reserved identifiers, etc.
- Golden-file update policy: must be intentional (flagged), never accidental

Target: high coverage of core compilation logic plus meaningful negative coverage for failure modes.

### 6) PR + agent workflow (required)

Work in small PRs:

- Branch: `codex/<topic>`
- Use `gh` CLI to open PRs, request reviews, and respond to review.
- Each PR must include tests for its change.
- Parallelize work across agents only when interfaces are agreed (AST, diagnostics, artifact naming).

### 7) What you must deliver first

Before coding, output:

1) A phased plan broken into PR-sized chunks, with dependencies.
2) For PR #1: exact scope, files to touch, tests to add.
3) A Debug80 integration plan (even if implemented later).

---

## Notes for refinement (for humans)

Topics to decide in future revisions of this prompt:

- Whether to support multiple commands (`zax build`, `zax parse`, `zax lex`) in addition to the classic `zax file.zax` flow
- How strict to make diagnostics snapshot testing (string-based) vs stable error IDs
