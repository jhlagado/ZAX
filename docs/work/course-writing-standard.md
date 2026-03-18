# ZAX Course Writing Standard

Status: active editorial standard
Audience: writer, editor, reviewer, designer

## Purpose

This document defines the writing, editing, and review standard for
educational prose in the ZAX course materials.

It exists to prevent a predictable failure mode:

- vague, rhetorical, LLM-style prose that sounds intelligent but does not teach

The standard is intentionally strict. The writer is expected to use it as a
skeletal discipline and then produce clear, concrete prose on top of it.

## Non-negotiable rule

Every paragraph must measurably advance the target reader's understanding.

If a paragraph does not clearly do that, it should be:

- cut
- rewritten
- or moved

Do not keep prose because it sounds polished, balanced, philosophical, or
"nicely introductory." Keep it only if it helps the reader understand the
subject more clearly.

## Reader-first rule

Before writing any chapter or section, state:

1. who the reader is
2. what they already know
3. what they do not know yet
4. what they should understand by the end of the section

If these are not clear, stop and define them first.

The writer must never assume knowledge that the current volume has not earned.

## Mandatory drafting skeleton

Every chapter draft should be built from this skeleton:

1. chapter purpose
2. prerequisites
3. main concept sequence
4. example-bearing sections
5. chapter close

At minimum, the writer should be able to name:

- the exact concept each section introduces
- the exact file or code excerpt that carries it
- the exact understanding the reader should gain before moving on

If the writer cannot name those three things, the section is not ready.

## Allowed paragraph jobs

Every paragraph must have exactly one primary job.

Allowed jobs:

- define one concept
- distinguish two concepts the reader may confuse
- explain why a concept matters at this point
- walk through one concrete example
- state one rule the reader can apply
- connect the current section to the next step

If a paragraph is doing none of these, it is probably filler.

If it is trying to do several at once, it is probably muddy.

## Paragraph contract

A good paragraph should let a reviewer answer all of these quickly:

- what single thing is this paragraph trying to teach?
- what sentence does the real teaching work?
- what prior knowledge does it rely on?
- what would be lost if this paragraph were deleted?

If the answer to the last question is "not much," cut it.

## Banned prose patterns

The writer should treat the following as high-risk and usually unacceptable.

### 1. Negative-definition padding

Avoid paragraphs built around:

- "X is not Y"
- "X is not merely Y"
- "X is neither Y nor Z"

unless the contrast is immediately necessary and the reader already knows Y and
Z well enough for the contrast to teach something.

If the reader does not understand the negated thing, the paragraph teaches
nothing.

### 2. Empty rhetoric

Avoid words and phrases like:

- honest
- elegant
- powerful
- flexible
- expressive
- defensible
- robust
- natural
- clean

unless the next sentence proves the claim concretely in code or behaviour.

These words are not explanations.

### 3. Philosophy without operational payoff

Avoid abstract positioning that does not cash out in:

- a rule
- an example
- a code contrast
- a practical consequence

If it does not help the reader read or write code, it probably does not belong.

### 4. LLM balancing habits

Watch for this failure mode:

- sentence 1 says something
- sentence 2 softens it with vague contrast
- sentence 3 reframes it in broad general terms
- none of the three sentences actually teach anything

Cut this aggressively.

### 5. Historical name-dropping without teaching value

Avoid invoking classic books, famous authors, or historical lineages unless the
reference directly helps the reader understand the current code or course
structure.

The reader does not need literary pedigree. The reader needs operational
understanding.

## Positive writing model

Prefer this pattern:

1. name the thing
2. state what it does
3. show where it appears
4. explain why it matters now
5. move on

Example shape:

- "A `while NZ` loop checks the current Z flag before entering the body."
- "That means entry flags matter."
- "In this example, `ld a, 1 / or a` establishes NZ before the loop."
- "Without that setup, the body may not execute."

That is enough. Do not surround it with atmospheric prose.

## Worked example: bad paragraph to acceptable paragraph

Bad version:

> ZAX is not a macro assembler in the traditional sense, nor is it a modern
> systems language with hidden machinery. It sits in an honest middle ground
> where the machine remains visible while the language offers more structure.

Why this fails:

- it defines ZAX by negation
- it assumes the reader already understands the contrasted categories
- words like "honest" and "structure" are not explained
- the reader learns no rule they can apply when reading code

Acceptable rewrite:

> ZAX lets you write raw Z80 instructions directly, but it also gives names to
> storage, structured control flow, and compiler-checked function frames. In
> practice that means you can still write `ld a, (hl)` when you need a raw load,
> but you can also write `count := hl` when you want to store a word into a
> named local. This volume studies larger programs built from that combination.

Why this passes:

