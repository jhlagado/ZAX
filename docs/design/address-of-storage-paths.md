# ADDR-EXPR-01: address-of storage paths

Status: Draft discussion paper
Scope: define explicit address-of syntax for typed storage paths after the `move`/`ld` split
Purpose: add a clean way to obtain runtime addresses of typed storage locations without reintroducing typed-storage semantics into `ld`

## Contents
- [1. Problem statement](#1-problem-statement)
- [2. Chosen direction](#2-chosen-direction)
- [3. Surface syntax](#3-surface-syntax)
- [4. Semantic category](#4-semantic-category)
- [5. Exact interaction with `ld` and `move`](#5-exact-interaction-with-ld-and-move)
- [6. Exact interaction with typed storage paths](#6-exact-interaction-with-typed-storage-paths)
- [7. Exact interaction with raw labels](#7-exact-interaction-with-raw-labels)
- [8. Grammar and AST impact](#8-grammar-and-ast-impact)
- [9. Staged implementation plan](#9-staged-implementation-plan)
- [10. Non-goals](#10-non-goals)

## 1. Problem statement

After the `move` split, ZAX has a cleaner boundary:

- `move` handles register ↔ typed-storage transfer
- `ld` handles classic assembler semantics

One useful capability is still missing: taking the address of a typed storage path. Programmers sometimes need the address of a variable, field, or indexed element as a runtime value so it can be placed in a register and used explicitly.

That capability should exist, but it should not be smuggled back into `move` and it should not blur raw-label semantics again.

## 2. Chosen direction

The chosen direction is:

- use outermost-prefix `@path` syntax
- define it only for storage-path operands, not for general expressions
- keep it separate from `move`
- make it yield an address-valued operand that can be loaded into a register pair by `ld`

This keeps the feature small and explicit. It adds address-of without reviving the older typed-`ld` overload.

## 3. Surface syntax

The v1 spelling is:

```zax
@x
@array[i]
@record.field
@items[idx].next
@<Sprite>hl.flags
```

The `@` applies only as the outermost prefix to a storage path.

Not allowed in v1:

```zax
array[@i]
@@x
@(@x)
@(<Sprite>hl.flags)
```

The feature is intentionally narrow. `@` is not a general-purpose unary operator.

## 4. Semantic category

`@path` is not an `imm_expr` and not a normal scalar value expression. It is an address-of storage-path form.

That means:
- it is resolved from a typed storage path
- it lowers to runtime address computation as needed
- it can depend on frame offsets, register indices, or field offsets
- it is not restricted to assembler-time constants

So `@x` for a local variable is valid even though the resulting address is not a fixed literal. The compiler computes the address according to the storage-path rules and loads it into a register pair.

## 5. Exact interaction with `ld` and `move`

`move` does not accept `@path`.

`move` remains register ↔ typed-storage transfer only. Address-of changes the operand category and therefore belongs outside `move`.

The intended v1 use is with `ld` into a 16-bit register destination:

```zax
ld hl, @x
ld de, @array[i]
ld bc, @record.field
```

These forms mean: compute the address of the storage path and place that address in the destination register pair.

`@path` is not legal as a destination in v1.

## 6. Exact interaction with typed storage paths

`@` applies to the same storage-path family already used by typed access:

- globals
- locals
- arguments
- field access
- indexing
- typed reinterpretation heads such as `<Type>base.tail`

Examples:

```zax
ld hl, @counter
ld hl, @sprite.flags
ld de, @words[i]
ld hl, @<Sprite>ix.flags
```

The key rule is that `@` takes the address of the final resolved storage location. It does not load the value stored there.

## 7. Exact interaction with raw labels

Raw labels already have address semantics under classic `ld`.

That means:

```zax
ld hl, table
```

already loads the address of the raw label `table`. Therefore:

```zax
ld hl, @table
```

is not needed and should be invalid in v1.

This keeps the split clean:
- typed storage needs `@` to become address-valued
- raw labels are already address-valued by declaration class

## 8. Grammar and AST impact

Grammar impact should be narrow.

The parser should recognize `@` only as the outermost prefix on a storage-path operand, producing a dedicated AST node such as:

```text
EaAddressOf {
  target: EaExprNode
}
```

The target remains an ordinary storage-path AST. The `@` wrapper changes the semantic category of that operand without changing the underlying path grammar.

No nested `@` forms are needed in v1.

## 9. Staged implementation plan

Stage 1: accept this design in docs.

Stage 2: parser/AST
- add `@path` parsing as an outermost storage-path prefix
- reject nested or interior uses
- reject raw-label uses explicitly if needed

Stage 3: lowering/semantics
- lower `ld rr, @path` by computing the runtime address of the storage path
- support globals, locals, args, fields, indexes, and typed reinterpretation heads
- keep `move` unchanged

Stage 4: examples/reference
- add a small focused example set for address-of
- keep it presented as additive, not as a new center of the language

## 10. Non-goals

This stream does not do any of the following:

- restore typed-storage semantics to `ld`
- make `move` accept address-of operands
- add general pointer arithmetic
- add `@` as a general expression operator
- add `@` support for raw labels where bare label syntax already gives address semantics

This is a narrow feature: explicit address-of for typed storage paths.
