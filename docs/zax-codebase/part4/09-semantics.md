---
layout: default
title: "Chapter 9 — Semantics"
parent: "Part IV — Semantics"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[← The AST Contract](../part3/08-the-ast-contract.md) | [Part IV](index.md) | [Lowering →](../part5/10-lowering.md)

# Chapter 9 — Semantics: Building the Compilation Environment

### 9.1 The Compile Environment (`semantics/env.ts`)

`buildEnv(program, diagnostics, options)` traverses the entire `ProgramNode` and populates a `CompileEnv`:

```typescript
interface CompileEnv {
  consts:  Map<string, number>;      // All constant values, keyed by name
  enums:   Map<string, number>;      // All enum member values, keyed by "Enum.member"
  types:   Map<string, TypeDeclNode | UnionDeclNode>;  // Named types
  // Visibility-filtered sub-maps (cross-module):
  visibleConsts?:  Map<string, number>;
  visibleEnums?:   Map<string, number>;
  visibleTypes?:   Map<string, TypeDeclNode | UnionDeclNode>;
}
```

`evalImmExpr(expr, env, diagnostics?)` evaluates an `ImmExprNode` to a JavaScript `number` at compile time. It recursively handles all `ImmExprNode` variants:
- `ImmLiteral` → the literal value.
- `ImmName` → lookup in `env.consts` or `env.enums`.
- `ImmSizeof` → calls `sizeOfTypeExpr()`.
- `ImmOffsetof` → calls `offsetOfPathInTypeExpr()`.
- `ImmUnary` → applies the unary operator.
- `ImmBinary` → recursively evaluates both sides, then applies the operator.

Division by zero is caught and reported as a diagnostic.

`declVisitor.ts` provides `visitDeclTree()`, a utility that walks the whole program tree in declaration order. `buildEnv()` uses it to collect all declarations before any cross-references are evaluated.

### 9.2 Type Layout (`semantics/layout.ts`)

`sizeOfTypeExpr(typeExpr, env)` computes the byte size of a type expression:
- `byte` → 1
- `word`, `addr` → 2
- `TypeName` → looks up the named type in `env.types` and recurses.
- `ArrayType` → `element_size * length`.
- `RecordType` → sum of all field sizes.

`offsetOfPathInTypeExpr(typeExpr, path, env)` computes the byte offset of a field path within a record type. This is what `offsetof(T, field)` evaluates to at compile time, and it is also what the lowering phase uses when accessing named fields.

### 9.3 Semantic Validation Passes

After building the environment, `compile.ts` runs two validation passes before lowering:

**`validateAssignmentAcceptance()`** (`semantics/assignmentAcceptance.ts`) checks every `:=` instruction in every function body for semantic correctness — for example, that the right-hand side of a register assignment is actually a storable source.

**`validateStepAcceptance()`** (`semantics/stepAcceptance.ts`) validates every `step` instruction, checking that the target is a valid memory-incrementable variable.

Both passes append errors to `diagnostics` but do not modify the AST. Lowering is only attempted if both pass cleanly.

---

---

[← The AST Contract](../part3/08-the-ast-contract.md) | [Part IV](index.md) | [Lowering →](../part5/10-lowering.md)
