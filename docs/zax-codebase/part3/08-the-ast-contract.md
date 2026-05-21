---
layout: default
title: "Chapter 8 — The AST Contract"
parent: "Part III — The Frontend"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 2
---
[← The Frontend](07-the-frontend.md) | [Part III](index.md) | [Semantics →](../part4/09-semantics.md)

# Chapter 8 — The AST Contract

`ast.ts` is a **type-only** file — it defines interfaces and type unions but contains zero runtime logic. Every node carries a `kind: string` discriminant and a `span: SourceSpan` for error reporting.

The top-level hierarchy:

```
ProgramNode
└── files: ModuleFileNode[]
    └── items: ModuleItemNode[]
```

`ModuleItemNode` is a union of all possible top-level declarations:

```
ImportNode | NamedSectionNode | ConstDeclNode | EnumDeclNode
| DataBlockNode | VarBlockNode | FuncDeclNode | UnionDeclNode
| TypeDeclNode | ExternDeclNode | BinDeclNode | HexDeclNode
| OpDeclNode | AlignDirectiveNode | UnimplementedNode
```

A `FuncDeclNode` is:
```typescript
{
  kind: 'FuncDecl',
  name: string,
  exported: boolean,
  params: ParamNode[],
  returnRegs: string[],   // e.g. ['HL']
  locals: VarBlockNode,   // the var...end block
  asm: AsmBlockNode,      // the body
}
```

An `AsmBlockNode` holds a flat list of `AsmItemNode[]` — labels, control nodes, and instruction nodes. The structured control flow (`if/while/…`) is represented as flat control tokens; the *nesting* is not made explicit in the AST. That nesting is reconstructed during lowering.

**Key expression types:**

`ImmExprNode` — immediate (compile-time) expression:
```
ImmLiteral | ImmName | ImmSizeof | ImmOffsetof
| ImmUnary | ImmBinary
```

`EaExprNode` — effective-address (possibly runtime) expression:
```
EaName | EaImm | EaReinterpret | EaField | EaIndex | EaAdd | EaSub
```

`EaIndexNode` — the index part of an indexed EA:
```
IndexImm | IndexReg8 | IndexReg16 | IndexMemHL | IndexMemIxIy | IndexEa
```

Understanding these three type families is crucial for comprehending the lowering phase.

---

> **Future diagram** — The `ProgramNode → ModuleFileNode → ModuleItemNode` hierarchy and the `ImmExprNode` / `EaExprNode` / `EaIndexNode` discriminated unions are natural candidates for Mermaid class diagrams (`classDiagram`).

---

[← The Frontend](07-the-frontend.md) | [Part III](index.md) | [Semantics →](../part4/09-semantics.md)
