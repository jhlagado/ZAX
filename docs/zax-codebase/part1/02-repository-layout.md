---
layout: default
title: "Chapter 2 — Repository Layout"
parent: "Part I — Orientation"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 2
---
[← What ZAX Is](01-what-zax-is.md) | [Part I](index.md) | [The Compilation Pipeline →](03-the-compilation-pipeline.md)

# Chapter 2 — Repository Layout

```
src/
├── cli.ts                     # Command-line entry point
├── compile.ts                 # Main compile() function — pipeline orchestration
├── compileShared.ts           # Tiny shared helpers (hasErrors, normalizePath)
├── diagnosticTypes.ts         # Diagnostic ID constants and Diagnostic interface
├── pipeline.ts                # CompilerOptions and PipelineDeps interfaces
├── moduleIdentity.ts          # Canonical module-ID generation
├── moduleLoader.ts            # File loading, include expansion, import resolution
├── moduleLoaderIncludePaths.ts# Import candidate path resolution
├── moduleVisibility.ts        # Cross-module symbol visibility rules
├── lintCaseStyle.ts           # Case-style linting (keywords/registers)
├── sectionKeys.ts             # Named section key collection
│
├── frontend/                  # Parsing: text → AST
│   ├── ast.ts                 # AST type contracts (no logic)
│   ├── parser.ts              # parseModuleFile() — top-level parser
│   ├── source.ts              # SourceFile, line offsets, span()
│   ├── grammarData.ts         # Register names, keywords, operator precedence tables
│   ├── parseLogicalLines.ts   # Line-continuation (backslash) handling
│   ├── parseParserShared.ts   # Shared helpers: stripLineComment, isReservedName, etc.
│   ├── parseDiagnostics.ts    # parseDiag() helper
│   ├── parseParserRecovery.ts # Error-recovery helpers
│   ├── parseModuleCommon.ts   # topLevelStartKeyword(), diagInvalidHeaderLine()
│   ├── parseModuleItemDispatch.ts # Dispatch table for top-level keywords
│   ├── parseTopLevelSimple.ts # const, align, bin, hex declarations
│   ├── parseFunc.ts           # func declaration
│   ├── parseOp.ts             # op declaration
│   ├── parseCallableHeader.ts # Shared header (name + params) for func/op
│   ├── parseGlobals.ts        # globals block
│   ├── parseData.ts           # data block + initializers
│   ├── parseEnum.ts           # enum declaration
│   ├── parseExtern.ts         # extern declaration
│   ├── parseExternBlock.ts    # extern block body
│   ├── parseTypes.ts          # type and union declarations
│   ├── parseParams.ts         # Parameter list parsing
│   ├── parseImm.ts            # Immediate expression parser
│   ├── parseOperands.ts       # ASM operand parser
│   ├── parseAsmStatements.ts  # ASM statement dispatcher (labels, control, instructions)
│   ├── parseAsmInstruction.ts # Individual instruction line parser
│   ├── parseAsmControlHelpers.ts # Control-flow frame helpers
│   ├── parseAssignmentInstruction.ts # := assignment syntax
│   ├── parseStepInstruction.ts # step addressing instruction
│   ├── parseAsmCaseValues.ts  # case value range expressions
│   ├── parseRawDataDirectives.ts # db/dw/ds directives
│   └── parseSectionBodies.ts  # Named section body parsing
│
├── semantics/                 # Semantic analysis
│   ├── env.ts                 # CompileEnv, buildEnv(), evalImmExpr()
│   ├── layout.ts              # sizeOfTypeExpr(), offsetOfPathInTypeExpr()
│   ├── typeQueries.ts         # Type resolution helpers, typeDisplay()
│   ├── storageView.ts         # Storage-view management
│   ├── declVisitor.ts         # Declaration tree visitor
│   ├── instructionAcceptance.ts # Instruction semantic validation
│   ├── assignmentAcceptance.ts  # := statement validation
│   └── stepAcceptance.ts        # step instruction validation
│
├── lowering/                  # Code generation: AST + env → bytes
│   │
│   │  ── Orchestration ──
│   ├── emit.ts                # emitProgram(): phases 1-4 glued together
│   ├── emitPipeline.ts        # Phase 2/3/4 runners + result types
│   ├── emitContextBuilder.ts  # Program lowering context assembly
│   ├── emitPhase1Workspace.ts # Section byte maps and mutable state
│   ├── emitPhase1Helpers.ts   # Phase-1 helper construction
│   ├── emitProgramContext.ts  # ProgramLoweringContext wiring
│   ├── emitState.ts           # Mutable emission state
│   ├── emitVisibility.ts      # Symbol visibility tracking
│   ├── emitFinalization.ts    # Phase 4: fixup resolution + placement
│   ├── emitFinalizationSetup.ts # Finalization env setup
│   │
│   │  ── Program-level lowering ──
│   ├── programLowering.ts     # preScanProgramDeclarations() + lowerProgramDeclarations()
│   ├── programLoweringData.ts # Data block lowering
│   ├── programLoweringDeclarations.ts # Declaration dispatch helpers
│   ├── programLoweringFinalize.ts # Section base computation
│   │
│   │  ── Function lowering ──
│   ├── functionLowering.ts    # Per-function coordinator
│   ├── functionBodySetup.ts   # Body parsing + control-flow frame
│   ├── functionFrameSetup.ts  # Stack frame and locals allocation
│   ├── functionAsmRewriting.ts # Peephole / rewriting passes
│   ├── functionCallLowering.ts # Function call emission
│   │
│   │  ── ASM body / instruction lowering ──
│   ├── asmBodyOrchestration.ts # ASM block traversal
│   ├── asmInstructionLowering.ts # Instruction dispatch
│   ├── asmInstructionLdHelpers.ts # ld-instruction helpers
│   ├── asmLoweringAssign.ts   # := lowering
│   ├── asmLoweringLd.ts       # ld lowering
│   ├── asmLoweringStep.ts     # step lowering
│   ├── asmLoweringBranchCall.ts # Branch/call lowering
│   ├── asmLoweringHost.ts     # Host-instruction helpers
│   ├── asmRangeLowering.ts    # Range/loop lowering
│   ├── asmUtils.ts            # ASM utility functions
│   │
│   │  ── ld encoding sub-pipeline ──
│   ├── ldEncoding.ts          # Top-level ld encoding
│   ├── ldEncodingRegMemHelpers.ts # reg-mem encoding
│   ├── ldFormSelection.ts     # Load form selection
│   ├── ldTransferPlan.ts      # Load transfer planning
│   ├── ldLowering.ts          # ld lowering integration
│   │
│   │  ── Op (macro) expansion ──
│   ├── opMatching.ts          # Op overload matching
│   ├── opExpansionOrchestration.ts # Expansion orchestration
│   ├── opExpansionExecution.ts # Expansion execution
│   ├── opStackAnalysis.ts     # Stack effect analysis
│   ├── opSubstitution.ts      # Parameter substitution
│   │
│   │  ── Value materialisation / EA ──
│   ├── valueMaterialization.ts    # Orchestration
│   ├── valueMaterializationBase.ts # Base helper
│   ├── valueMaterializationContext.ts # Context
│   ├── valueMaterializationIndexing.ts # Indexing
│   ├── valueMaterializationRuntimeEa.ts # Runtime EA
│   ├── valueMaterializationTransport.ts # Transport
│   ├── eaResolution.ts        # EA name → storage location
│   ├── eaMaterialization.ts   # EA materialization
│   ├── addressingPipelines.ts # Addressing pipeline builders
│   ├── steps.ts               # Step library (pure addressing primitives)
│   │
│   │  ── Supporting infrastructure ──
│   ├── loweredAsmTypes.ts     # Lowered-ASM IR types
│   ├── loweredAsmByteEmission.ts # Lowered-ASM → bytes
│   ├── loweredAsmPlacement.ts # Lowered-ASM placement
│   ├── loweredAsmStreamRecording.ts # Stream recording
│   ├── loweringTypes.ts       # Shared lowering types (Callable, PendingSymbol, …)
│   ├── loweringDiagnostics.ts # Lowering diag helpers
│   ├── typeResolution.ts      # Type-resolution shim
│   ├── fixupEmission.ts       # Fixup queue management
│   ├── emissionCore.ts        # Core emission helpers
│   ├── emitStepImports.ts     # Step-instruction import handling
│   ├── runtimeAtomBudget.ts   # Runtime atom budget enforcement
│   ├── runtimeImmediates.ts   # Runtime immediate handling
│   ├── capabilities.ts        # Capability checking
│   ├── startupInit.ts         # Startup initialisation helpers
│   ├── inputAssets.ts         # bin/hex asset loading
│   ├── sectionContributions.ts # Named-section contribution sinks
│   ├── sectionLayout.ts       # Section layout management
│   ├── sectionPlacement.ts    # Section placement and addressing
│   ├── scalarWordAccessors.ts # Scalar word accessor helpers
│   └── traceFormat.ts         # Debug trace formatting
│
├── z80/                       # Z80 instruction encoding
│   ├── encode.ts              # Top-level encoder dispatcher
│   ├── encoderRegistry.ts     # Encoder family registry
│   ├── encodeCoreOps.ts       # Core instructions (nop, halt, …)
│   ├── encodeAlu.ts           # ALU family (add, sub, …)
│   ├── encodeBitOps.ts        # Bit operations (bit, set, res, rl, rr, …)
│   ├── encodeControl.ts       # Control flow (jp, jr, call, ret, djnz)
│   ├── encodeIo.ts            # I/O (in, out, im, rst)
│   └── encodeLd.ts            # Load instruction encoding (complex)
│
└── formats/                   # Output artifact writers
    ├── index.ts               # Re-exports
    ├── types.ts               # EmittedByteMap, SymbolEntry, Artifact types
    ├── range.ts               # Address range utilities
    ├── writeHex.ts            # Intel HEX writer
    ├── writeBin.ts            # Flat binary writer
    ├── writeD8m.ts            # D8 Debug Map JSON writer
    ├── writeListing.ts        # Listing file writer
    └── writeAsm80.ts          # Lowered ASM source writer

test/
├── language-tour/             # End-to-end ZAX programs (golden tests)
├── frontend/                  # Parser unit tests
├── lowering/                  # Lowering unit/integration tests
├── backend/                   # Encoding tests
├── helpers/                   # Shared test utilities
└── pr<NNN>_*.test.ts          # Feature regression tests (one per PR)
```

---

---

[← What ZAX Is](01-what-zax-is.md) | [Part I](index.md) | [The Compilation Pipeline →](03-the-compilation-pipeline.md)
