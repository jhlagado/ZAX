# Codegen Corpus (Curated Inspection Set)

This folder is the committed inspection mirror for the curated codegen corpus.

The supported workflow is defined in:

- `docs/codegen-corpus-workflow.md`

The manifest for the curated set is:

- `test/fixtures/corpus/manifest.json`

The manifest uses explicit mixed-source entries. It does not assume one source
folder for every curated case.

## Ownership

Canonical ownership is split:

- curated source inputs: the explicit `source` paths listed in the manifest
- automated golden traces: `test/fixtures/corpus/golden/*.asm`
- automated expected opcodes: `test/fixtures/corpus/opcode_expected/*.hex`

This folder is the side-by-side review mirror:

- `examples/codegen-corpus/*.zax`
- `examples/codegen-corpus/*.asm`
- `examples/codegen-corpus/*.bin`
- `examples/codegen-corpus/*.hex`

## Supported regeneration

Use exactly:

```bash
npm run regen:codegen-corpus
```

Do not regenerate curated files one by one by hand.

## Current curated set

Read `test/fixtures/corpus/manifest.json` for the supported list.

For future expansion, prefer `examples/language-tour/30+` for addressing/codegen
cases and use this folder for synthetic non-teaching cases.
