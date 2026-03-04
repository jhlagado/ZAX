# ZAX v0.5 Planning Track

This document converts `docs/modules.md` into an implementation plan.

`docs/modules.md` is the design anchor. This file defines execution order,
staging rules, and explicit non-goals.

## 1. v0.5 Scope

v0.5 is the module-and-layout redesign cycle.

The purpose of v0.5 is to replace the current global section-counter model with
a deterministic module system built around:

- named section contributions
- anchors
- deterministic merge by section key
- module-scope imports
- explicit exports and qualified names
- unified data declaration semantics

The initial v0.5 implementation is **non-banked**. Banking remains future
direction only.

## 2. Design Decisions Already Accepted

These are treated as settled unless deliberately revised:

- Imports occur only at module scope.
- Import does two things:
  - makes exported symbols visible
  - registers imported section contributions for merging
- Import does not imply textual inclusion or location-based placement.
- Sections are placement constructs, not scope constructs.
- Named merging is based on section keys.
- Anchors define physical placement.
- Missing anchors, duplicate anchors, overflow, and overlap are fatal.
- Duplicate imports are suppressed by canonical module identity.

## 3. Explicit v0.5 Non-Goals

The first v0.5 implementation does not include:

- banked section implementation
- multiple address spaces beyond the current flat address model
- explicit ordering directives inside a section key
- optional section contributions
- final binary init-data format standardization beyond what is needed to make
  startup deterministic

## 4. Implementation Order

### Phase 1. Parser and AST scaffolding

Add syntax support for:

- `section <kind> <name> ... end`
- `section <kind> <name> at <address> [size <n> | end <address>] ... end`
- declarations inside sections
- module-scope imports only

Keep the current syntax working during transition:

- `globals ... end`
- `data ... end`
- current `section` / `align` directives

This phase adds representation, not full semantics.

### Phase 2. Non-banked section-key model

Implement non-banked section keys:

- `(kind, name)`

Add:

- section contribution collection
- anchor collection
- duplicate-anchor detection
- missing-anchor detection
- deterministic contribution ordering

Do not implement banking in this phase.

### Phase 3. Program layout engine

Replace the current active-counter section packing model with:

- contribution collection after import resolution
- one anchor per contributed key
- deterministic concatenation by import traversal order
- address assignment from anchor base plus cumulative offset
- overflow and overlap checks

This is the core layout change.

### Phase 4. Import and visibility model

Implement the new module model:

- imports register contributions
- imports expose exported names
- duplicate imports are suppressed once by canonical module identity
- imported names are qualified (`foo.bar`)

This phase must explicitly define and implement canonical module identity.

### Phase 5. Unified declaration semantics

Migrate the useful part of the old `sections-modules-design` direction into the
new model:

- variable declarations use direct declaration syntax inside `data` sections
- old `globals` / `data` blocks become legacy syntax
- no initializer means zero-initialized storage

This is where the earlier “merge `globals` and `data` semantics” work belongs.

One explicit rule must be enforced here:

- variable declarations in `code` sections are forbidden in the initial v0.5
  implementation

That avoids ambiguous “inline bytes vs runtime storage” semantics in the first
pass.

### Phase 6. Startup initialization

Implement deterministic runtime initialization for writable `data` sections:

- explicit initializer bytes copied to runtime location
- declarations without initializers are zero-filled

The compiler should emit the startup initialization routine automatically.

The exact binary placement convention for initializer bytes must be defined in
the implementation work for this phase.

### Phase 7. Migration and deprecation

After the new model works:

- deprecate old `globals ... end`
- deprecate old `data ... end`
- deprecate old active-counter section usage
- migrate examples and guides
- then remove the old forms

## 5. Required Clarifications Before Phase 6

The remaining design clarifications that must be resolved before startup
initialization is implemented are:

- writable-versus-read-only region classification for anchored `data` sections
- startup routine ownership and entry sequencing
- initializer-byte storage convention in the emitted binary

## 6. Practical Ticket Shape

The implementation should not be one monolithic feature branch.

Break it into:

1. parser/AST scaffolding
2. non-banked section-key collection
3. layout engine replacement
4. import/visibility and qualification
5. unified declarations and legacy coexistence
6. startup initialization
7. migration/deprecation

Each phase should land with focused tests before the next one starts.

## 7. Relationship to Other Docs

- `docs/zax-spec.md` remains normative until v0.5 work is implemented and
  adopted.
- `docs/modules.md` is the design anchor for this topic.
- This file is the implementation planning layer for that design.