- it defines ZAX positively
- it names the concrete features that matter
- it gives a code-level contrast the reader can recognize
- it tells the reader what this volume will do next

## Section-level standard

Every section should answer:

- what concept is being introduced here?
- why is it being introduced now?
- what example carries it?
- what should the reader be able to do or recognise after reading it?

If a section cannot answer those, it should be restructured.

## Chapter introduction standard

A chapter introduction must do only these jobs:

- orient the reader
- state prerequisites
- state what the chapter covers
- say how this chapter differs from the previous one

It must not:

- justify the whole language again
- wander into philosophy
- explain historical lineage unless directly useful
- define the subject by saying what it is not

## Example usage standard

Examples are not decorative.

Every code excerpt must justify itself by doing one of these:

- introducing the concept
- illustrating the rule
- showing a subtlety
- showing a useful contrast

If a code excerpt does not do one of those, remove it.

Do not paste code just to prove that a file exists.

## Editing standard

Editing is not line smoothing. Editing is concept sharpening.

The editor should actively:

- remove paragraphs with no teaching payload
- split paragraphs that try to do too much
- replace abstract claims with code-grounded claims
- tighten transitions so each section earns the next one
- remove terminology that the reader has not been prepared to understand

An edit is successful when the prose becomes easier to learn from, not when it
sounds more literary.

## Review checklist for the writer

Before handing off a chapter, the writer should check:

### Reader alignment

- Is the assumed reader explicit?
- Did I assume knowledge the reader does not yet have?
- Did I accidentally write for a more advanced reader?

### Paragraph purpose

- Can I state the job of every paragraph?
- Is any paragraph only atmosphere or positioning?
- Does each paragraph advance understanding?

### Technical grounding

- Does every abstract claim cash out in a concrete consequence?
- Do all code claims match the actual source on `main`?
- Did I name the real file being discussed?

### Repetition control

- Am I re-explaining a concept instead of referring back to it?
- Is the repetition necessary because the context changed?
- If not, cut it.

### Language quality

- Are there empty rhetorical words?
- Are there sentences that merely sound good?
- Are there sentences that would confuse a beginner because they assume hidden background?

## Review checklist for the editor/reviewer

The reviewer should explicitly look for:

### 1. Reader drift

- Has the prose silently switched to writing for experts?
- Has it silently switched to writing for total novices?
- Does the chapter still match the intended reader level?

### 2. Empty paragraphs

- Which paragraphs can be removed with no loss of understanding?
- Which paragraphs make broad claims without proof?

### 3. False contrast

- Is the prose teaching by negation instead of explanation?
- Is it comparing against concepts the reader does not know?

### 4. Unsupported claims

- Does the prose say the language/compiler/example does something it does not?
- Does it generalize from one example without support?

### 5. Educational usefulness

- After each section, what does the reader now know?
- If the answer is unclear, the section is weak.

## Criticism standard

Criticism should be direct and concrete.

Avoid:

- "this feels weak"
- "this could be clearer"
- "this needs polish"

Prefer:

- "This paragraph defines ZAX by saying what it is not; the reader does not know those categories yet, so the paragraph teaches nothing."
- "This section claims the loop always executes once, but the code tests flags before entry."
- "This sentence says the feature is powerful, but does not show what that means."

Good criticism should identify:

1. the exact problem
2. why it hurts the target reader
3. what kind of rewrite is needed

## Severity for review findings

Use this severity split when reviewing course prose:

### Blocker

Use when the prose:

- teaches incorrect language behaviour
- misstates what the example code does
- assumes reader knowledge the volume has not earned
- builds a chapter around the wrong reader model

### Significant improvement

Use when the prose is not false, but still weakens the course by:

- misframing a chapter
- carrying repeated filler
- using poor examples for the concept
- letting summaries or transitions drift from the actual chapter content

### Optional polish

Use when the prose is basically sound, but can still improve through:

- tighter wording
- better transitions
- lighter repetition
- cleaner excerpt selection

## Acceptance gate

A chapter is not ready to merge unless all of the following are true:

- the reader model is explicit and stable
- the prose uses current language surface only
- every named example path exists on `main`
- every substantial claim is grounded in real code or documented language behaviour
- the chapter can be shortened nowhere without losing real teaching value

## Editorial rule of deletion

When in doubt, cut.

Educational prose is improved more often by removing material than by adding
more explanation.

The writer should assume:

- if a sentence does not teach, it is competing with a sentence that could

## Relationship to current ZAX course material

This standard applies to:

- the planned beginner-facing `docs/intro/` volume
- the current `docs/course/` advanced practical-programming volume

The standard is especially important for introductions, bridges, and chapter
openings, where LLM-generated padding is most likely to appear.
