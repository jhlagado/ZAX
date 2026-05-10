# ASM80-first language track

Status: accepted direction after the 0.3.0 release line

## Purpose

ZAX 0.3.0 marks the current mature structured-assembler implementation as a
working baseline. The next language-design track should be reversible: if the
ASM80-first direction does not prove useful, development can return to the
0.3.0 line without losing a stable assembler.

The goal is not to throw away the existing compiler. The goal is to build from
the working codebase while making the source language feel like an assembler
first. Advanced ZAX features remain valuable, but they should be reintroduced
above a classic Z80 assembler surface instead of being required at the entry
point.

The long-term goal is for ZAX to replace ASM80 in the Z80 toolchain. During the
migration, ASM80 remains the reference assembler and fallback, but the intended
destination is that `.asm`, `.z80`, and ZAX-extended assembler source are all
compiled by ZAX.

## Baseline rule

The initial compatibility target is a stripped-down assembler-facing ZAX:

- Z80 instructions
- labels
- `call`, `jp`, `jr`, `djnz`, `ret`, and ordinary subroutine structure
- constants/equates
- origin/location control
- raw data directives
- comments
- includes
- output-range directives needed by the chosen corpus

For this track, functions, OPS, typed globals, records, unions, modules, and
structured control flow are existing ZAX features but not the first thing to
design around. They should stay available in the implementation until there is a
reason to gate or reshape them, but the acceptance target is classic assembler
source first.

The compatibility target is not full ASM80. It is the documented subset in
`docs/design/asm80-compatibility-baseline.md`.

## First corpus

Use the TEC-1G MON3 source as the first real ASM80-style corpus:

- `/Users/johnhardy/Documents/projects/MON3/src/mon3.z80`
- related Debug80 MON3 bundles and examples as secondary checks

The MON3 source shows the first syntax pressure points:

- dot directives such as `.equ` and `.org`
- trailing-`H` hexadecimal literals such as `00H`, `0DH`, and `0C000H`
- label/equate forms with and without a colon before `.equ`
- ordinary Z80 instruction streams
- semicolon comments
- address expressions such as `STACK_TOP+32`

The first useful milestone is not "support all ASM80". It is "assemble the MON3
subset without translating it by hand".

## Staged plan

1. Freeze and tag the current ZAX line as the fallback point.
2. Build an ASM80 grammar audit from MON3 and a small number of Debug80 examples.
3. Add parser support for the smallest assembler subset needed by that corpus.
4. Keep the AST/lowering boundary close to the existing implementation.
5. Add fixture tests that compile ASM80-style source and compare emitted bytes.
6. Reintroduce ZAX features one layer at a time: typed globals, then structured
   control, then functions, then OPS abstractions.

## Non-goals for the first milestone

- ASM80 macro-system compatibility
- `.macro`, `.rept`, `.endm`, `.block`, and `.endblock`
- non-Z80 processor support
- broad ASM80 directive compatibility before a real corpus requires it
- full segment-system compatibility before the chosen corpus requires it
- replacing labels and `call` with `func`
- changing `ld` back into typed-storage transfer
- VS Code extension work or LSP/language-server integration

ASM80's text macro system is deliberately out of scope. MON3 does not use it,
it is not part of the common subset being targeted, and ZAX should grow in the
direction of safer higher-level features such as OPS rather than carrying a
primitive text-substitution system for compatibility alone.

Typed ZAX storage remains a value-level feature. Raw labels remain address-level
assembler symbols. That distinction is one of the strongest parts of the
current implementation and should survive this language-track change.
