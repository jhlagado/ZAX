---
layout: default
title: "Chapter 14 — Diagnostics"
parent: "Part VI — Supporting Systems"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 4
---
[← Output Format Writers](13-output-format-writers.md) | [Part VI](index.md) | [The Test Suite →](../part7/15-the-test-suite.md)

# Chapter 14 — Diagnostics

`diagnosticTypes.ts` defines:

```typescript
type DiagnosticSeverity = 'error' | 'warning' | 'info';

interface Diagnostic {
  id: DiagnosticId;
  severity: DiagnosticSeverity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}
```

Diagnostic IDs are namespaced:

| Range | Area |
|-------|------|
| `ZAX000` | Unknown |
| `ZAX001` | IoReadFailed |
| `ZAX1xx` | Parse errors |
| `ZAX2xx` | Encode errors |
| `ZAX3xx` | Emit/lowering errors |
| `ZAX4xx` | Semantics errors |
| `ZAX5xx` | Case-style lint warnings |

Every subsystem appends to a shared `Diagnostic[]` passed in from `compile.ts`. The compiler never throws for user-visible errors — it reports them and continues. `hasErrors()` in `compileShared.ts` is the central check used between phases.

---

---

[← Output Format Writers](13-output-format-writers.md) | [Part VI](index.md) | [The Test Suite →](../part7/15-the-test-suite.md)
