# ASM80 Tetro compatibility audit

Status: exploratory corpus, not yet part of the standing ASM80 baseline gate
Date: 2026-05-11

## Purpose

Tetro is a practical ASM80-style application corpus outside MON3. It is useful
for checking that ZAX can replace ASM80 for loadable Tech-1 programs without
expanding into full ASM80 compatibility.

This corpus does not change the baseline policy: ZAX remains macro-free for the
ASM80 compatibility track, and source files should be normalized rather than
adding low-value dialect aliases.

## Corpus

Default source:

- `/Users/johnhardy/Documents/projects/tetro/src/tetro.asm`

The source includes nested files under the Tetro source root, so any reference
comparison must copy or run against the whole source tree rather than only
sibling `.asm` files.

## Current result

The current compatibility result is byte-for-byte parity with ASM80 after
trimming the ASM80 reference binary to the populated listing range:

- populated range: `0x4000..0x4a5c`
- ZAX bytes: `2653`
- trimmed ASM80 bytes: `2653`
- first mismatch: none

Raw ASM80 output may be a full 64K image in this case, while ZAX emits the
loadable populated range. The comparable reference is therefore the ASM80
listing range, not the raw file length.

## Compatibility deltas

Tetro is the corpus that made reserve-only `DS` behavior a priority. ASM80 uses
`DS` to reserve address space; trailing reserved space does not necessarily
belong in the loadable binary. ZAX should match this behavior so RAM-loaded
applications do not grow because of uninitialized storage at the end of a
source file.

The corpus also exercises forward and compound `EQU` aliases in ordinary
operands and data directives.

## Gate

Tetro should stay opt-in for now:

```sh
ZAX_RUN_TETRO_ACCEPTANCE=1 npx vitest run test/asm80/tetro_acceptance.test.ts
```

Promotion into `npm run test:asm80:baseline` should be a deliberate decision,
not a side effect of exploratory compatibility work.
