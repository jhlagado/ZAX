---
layout: default
title: "Chapter 7 — The Frontend"
parent: "Part III — The Frontend"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[← Module Loading](../part2/06-module-loading.md) | [Part III](index.md) | [The AST Contract →](08-the-ast-contract.md)

# Chapter 7 — The Frontend: Turning Text into an AST

All parsing lives in `src/frontend/`. There is **no separate lexer**. Instead, parsing is done on logical lines, using regex and character-by-character scanning, guided by keyword lookups in the tables from `grammarData.ts`.

### 7.1 Logical Lines (`parseLogicalLines.ts`)

The very first transformation takes the raw source text (a flat string) and breaks it into **logical lines**. A logical line is almost always a physical line, but a backslash (`\`) followed immediately by a non-whitespace character splits a line into two logical statements. So:

```zax
de := input_word \ inc de
```

… produces two logical lines: `de := input_word` and `inc de`.

`buildLogicalLines()` also correctly handles backslashes inside string and character literals (so `'\\'` is not treated as a line-continuation). Each logical line is a `LogicalLine` record containing:

- `raw` — the text of the logical line (no trailing newline, no comment).
- `startOffset` / `endOffset` — byte offsets in the original source for source-span tracking.
- `lineNo` — 1-based line number in the original file (important after include expansion).
- `filePath` — the original file this line came from.

Comments are **not** stripped here; `stripLineComment()` is called on each line just before parsing in `parseModuleItem()`.

### 7.2 Grammar Data (`grammarData.ts`)

This file is a single flat module of exported constants — think of it as the grammar's vocabulary:

- `TOP_LEVEL_KEYWORDS` — the `Set` of keywords that can start a top-level declaration: `func`, `const`, `enum`, `data`, `import`, `type`, `union`, `globals`, `var`, `extern`, `bin`, `hex`, `op`, `section`, `align`.
- `REGISTERS_8`, `REGISTERS_16`, `REGISTERS_16_SHADOW` — the Z80 register names (always in upper-case canonical form, e.g. `"HL"`, `"AF'"`).
- `CONDITION_CODES` — `z`, `nz`, `c`, `nc`, `pe`, `po`, `m`, `p`.
- `ASM_CONTROL_KEYWORDS` — `if`, `else`, `end`, `while`, `repeat`, `until`, `break`, `continue`, `select`, `case`.
- `IMM_OPERATOR_PRECEDENCE` — an array of `{ level, ops }` objects that defines the full operator precedence table for immediate expressions, from multiply/divide (level 7) down to bitwise OR (level 2). This drives the Pratt parser in `parseImm.ts`.
- `MATCHER_TYPES` — the types that can appear in `op` parameter declarations: `reg8`, `reg16`, `idx16`, `cc`, `imm8`, `imm16`, `ea`, `mem8`, `mem16`.
- `CHAR_ESCAPE_VALUES` — the escape sequences recognised in character and string literals.
- `SCALAR_TYPES` — `byte`, `word`, `addr`.

Nothing in `grammarData.ts` has any side effects; it is pure data.

### 7.3 The Parser Entry Point (`parser.ts`)

`parseModuleFile(modulePath, sourceText, diagnostics)` is the function called once per module. It:

1. Creates a `SourceFile` via `makeSourceFile()` in `source.ts`, which pre-computes the byte offset of every line start.
2. Calls `buildLogicalLines()` to get the `LogicalLine[]` array.
3. Builds the `moduleItemDispatchTable` — a map from each top-level keyword to a handler function.
4. Runs a loop over logical lines, calling `parseModuleItem()` for each.
5. Returns a `ModuleFileNode`.

`parseModuleItem()` (a closure inside `parseModuleFile`) is where each line gets routed:

1. Strips the comment from the raw line and trims whitespace.
2. If inside a named section (`ctx.scope === 'section'`), checks for the closing `end` token.
3. Parses the optional `export` prefix.
4. Identifies the dispatch keyword via `topLevelStartKeyword()` (which peeks at the first token of the line).
5. Calls the matching handler from the dispatch table.
6. Falls back to `recoverUnsupportedParserLine()` if no handler matches, which emits a diagnostic and advances past the bad line.

Parsing is **best-effort**: errors are reported and parsing continues so the user sees as many problems as possible in one pass.

### 7.4 Dispatch and Item Handlers

`parseModuleItemDispatch.ts` builds the dispatch table. Each entry is a function that takes a `ParseItemArgs` context (the line text, span, `export` flag, current line index, etc.) and returns a `ParseItemResult` — a `{ nextIndex, node?, sectionClosed? }` triple.

The `nextIndex` field is important: handlers may consume multiple lines (e.g. a `func` declaration consumes lines until its matching `end`), so the parser needs to know where to resume.

Simple top-level keywords (`const`, `align`, `bin`, `hex`) are handled in `parseTopLevelSimple.ts`. More complex ones have dedicated files:

| Keyword | File |
|---------|------|
| `func` | `parseFunc.ts` |
| `op` | `parseOp.ts` |
| `type`, `union` | `parseTypes.ts` |
| `enum` | `parseEnum.ts` |
| `data` | `parseData.ts` |
| `globals`, `var` | `parseGlobals.ts` |
| `extern` | `parseExtern.ts` / `parseExternBlock.ts` |
| `section` | dispatches into `parseSectionBodies.ts` |

### 7.5 Parsing Functions and Ops

`parseFunc.ts` calls `parseCallableHeader.ts` to parse the `name(params): returnRegs` header, then collects logical lines until it finds a bare `end` keyword at the correct nesting level, calling `parseAsmStatements.ts` for the body.

The header parser, `parseCallableHeader.ts`, is shared between `func` and `op`. It handles:
- The function name.
- A parenthesised parameter list (`parseParams.ts`).
- An optional `: RP` return-register annotation (e.g. `: HL`).

`parseOp.ts` does the same but uses `parseOpParamsFromText()` which expects `op` parameter declarations like `dst: reg8, src: reg16`.

### 7.6 Parsing ASM Bodies

`parseAsmStatements.ts` is the core of the body parser. It iterates over lines and for each one calls `parseAsmStatement()`, which:

1. Detects label definitions (lines ending in `:`).
2. Detects structured control-flow keywords (`if`, `while`, `repeat`, `until`, `select`, `case`, `else`, `end`, `break`, `continue`) and creates `AsmControlNode` objects. Nesting depth is tracked in a `ControlFrame` stack managed by `parseAsmControlHelpers.ts`.
3. Falls through to `parseAsmInstruction.ts` for everything else.

`parseAsmInstruction.ts` tokenises the line into a mnemonic (the "head") and zero-or-more operands. It recognises:
- The special `:=` assignment head — handled by `parseAssignmentInstruction.ts`.
- The `step` head — handled by `parseStepInstruction.ts`.
- Everything else as a plain Z80 mnemonic, delegating operand parsing to `parseOperands.ts`.

`parseOperands.ts` parses the comma-separated operand list. Each operand is one of:
- `Reg` — a recognised register name.
- `Imm` — a bare immediate expression.
- `Ea` — an effective-address expression (possibly with an explicit `@` address-of prefix).
- `Mem` — a memory operand in parentheses, e.g. `(hl)`.
- `PortC` — the `(C)` port operand.
- `PortImm8` — a `(n)` port operand.

### 7.7 Parsing Expressions: Immediates and Effective Addresses

**Immediate expressions** (`parseImm.ts`) are parsed with a standard Pratt (top-down operator precedence) parser. The precedence table comes from `grammarData.ts`. Supported forms:

- Decimal, hex (`$xx` or `0xXX`), binary (`%xxxxxxxx`) and character literals (`'c'`).
- Named constants and enum members.
- `sizeof(TypeExpr)` and `offsetof(TypeExpr, path)`.
- Unary `+`, `-`, `~`.
- Binary `*`, `/`, `%`, `+`, `-`, `<<`, `>>`, `&`, `^`, `|`.

**Effective-address expressions** (`parseOperands.ts` and inline in `parseImm.ts`) are ZAX-specific. An EA describes a memory location in a way that may involve:

- A bare name (`pair_buf`, `local_var`).
- A field access (`pair_buf.lo`).
- An array index (`arr[i]`, `arr[HL]`, `arr[IX+2]`).
- An explicit address literal (`$1234`).
- A typed reinterpretation (`as MyType`).
- Arithmetic offsets (`+ n`, `- n`).

These are represented in the AST as `EaExprNode` variants.

---

> **Future diagram** — A `graph LR` showing the call chain from `parseModuleFile()` through `buildLogicalLines()` → `parseModuleItem()` → per-keyword handler → `parseAsmStatements()` → `parseAsmInstruction()` would make the dispatch hierarchy visible at a glance.

---

[← Module Loading](../part2/06-module-loading.md) | [Part III](index.md) | [The AST Contract →](08-the-ast-contract.md)
