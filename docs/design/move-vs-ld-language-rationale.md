# `move` vs `ld` Language Rationale

**Date:** 2026-03-13
**Status:** Draft discussion paper
**Source:** Post-`LANG-02` language-boundary review

This document is a staged discussion paper. It is intended to be built section
by section and reviewed incrementally.

## Contents

1. [Why this question exists](#1-why-this-question-exists)
2. [Exact semantic split between `move` and `ld`](#2-exact-semantic-split-between-move-and-ld)
3. [Source compatibility and migration impact](#3-source-compatibility-and-migration-impact)
4. [Grammar impact](#4-grammar-impact)
5. [Examples rewritten both ways](#5-examples-rewritten-both-ways)
6. [Implications for raw label and data directives](#6-implications-for-raw-label-and-data-directives)
7. [Staged implementation plan](#7-staged-implementation-plan)

---

## 1. Why this question exists

ZAX currently mixes two different language models inside the same source-level
instruction spelling.

On one side, ZAX has a typed variable model:

- globals, arguments, and locals behave like named storage values
- bare scalar names use value semantics
- field access and indexing are expressed as typed storage paths
- the programmer writes in a style closer to Pascal or C than to classic
  assembler

On the other side, ZAX also inherits the traditional Z80 instruction set, where
mnemonics such as `ld` have long-established operand expectations rooted in
classic assembler practice:

- symbols commonly denote addresses
- parentheses indicate memory dereference
- the instruction spelling itself belongs to the raw machine-language layer

Those two models are not naturally the same thing. ZAX has nevertheless allowed
the typed-storage model to live inside `ld`, which means that one of the most
recognizable Z80 mnemonics no longer behaves purely like a Z80 mnemonic.

That tension is not theoretical. It appears directly in the source language.

Classic assembler expectations suggest a distinction like this:

```z80
ld a, x
ld a, (x)
```

where `x` is an address-like symbol and the difference between the two forms is
part of the assembler's basic memory model.

Current ZAX, by contrast, treats typed storage names very differently:

```zax
ld a, x
ld x, a
ld hl, words[idx]
ld words[idx], hl
```

Here, the bare storage path is not an address-like symbol. It is a value- or
storage-oriented language construct. The compiler interprets it using typed
storage semantics, frame layout, array stride, field offsets, and register- or
scalar-based indexing rules. That is useful, but it means `ld` is no longer
just the classic `ld`.

This matters because `ld` is not merely another instruction. It is the central
data-movement mnemonic in the language, and it is also the place where most of
the typed storage-path surface has accumulated. Other Z80 mnemonics such as
`add`, `sub`, `adc`, and `sbc` do not participate in the same broad storage
path language. They remain much closer to classic Z80 operand rules. So the
problem is not that all Z80 mnemonics have been reinterpreted equally. The
problem is that `ld` has become a special hybrid.

That hybrid has practical costs.

It obscures the boundary between:

- raw assembler semantics
- typed variable semantics

It makes `ld` carry language responsibility that arguably belongs at the ZAX
layer rather than the Z80 layer.

It also complicates future work around raw labels, raw data-layout directives,
and traditional address-valued symbols. As soon as the language wants both:

- typed variables with value semantics
- labels with classic address semantics

the overloading inside `ld` becomes harder to defend cleanly.

The core design question, then, is not merely whether a new builtin such as
`move` would be convenient. The deeper question is whether ZAX wants to keep
overloading a standard Z80 mnemonic with language-level variable semantics, or
whether it wants to make the layer boundary explicit:

- `ld` for classic assembler-style semantics
- `move` (or equivalent) for ZAX variable/storage semantics

This document exists because that boundary is a language-identity decision, not
just an implementation detail.

---

## 2. Exact semantic split between `move` and `ld`

If ZAX adopts `move`, the language needs a hard semantic boundary between the
two instructions. Without that, the change would only rename the current
ambiguity.

The proposed split is this:

- `ld` belongs to the raw assembler layer
- `move` belongs to the ZAX typed-storage layer

That statement must hold both in user expectation and in compiler behavior.

### `ld`: raw assembler semantics

`ld` should follow classic assembler-style operand meaning as closely as ZAX can
support it.

That means `ld` should be used for:

- register-to-register transfers
- register-to-immediate transfers
- classic address-like symbols
- classic parenthesized memory forms
- ordinary machine-facing memory traffic

Under this model, if a symbol is a raw label, then `ld` treats it as an
address-valued symbol in the classic sense. If parentheses are present, that
means memory at that address. If parentheses are absent, that means the address
or immediate form allowed by the instruction.

So the intended reading becomes:

```z80
ld a, x
ld a, (x)
ld hl, x
ld hl, (x)
```

with `x` interpreted according to traditional assembler address semantics,
subject to whatever subset of classic forms ZAX chooses to support.

The important point is that `ld` should no longer be responsible for interpreting:

- typed globals as value objects
- frame variables as value objects
- record fields as typed storage-path syntax
- array indexing over typed storage

Those are not raw assembler semantics. They belong to the higher ZAX layer.

### `move`: typed variable/storage semantics

`move` should be the builtin that handles the current value-oriented storage
model.

That means `move` is responsible for:

- typed globals
- arguments and locals
- frame-based scalar storage
- record field selection
- typed array indexing
- runtime indexing from registers, scalar names, globals, and frame variables
- typed load/store behavior over those storage paths

So the intended reading becomes:

```zax
move a, x
move x, a
move hl, words[idx]
move words[idx], hl
move a, sprite.flags
move sprites[c].x, a
```

Here, the operands are not raw assembler operands. They are ZAX storage-path
operands. Bare names use variable value semantics. Field and index syntax are
typed-language constructs, not classic label syntax.

### The declaration-driven symbol split

This model only works if symbol kind is explicit.

A name must resolve first to a declaration class before operand meaning is
chosen. In practical terms:

- typed storage declarations create value-semantics symbols
- code labels create address-semantics symbols
- raw data-layout declarations create address-semantics symbols

Then instruction meaning is straightforward:

- `move` consumes value/storage symbols and typed storage paths
- `ld` consumes classic assembler operands and raw labels

This prevents the language from having to guess whether `x` is "a variable" or
"an address". The declaration form decides it.

### Register operands are not typed storage

Registers are a third operand category. They are neither typed storage symbols
nor raw labels.

So the intended split is narrower than "use `move` for everything value-like".
The cleaner rule is:

- `move` is for transfers between a register and a typed storage path
- `ld` remains the raw Z80 form for register-to-register transfer and classic
  assembler memory/address transfer

That means forms such as:

```z80
ld a, b
ld hl, de
```

remain ordinary `ld`.

And it also means the valid `move` family is intentionally constrained:

```zax
move a, x
move x, a
move hl, words[idx]
move words[idx], hl
```

where exactly one side is a register operand and exactly one side is a typed
storage-path operand.

So:

- both-register `move` is invalid
- both-storage-path `move` is invalid

In practical terms, a direct typed-storage copy such as `move x, y` is also
invalid; the transfer must go through a register, which matches the underlying
Z80 execution model.

### What this means for existing typed `ld`

Current ZAX effectively allows `ld` to act like `move` in many places. Under
the proposed split, that behavior becomes transitional or is eventually removed.

That means these current forms are reclassified:

```zax
ld a, x
ld x, a
ld hl, words[idx]
ld words[idx], hl
```

If `x` and `words` are typed storage, these are no longer true `ld` forms in
the long-term model. They become `move` forms.

The clean long-term reading is:

```zax
move a, x
move x, a
move hl, words[idx]
move words[idx], hl
```

while `ld` remains available for the raw assembler layer.

### `LANG-02` as direct precedent

`LANG-02` makes the current tension especially visible.

Current ZAX now supports forms such as:

```zax
ld a, <Sprite>hl.flags
ld <Sprite>hl.flags, a
```

These are plainly ZAX-layer constructs:

- typed reinterpretation head
- field traversal
- compiler-managed offset semantics

They are not classic Z80 operand forms in any meaningful sense. If the project
is uncomfortable continuing to hide such forms inside `ld`, then `LANG-02` is
one of the clearest concrete arguments for the `move` proposal.

Under the proposed split, these become:

```zax
move a, <Sprite>hl.flags
move <Sprite>hl.flags, a
```

which makes the layer boundary explicit rather than implied.

### Why this split is worth considering

This is not just a naming preference.

It would give ZAX a more honest two-layer structure:

- machine-like operations keep machine-like semantics
- language-level variable access uses language-level syntax

That reduces the conceptual burden on `ld`, makes future raw-label work easier
to specify, and gives the typed variable model a builtin whose name does not
pretend to be unchanged Z80.

It is a major language change. But if the goal is to stop overloading a
standard Z80 mnemonic with non-Z80 storage semantics, this is the cleanest
split available.

---

## 3. Source compatibility and migration impact

The `move`/`ld` split is not a cosmetic refactor. It is a source-language
migration with broad consequences for examples, tests, user expectation, and
teaching material.

That migration cost is real, and it has to be evaluated honestly.

### What changes in user code

Any current source that uses `ld` with typed variable or typed storage-path
semantics would need to move to `move`.

That includes forms such as:

```zax
ld a, x
ld x, a
ld hl, words[idx]
ld words[idx], hl
ld a, sprite.flags
ld sprites[c].x, a
```

If `x`, `words`, or `sprite` are typed storage declarations, these would no
longer be written with `ld` in the long-term model.

They would become:

```zax
move a, x
move x, a
move hl, words[idx]
move words[idx], hl
move a, sprite.flags
move sprites[c].x, a
```

By contrast, classic raw assembler-style forms would remain `ld`:

```z80
ld a, label
ld a, (label)
ld hl, label
ld hl, (label)
```

assuming `label` is a raw address-semantics symbol rather than typed storage.

### What changes in examples and docs

The language-tour and quick-guide surface would need a deliberate rewrite.

Right now many examples teach typed storage access through `ld`. If the language
decides that `move` is the proper ZAX-layer builtin, then the teaching material
must follow that decision quickly and consistently. Otherwise the language will
have an official design split while still teaching the old spelling.

This matters especially in the addressing matrix examples, because those files
are where the language most clearly demonstrates:

- globals versus frame storage
- byte versus word access
- const / scalar / register indexing
- field and aggregate access

Those examples are effectively the user-facing contract for the feature.

### What changes in tests and corpus

The test impact is broader than the examples impact.

A move to `move` would likely require updates in:

- parser tests
- lowering tests
- language-tour source fixtures
- any corpus files intended to model canonical user-facing style

But not every existing test should be rewritten immediately.

Some tests should remain in the old spelling during a transition period if the
language chooses to support compatibility parsing or compatibility lowering.
That includes:

- regression tests for current `ld`-based typed access
- compatibility fixtures
- tests whose purpose is to lock current behavior while migration proceeds

So the migration plan must distinguish:

- canonical teaching surface
- compatibility surface
- historical/regression surface

If that distinction is not made explicitly, the repository will become
internally contradictory.

### The compatibility choices

There are three realistic migration strategies.

#### Option A — hard break

Typed variable/storage semantics move to `move`, and typed `ld` is removed
directly.

Advantages:

- cleanest language boundary
- shortest period of ambiguity
- fastest convergence of docs, examples, and implementation

Costs:

- largest immediate source break
- largest rewrite burden across examples and tests
- least forgiving for experiments during the transition

#### Option B — transitional aliasing

`move` is introduced as the new canonical spelling, but typed `ld` continues to
work temporarily as compatibility syntax.

Advantages:

- allows staged migration
- reduces immediate churn
- makes it possible to rewrite examples/docs first, then tighten the language

Costs:

- the language remains ambiguous for a while
- parser and docs must explain two forms for one semantic feature
- the old overloading remains alive longer than desired

#### Option C — implementation split first, source split later

Internally separate raw-label semantics from typed-storage semantics first, but
do not expose `move` immediately. Add `move` only once the implementation and
docs are ready.

Advantages:

- implementation can be stabilized before a public source transition
- lowers the risk of surface churn outrunning semantics

Costs:

- prolongs the period where `ld` still carries the wrong conceptual burden
- weakens the clarity gain that motivated the change

### The likely repository reality

This repository is still pre-1.0 and has no external user base to preserve. That
reduces the social cost of a hard or semi-hard transition.

But the repository does have internal cost:

- examples
- corpus files
- tests
- docs
- historical design notes

So even without external users, migration work is still substantial. The main
question is not "will users complain?" The main question is whether the project
wants to pay the internal rewrite cost now in exchange for a cleaner long-term
language.

### The real migration decision

The most important compatibility question is not mechanical replacement.

It is this:

> does the project want the current typed `ld` surface to survive as
> compatibility syntax for a while, or does it want to make a decisive language
> break?

That decision should be made explicitly before implementation starts.

If the answer is "decisive break", the language can move faster but must accept
large immediate source churn.

If the answer is "transitional aliasing", the language can migrate more gently,
but it must tolerate temporary duplication in docs, parser behavior, and test
coverage.

### Recommended migration stance

The paper does not recommend keeping all three migration strategies equally
open.

If the project chooses `move`, the most coherent stance is:

- introduce `move` decisively as the new canonical spelling
- keep typed `ld` only as an explicitly transitional compatibility form
- track that compatibility form with a named sunset issue
- do not let typed `ld` and `move` drift into indefinite equal status

In other words, the recommended path is:

- Option A in intent
- Option B in mechanics

That preserves a manageable transition while still treating the split as a real
language decision rather than an optional style preference.

---

## 4. Grammar impact

The `move`/`ld` split is not just a semantic cleanup. It has direct grammar
impact, because it changes where the language allows typed storage-path syntax
to appear.

That is important in the context of the grammar reform work. One of the
project's active goals is to reduce accidental special cases and make parser
structure follow explicit grammar categories rather than ad hoc branching. Any
`move` design has to be evaluated in that light.

### The current grammar pressure point

Today, the parser effectively allows `ld` to consume a richer operand language
than most other Z80 mnemonics. That richer operand language includes:

- bare typed storage names
- field selection
- array indexing
- nested typed storage paths
- runtime indexing from registers and scalar names

In practice, this means the grammar around `ld` is not simply "a Z80 mnemonic
with Z80 operands". It is closer to:

- a Z80 mnemonic
- plus a specialized typed storage-path grammar

That is one reason `ld` has become the pressure point for the language.

The current grammar also hides part of the implementation problem by treating
`z80_instruction` as an opaque parser category. In practice, typed `ld` forms
are being accepted through that opaque path today. A real `move` transition
would therefore require more than adding a new keyword. It would require
pulling the typed-storage operand family out of the current `ld` parsing path
and making it explicit.

### What `move` would do to the grammar

Introducing `move` would let the grammar express the language split directly.

Conceptually:

- `ld` would accept raw assembler operand forms
- `move` would accept typed storage-path operands

That is cleaner than having one mnemonic take both classes of operands.

In other words, the grammar would stop saying:

> one instruction spelling covers both raw machine operands and typed storage
> paths

and instead say:

> these are two different instruction families with different operand
> categories

That is exactly the kind of explicit categorization the parser reform has been
moving toward.

### Draft grammar sketch

At draft level, the grammar effect can be stated concretely:

```ebnf
instr_line = z80_instruction
           | move_stmt
           | op_invoke
           | func_call
           | ...

move_stmt  = "move" , move_lhs , "," , move_rhs ;
move_lhs   = reg8 | reg16 | typed_storage_path ;
move_rhs   = reg8 | reg16 | typed_storage_path ;
```

with the semantic restriction that exactly one side must be a register operand
and exactly one side must be a typed storage-path operand.

The point is not the exact final production wording. The point is that `move`
becomes a first-class grammar branch rather than remaining hidden inside the
current opaque `z80_instruction` path.

### Likely grammar categories

At a high level, this pushes the language toward three separate operand
categories:

1. raw assembler operands
2. typed storage-path operands
3. control-flow targets / label references

Those categories are already present conceptually. The problem is that they are
not always surfaced clearly in grammar and parser structure.

A `move` split would make category (2) explicit instead of hiding it behind
`ld`.

### Why this may simplify the parser

If the grammar distinguishes `move` from `ld`, then parser responsibility
becomes clearer:

- the `ld` parser path can stay closer to classic assembler operand forms
- the `move` parser path can use typed storage-path parsing intentionally

That should reduce one of the current sources of ambiguity: whether a given
operand form is being accepted because it is a classic assembler form or
because it is part of the typed-storage mini-language currently living under
`ld`.

This is not a claim that the parser instantly becomes trivial. `move` would
still need the full typed storage-path grammar. But that grammar would be
attached to the correct language-level builtin instead of being smuggled into a
Z80 mnemonic.

### Why this may complicate the grammar

There is also a real cost.

The language would now have two load/store families:

- `ld`
- `move`

So the grammar must define both cleanly, and the docs must explain both without
confusion. If transitional compatibility is retained, the grammar may also need
to accept old typed-`ld` forms temporarily, which would mean:

- a new explicit `move` grammar
- plus legacy typed-`ld` acceptance
- plus raw `ld` forms

That transitional period could be grammatically messier than the current state,
even if the end state is cleaner.

So grammar impact has to be considered in two phases:

- transitional grammar
- target grammar

The target grammar may be simpler. The transition grammar may be more complex.

### Interaction with symbol classes

This proposal also interacts directly with the future symbol-class split.

If the language adopts distinct symbol classes such as:

- typed storage symbol
- raw data label
- code label

then the grammar can stay relatively small while later semantic analysis
chooses meaning based on declaration class.

But if the grammar is expected to encode too much of that distinction directly,
it may become harder to maintain.

So the right division of labor is probably:

- grammar distinguishes instruction family and broad operand category
- semantic analysis resolves symbol class
- lowering applies the corresponding semantics

That division is consistent with the grammar reform direction.

### The key grammar question

The most important grammar question is not "can `move` be parsed?"

It obviously can.

The important question is:

> does introducing `move` reduce the long-term grammar burden by making operand
> categories explicit, or does it simply add a second spelling on top of the
> current ambiguity?

If `move` is adopted decisively, it should reduce grammar ambiguity.

If `move` is adopted weakly while old typed `ld` remains active for too long, it
may temporarily increase grammar complexity instead of reducing it.

That is why grammar impact cannot be separated from the migration strategy
described in the previous section.

---

## 5. Examples rewritten both ways

This section exists to make the tradeoff concrete. The `move` proposal should
not be judged only in abstract semantic language. It should be judged by how
real ZAX code reads before and after the split.

The goal here is not to prove one side by rhetoric. The goal is to expose where
the split improves clarity and where it adds cost.

### Example A — scalar global byte

Current style:

```zax
ld a, flag
ld flag, a
```

Proposed split:

```zax
move a, flag
move flag, a
```

What changes:

This is the smallest and most direct case. The current spelling is compact and
familiar. The proposed spelling is more explicit about the fact that `flag` is
a typed storage object, not a raw assembler label.

This example is important because it shows the cost of the proposal most
clearly. If the language adopts `move`, then even the simplest scalar variable
access changes spelling.

### Example B — local/frame scalar

Current style:

```zax
func bump()
  var x: byte
  ld a, x
  inc a
  ld x, a
end
```

Proposed split:

```zax
func bump()
  var x: byte
  move a, x
  inc a
  move x, a
end
```

What changes:

This case makes the layer distinction easier to defend. A frame variable is not
a classic assembler label in any meaningful sense. Treating it through `move`
is conceptually cleaner than pretending raw `ld` is still unchanged here.

### Example C — indexed byte array

Current style:

```zax
ld a, bytes[c]
ld bytes[c], a
```

Proposed split:

```zax
move a, bytes[c]
move bytes[c], a
```

What changes:

This is one of the strongest arguments for `move`. `bytes[c]` is a typed
storage path with runtime indexing. It is not a classic raw assembler operand.
The proposed spelling makes that fact visible.

### Example D — indexed word array

Current style:

```zax
ld hl, words[idx]
ld words[idx], hl
```

Proposed split:

```zax
move hl, words[idx]
move words[idx], hl
```

What changes:

This is the core example for the proposal. It exposes the fact that current
ZAX lets a standard Z80 mnemonic carry a substantial typed storage-path
language. Under the split, the typed semantics are still available, but they
are no longer hidden inside `ld`.

### Example E — record field access

Current style:

```zax
ld a, sprite.flags
ld sprite.flags, a
ld hl, sprite.position
```

Proposed split:

```zax
move a, sprite.flags
move sprite.flags, a
move hl, sprite.position
```

What changes:

Again, the difference is not in capability but in layer ownership. Record field
access is clearly a language-level storage feature. The proposed spelling says
so.

### Example F — raw label semantics

Current style in a more classic assembler-oriented world:

```z80
ld a, (table)
ld hl, table
ld hl, (table)
```

Under the proposed split, these remain `ld`:

```z80
ld a, (table)
ld hl, table
ld hl, (table)
```

What changes:

Nothing at the source level. That is the point. The raw assembler layer stays
raw. The proposal does not rename classic `ld`; it removes typed variable
semantics from it.

### Example G — mixed code showing the layer boundary

Current style:

```zax
ld hl, jump_table
ld a, state
ld hl, words[idx]
ld sprite.flags, a
```

Proposed split:

```zax
ld hl, jump_table
move a, state
move hl, words[idx]
move sprite.flags, a
```

What changes:

This is probably the most important reading test.

In the proposed version, the language boundary is visible in the code:

- `ld hl, jump_table` is raw label/address work
- `move a, state` is typed storage value access
- `move hl, words[idx]` is typed indexed access
- `move sprite.flags, a` is typed field store

That makes the program read as two layers instead of one overloaded mnemonic.

### Example H — `op` call site versus `op` body

One subtle but important distinction is the difference between:

- the source-language call site
- the raw instruction body of an `op`

At the call site, typed storage belongs in the ZAX layer:

```zax
move a, sprite.flags
```

But inside an `op` body, raw instruction text remains raw:

```zax
op copy_a_to_hl_byte()
  ld (hl), a
end
```

That means the proposal is not saying "replace `ld` everywhere". It is saying:

- use `move` where the source language is expressing typed variable/storage
  access
- keep `ld` inside raw instruction bodies and other raw assembler contexts

This matters because `op` bodies are already one of the places where ZAX
maintains a cleaner layer boundary today.

### What these examples show

The examples expose both the gain and the cost.

The gain is conceptual honesty. Typed storage access no longer pretends to be a
plain Z80 mnemonic use.

The cost is pervasive spelling churn. Even simple scalar variable accesses
change. That is why this proposal should not be treated as a trivial syntax
cleanup. It is a deliberate language re-centering.

### What the examples do not yet settle

These examples show the surface-language effect. They do not yet answer:

- whether migration should be immediate or transitional
- whether `move` should be builtin permanently or later become expressible as a
  user-space abstraction
- how raw data-layout declarations should be introduced
- how much compatibility syntax the parser should retain during transition

Those questions are implementation- and policy-level follow-ons. The examples
are here to make the source-language stakes concrete before those later choices
are made.

---

## 6. Implications for raw label and data directives

The `move`/`ld` split is not only about instruction spelling. It also pushes
ZAX toward a clearer answer to a question the language has so far only partly
addressed:

> does ZAX want a first-class raw data and raw label model, distinct from typed
> storage?

If the answer is yes, then `move` and `ld` stop being only a stylistic choice.
They become the instruction-level expression of a deeper symbol split:

- typed storage symbols
- raw address symbols

That is why data directives such as `DB`, `DW`, and `DS` matter here.

### What typed storage already does well

ZAX's typed storage model is already good at:

- named globals
- arguments and locals
- field layout
- array indexing
- typed storage-path access

This is the "variable" side of the language. It is structured, type-aware, and
value-oriented.

It works well for code that thinks in terms of:

- state variables
- typed records
- arrays of elements
- frame-based program values

### What typed storage does not fully cover

Classic assemblers also support a different style of memory authoring:

- raw byte tables
- raw word tables
- reserved storage blocks
- packed binary layouts
- jump tables
- command tables
- irregular blobs
- patch areas
- hardware-facing layouts that are easier to express as raw bytes than as typed
  variables

This is where directives like `DB`, `DW`, and `DS` traditionally live.

Typed reinterpretation and typed casts do not solve that problem. They help the
programmer *read through* an address as a type. They do not by themselves give
the language a clean way to *define* raw address-semantics data in the first
place.

So if ZAX wants `ld` to return to classic assembler semantics, the language
 likely also needs a real raw-data declaration story.

### The symbol-class consequence

Once raw data directives exist, their labels should not behave like typed
globals.

That is the crucial point.

A symbol introduced by a typed storage declaration should keep value semantics.
A symbol introduced by a raw data-layout directive should have address
 semantics.

That means:

- typed global `counter` behaves like a variable
- raw label `table` behaves like an address

Then the instruction split becomes natural:

- `move a, counter`
- `ld hl, table`
- `ld a, (table)`

This is cleaner than asking one declaration model to serve both jobs.

### The syntax question

There are several possible syntactic paths for raw data directives:

- classic uppercase assembler-style directives such as `DB`, `DW`, `DS`
- lowercase equivalents
- a more ZAX-shaped declaration spelling that still creates raw-label symbols

This document does not choose among them yet.

The important design point at this stage is not exact directive spelling. It is
that the language should have an explicit declaration family whose symbols are
address-semantics symbols rather than value-semantics variables.

### Why this matters for `ld`

Without raw data directives, restoring `ld` to classic semantics is only half a
solution. The instruction would be cleaner, but the language would still lack
a good way to define many of the raw address-based objects that assembler
programmers routinely use.

With raw data directives, the model becomes much more coherent:

- typed storage declarations support `move`
- raw data declarations support `ld`
- code labels continue to support jumps/calls and other address-oriented uses

That is a language with a real two-layer memory model instead of a single
 overloaded one.

### Relationship to grammar reform

This also reinforces the parser/grammar convergence agenda.

Raw data directives should not just be treated as a few extra parser cases. They
should introduce explicit AST and symbol classes, because their semantic role
is different from typed storage declarations.

So the right long-term framing is:

- typed storage declarations create value-semantics symbols
- raw data-layout declarations create address-semantics symbols
- instruction families consume those symbol classes differently

That is a better grammar and semantics story than continuing to hide everything
 under one overloaded `ld`.

### Practical implication

If the project adopts `move`, then raw data directives are not a side topic.
They become part of the same reform family.

The sequence does not have to be simultaneous. `move` could be specified first,
and raw data directives could follow. But the design should acknowledge from the
start that the two ideas belong together.

Otherwise the project risks solving only half the problem:

- making typed variable access more explicit
- while still leaving raw address-based data without a first-class model

---

## 7. Staged implementation plan

If the project chooses the `move` direction, implementation should be staged
deliberately. This is not a feature to "just add". It affects parser
categories, symbol meaning, examples, docs, and eventually raw data semantics.

The safest path is to separate:

- decision work
- semantic groundwork
- source-surface transition
- later cleanup

### Stage 0 — decision lock

Before code changes, the project should explicitly decide:

- whether `move` is the chosen direction at all
- whether migration will be hard-break or transitional
- whether raw data directives are part of the same planned stream or a later
  dependent stream

This should result in:

- a reviewed design decision
- a migration stance
- a backlog umbrella with sequenced issues

No implementation work should begin until those points are settled. Otherwise
the project risks repeating the earlier `addr` problem: implementation landing
before the language boundary is actually stable.

### Stage 1 — semantic and grammar groundwork

The first implementation stage should not be "replace all `ld` with `move`".

It should be the groundwork that makes the split principled:

- identify the exact typed-storage operand family now living under `ld`
- identify the exact raw-assembler operand family that should remain under `ld`
- formalize symbol-class distinctions in parser/semantic design:
  - typed storage symbol
  - code label
  - future raw data label

This stage may include:

- grammar notes
- parser/AST preparation
- semantic resolution planning

but should avoid premature surface churn.

### Stage 2 — introduce `move` as a builtin

Once the semantic boundary is clear, add `move` as a builtin instruction family
for typed storage semantics.

At this stage:

- `move` should support the typed storage-path forms that are currently accepted
  under typed `ld`
- `ld` should remain unchanged unless a compatibility decision has already been
  made

This stage is about proving that `move` can carry the intended typed-storage
 surface cleanly. It is not yet about full retirement of old forms.

### Stage 3 — documentation and example migration

Before tightening compatibility, the public-facing material must move first.

That means updating:

- quick guide
- language-tour examples
- any canonical tutorial examples
- reference text that teaches typed variable access through `ld`

This stage is essential. If the language wants `move` to be the user-facing
 truth, the docs and examples must demonstrate it before the old spelling is
 removed or deprecated.

This is also the point where the project should decide which tests and fixtures
 are:

- canonical user-facing examples
- compatibility fixtures
- historical/regression coverage

That split should be made consciously.

### Stage 4 — compatibility tightening

Only after `move` is implemented and taught should the language decide what to
 do with typed `ld`.

At this stage, the project chooses one of two paths:

- keep typed `ld` as a temporary compatibility layer with clear warning and
  sunset intent
- remove typed `ld` directly and accept the source break

If compatibility is retained, it should be explicitly transitional and tracked
 with a retirement issue. The language should not drift into indefinitely
 supporting two first-class spellings for the same semantics without saying so.

### Stage 5 — raw data / raw label completion

Once `move` and `ld` have distinct roles, the remaining half of the design can
 be completed by introducing a first-class raw data declaration family.

This is where the language would address:

- raw data labels
- raw storage blocks
- classic address-oriented assembler data authoring

This stage is intentionally later because it depends on the earlier semantic
 split being credible first.

### Stage 6 — cleanup and simplification

After the transition stabilizes, the project can clean up the language and
 implementation:

- archive superseded design docs
- simplify parser paths that existed only for transition
- shrink compatibility surface if retirement was chosen
- align spec, grammar, reference docs, and examples to a single mature model

This is also the point where the project can reassess whether any remaining
 special cases under `ld` still belong there.

### Recommended practical order

The minimum pragmatic order is:

1. decide the direction
2. define the exact semantic split
3. introduce `move`
4. migrate docs/examples
5. decide typed-`ld` compatibility or retirement
6. add raw data directives later as the address-semantics complement

That order keeps the language from being redesigned in two incompatible halves.

### What should not happen

The project should avoid these failure modes:

- adding `move` without deciding what happens to typed `ld`
- rewriting examples before the builtin actually exists
- introducing raw data labels before symbol-class semantics are clear
- leaving `ld` and `move` both as indefinite equal first-class spellings
- treating the change as a parser tweak rather than a language-boundary reform

The central discipline is simple:

first settle the language boundary, then implement it in stages, then tighten
 compatibility only after the new model is real and taught.
