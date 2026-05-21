---
layout: default
title: "Appendix A — File → Responsibility Reference"
parent: "Appendices"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 1
---
[← Cross-Cutting Concerns](../part7/16-cross-cutting-concerns.md) | [Appendices](index.md)

# Appendix A — File → Responsibility Reference

A quick-reference table mapping every source file in `src/` to its one-line role. Use this when you need to know which file to open for a given task.

| File | One-line summary |
|------|-----------------|
| `cli.ts` | Parse CLI args → call `compile()` → write files |
| `compile.ts` | Top-level pipeline: load → parse → semantics → lower → write |
| `compileShared.ts` | `hasErrors()`, `normalizePath()` |
| `diagnosticTypes.ts` | `Diagnostic` interface, `DiagnosticIds` enum |
| `pipeline.ts` | `CompilerOptions`, `PipelineDeps`, `CompileFn` interfaces |
| `moduleIdentity.ts` | `canonicalModuleId()` |
| `moduleLoader.ts` | `loadProgram()` — file I/O, include expansion, import resolution |
| `moduleLoaderIncludePaths.ts` | Import candidate path resolution |
| `moduleVisibility.ts` | Cross-module export visibility rules |
| `lintCaseStyle.ts` | Case-style linting pass |
| `sectionKeys.ts` | `collectNonBankedSectionKeys()` |
| `frontend/ast.ts` | All AST types (no logic) |
| `frontend/parser.ts` | `parseModuleFile()`, `parseProgram()` |
| `frontend/source.ts` | `SourceFile`, `makeSourceFile()`, `span()` |
| `frontend/grammarData.ts` | Register names, keywords, operator precedence tables |
| `frontend/parseLogicalLines.ts` | `buildLogicalLines()` — backslash line-continuation |
| `frontend/parseModuleItemDispatch.ts` | Dispatch table for top-level keywords |
| `frontend/parseAsmStatements.ts` | ASM body parser — labels, control flow, instructions |
| `frontend/parseImm.ts` | Immediate expression Pratt parser |
| `frontend/parseOperands.ts` | ASM operand parser (Reg, Imm, Ea, Mem, Port) |
| `semantics/env.ts` | `CompileEnv`, `buildEnv()`, `evalImmExpr()` |
| `semantics/layout.ts` | `sizeOfTypeExpr()`, `offsetOfPathInTypeExpr()` |
| `semantics/typeQueries.ts` | Type resolution helpers, `typeDisplay()` |
| `lowering/emit.ts` | `emitProgram()` — top-level lowering entry point |
| `lowering/emitPipeline.ts` | Phase names, phase runners, result types |
| `lowering/programLowering.ts` | `preScanProgramDeclarations()`, `lowerProgramDeclarations()` |
| `lowering/functionLowering.ts` | Per-function lowering coordinator |
| `lowering/functionFrameSetup.ts` | Stack frame / locals allocation |
| `lowering/functionBodySetup.ts` | Control-flow frame reconstruction |
| `lowering/asmBodyOrchestration.ts` | ASM block traversal and control-flow lowering |
| `lowering/asmInstructionLowering.ts` | Instruction-level dispatch |
| `lowering/asmLoweringAssign.ts` | `:=` lowering |
| `lowering/asmLoweringLd.ts` | `ld` lowering (entry) |
| `lowering/ldTransferPlan.ts` | ld transfer plan builder |
| `lowering/ldFormSelection.ts` | ld form selection |
| `lowering/ldEncoding.ts` | ld byte encoding |
| `lowering/opMatching.ts` | Op overload matching |
| `lowering/opExpansionExecution.ts` | Op body inlining |
| `lowering/valueMaterialization.ts` | EA → step pipeline orchestration |
| `lowering/eaResolution.ts` | EA name → storage location |
| `lowering/steps.ts` | Step library (pure addressing micro-ops) |
| `lowering/emitFinalization.ts` | Phase 4: fixup resolution, section placement |
| `lowering/sectionPlacement.ts` | Named-section placement |
| `lowering/loweredAsmTypes.ts` | Lowered-ASM IR types |
| `lowering/fixupEmission.ts` | Fixup queue management |
| `z80/encode.ts` | Z80 instruction encoder dispatcher |
| `z80/encodeLd.ts` | `ld` instruction encoding |
| `z80/encodeControl.ts` | Branch/call instruction encoding |
| `z80/encodeAlu.ts` | ALU instruction encoding |
| `z80/encodeBitOps.ts` | Bit-operation encoding |
| `formats/types.ts` | `EmittedByteMap`, `SymbolEntry`, `Artifact` types |
| `formats/writeBin.ts` | Flat binary writer |
| `formats/writeHex.ts` | Intel HEX writer |
| `formats/writeD8m.ts` | D8 debug-map JSON writer |
| `formats/writeListing.ts` | Assembler listing writer |
| `formats/writeAsm80.ts` | Lowered Z80 assembler source writer |

---

*This document was generated in March 2026 against the `main` branch of ZAX. If you find anything that has drifted from the current source, please open an issue or update this file.*

---

[← Cross-Cutting Concerns](../part7/16-cross-cutting-concerns.md) | [Appendices](index.md)
