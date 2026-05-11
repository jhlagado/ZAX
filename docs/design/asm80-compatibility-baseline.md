# ASM80 compatibility baseline

Status: baseline policy for the ASM80-first ZAX track
Date: 2026-05-10

## Purpose

ZAX should become the assembler used for Z80 assembly source in this toolchain.
That means `.asm`, `.z80`, and later ZAX-extended assembler files should be
compiled by ZAX, with ASM80 kept around only as the compatibility reference and
fallback during migration.

This document fixes the intended compatibility level. ZAX is not trying to
become a complete ASM80 clone. The target is a deliberate, documented subset:
the ordinary ASM80-style Z80 assembler surface used by the MON3 codebase, plus
a small number of nearby directives that are useful for handwritten Z80 source.

## Compatibility contract

The first stable compatibility contract is:

- ZAX accepts the ASM80-style syntax required by the recursive MON3 build path.
- ZAX emits byte-equivalent output for MON3, or records any intentional
  difference as a compatibility exception.
- ZAX keeps the current structured ZAX compiler line available while this track
  is proven.
- ZAX prefers ASM80 spelling for raw assembler concepts where ZAX already has
  overlapping syntax.
- ZAX extensions are added above this assembler baseline, not instead of it.

The compatibility contract is intentionally smaller than full ASM80.

## Primary corpus

The baseline corpus is the recursive MON3 source tree reached from:

- `/Users/johnhardy/Documents/projects/MON3/src/mon3.z80`

The recursive include set currently contains:

- `/Users/johnhardy/Documents/projects/MON3/src/mon3.z80`
- `/Users/johnhardy/Documents/projects/MON3/src/packages.z80`
- `/Users/johnhardy/Documents/projects/MON3/src/glcd_library.z80`
- `/Users/johnhardy/Documents/projects/MON3/src/disassembler.z80`
- `/Users/johnhardy/Documents/projects/MON3/src/sound.z80`
- `/Users/johnhardy/Documents/projects/MON3/src/pata_fat32.z80`
- `/Users/johnhardy/Documents/projects/MON3/src/rtc.z80`

The adjacent file
`/Users/johnhardy/Documents/projects/MON3/src/api_includes.z80` is a useful
secondary sample, but it is not part of the recursive `mon3.z80` build path at
the time this baseline was written.

The primary corpus is large enough to define the first practical subset:
10,865 lines on the recursive build path, with normal labels, equates, raw
data, includes, expressions, placement, and a broad set of Z80 opcodes.

## Required syntax

The first compatibility level requires:

- ordinary labels with colons
- label plus statement on the same line
- bare-label `.equ` and colon-label `.equ`
- `.org`
- `.include "file"` with paths relative to the including file
- `.db` with expressions and double-quoted string fragments
- `.dw` with expressions and symbol fixups
- `.end`
- `.binfrom`
- ASM80 trailing-base literals such as `0FFH`, `0101b`, and `10101010B`
- the ambiguity rule that `FFH` is a symbol candidate, while `0FFH` is numeric
- uppercase and lowercase trailing-base suffixes
- current-location expressions using `$`
- one-character string values in expressions
- ordinary Z80 instruction syntax used by MON3

Early compatibility additions that are already useful even when not required by
MON3:

- `.ds`
- `.align`
- `.cstr`
- `.pstr`
- `.istr`

Those additions are still assembler-level features and should use the ASM80
spelling in new documentation and examples.

## Explicit non-goals

The baseline does not include the full ASM80 language.

Do not implement these for the first compatibility level:

- `.macro`
- `.rept`
- `.endm`
- `.block`
- `.endblock`
- text-substitution macro semantics
- non-Z80 processor compatibility
- broad ASM80 directive coverage not used by MON3 or selected follow-up samples
- VS Code extension work or LSP/language-server integration
- Debug80 workflow integration beyond compatibility reference checks

Macros are deliberately out of scope. They are not used by MON3, they are not
the common subset this project is targeting, and they conflict with the
long-term direction of using ZAX's higher-level facilities, including OPS, for
more powerful and safer abstraction.

Deferred features should only move into scope when a real source corpus needs
them and they do not undermine the assembler-first ZAX direction.

## Syntax convergence

Where ZAX and ASM80 already cover the same raw assembler concept, prefer the
ASM80 spelling for the assembler-facing surface:

| Concept | Preferred assembler spelling |
|---|---|
| source inclusion | `.include "file"` |
| raw equate | `NAME: .equ expr` or `NAME .equ expr` |
| placement | `.org expr` |
| raw bytes | `.db expr, ...` |
| raw words | `.dw expr, ...` |
| reserve bytes | `.ds size` |
| alignment | `.align expr` |
| C string | `.cstr "text"` |
| Pascal string | `.pstr "text"` |
| high-bit terminated string | `.istr "text"` |
| binary start | `.binfrom expr` |

This does not make every ZAX construct obsolete. `const` remains a clean
ZAX-level declaration, and typed storage, structured control, records, unions,
modules, OPS, and other higher-level features remain ZAX extensions.

The rule is narrower: raw assembler concepts should not force users to learn a
second ZAX spelling when the ASM80 spelling is already familiar and adequate.

## Current implementation status

As of the current ASM80-first PR, ZAX has a classic source path for the first
slice of this baseline:

- `.z80` and `.asm` source-mode inference
- classic line/module parsing
- trailing `H` and `B` numeric literal parsing with the leading-digit ambiguity
  rule
- `.equ`
- `.org`
- `.include`
- `.db`, `.dw`, and `.ds`
- `.align`
- `.cstr`, `.pstr`, and `.istr`
- `.binfrom`
- `.end`
- lowered ASM80 artifact emission for recorded classic items
- focused MON3 opcode-gap audit showing no unsupported encoder forms in the
  current recursive MON3 corpus

The remaining baseline work is to harden acceptance around the full MON3 build:

- keep the opt-in MON3 byte comparison tied to a fresh ASM80 build from the
  same source tree, not to the checked-in release binary; the release binary can
  carry patched metadata that differs from the published source
- make source-location diagnostics good enough for real MON3 failures
- keep expanding tests from real MON3 slices rather than synthetic syntax only
- decide how `.asm` and `.z80` are introduced into the wider Debug80 toolchain

## Acceptance threshold

The compatibility baseline is reached when:

1. The recursive MON3 source tree loads in classic ASM80 mode.
2. All required baseline syntax parses without hand translation.
3. All MON3-required expressions and fixups resolve correctly.
4. ZAX emits a binary matching the ASM80-built MON3 reference, or documents each
   intentional difference.
5. The classic path can emit useful diagnostics and an ASM80 artifact.
6. Existing `.zax` behavior remains intact.

At that point, ZAX can be treated as a credible replacement candidate for
ASM80 in this toolchain, while ASM80 remains available as a fallback until
Debug80 integration and downstream workflows are updated.
