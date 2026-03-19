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

---

## Who the writer is

Before writing anything, be clear about who is writing and why.

The writer is someone who likes Z80 and finds ZAX genuinely useful. They want
to share that. They are not producing documentation for an organization. They
are not writing in a neutral, institutional voice. They are a person talking
to another person who wants to learn.

**Motive**: The writer wants the reader to understand how this works and feel
the satisfaction of it clicking into place. Not to admire the language from a
distance, but to be able to use it.

**Tone**: Direct. Warm but not cheerful. Like sitting next to someone at a
keyboard. You would not say "the reader should note that" — you would say
"notice that." You would not say "this imposes a bookkeeping overhead" — you
would say "this means you have to track the values yourself."

**What this rules out**:
- Neutral third-person distance ("the reader", "one might observe")
- Documentation language ("this section describes", "it is worth noting")
- Academic hedging ("in general", "it may be said that")
- Writing that is correct but has no human behind it

If a sentence could have been produced by a committee, rewrite it.

---

## Narrative and voice

The course is not a reference manual. It is a story told in order, and each
chapter is a conversation with the reader.

**Use "you".** The second person is not informal — it is direct. "You will
see" is better than "the reader will observe." "You need to know X before Y
makes sense" is better than "X is a prerequisite for Y."

**Chapters lead somewhere.** Each section should feel like it is moving toward
something. The reader should sense forward motion — not just a list of facts
to absorb, but a path being walked. Use short signposts: "That pattern has a
cost, which the next chapter addresses." "Now that you have seen the loop
structure, here is the one thing the hardware does differently from what you
expect."

**Show, then explain.** When a concept is surprising or non-obvious, show it
first in code, then explain what just happened. Do not front-load explanation
of something the reader has not yet seen.

**Name the moment of confusion.** If there is a common mistake or a thing
that trips people up, say so directly: "This is the part that catches people."
"The easy mistake here is to forget the init." The reader is not fragile.
Naming the difficulty is reassuring, not discouraging.

**Short sentences carry more weight.** Long sentences make readers work harder.
If a sentence runs past 25 words, see whether it can be split. One idea per
sentence is not a style rule — it is a teaching rule.

**The writer has a point of view.** It is fine to say "this is the cleaner
approach." It is fine to say "this pattern is worth memorising." The writer
does not have to be neutral about everything. What they cannot do is claim
something is good without showing why.

---

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

### 6. Jargon and internal vocabulary

Use common English words.

Phrases like "assembler surface", "justified relief", "bookkeeping cost",
"cash out", "operational payoff", "teaching payload", "reader model" are
internal vocabulary — shorthand between writers. They are not reader-facing
language.

If you would not say it aloud to someone sitting next to you learning Z80 for
the first time, do not write it in the course.

Ask: what am I actually trying to say? Then say that, in plain words.

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

- remove paragraphs that teach nothing
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

### 6. Voice and tone

This is the most commonly missed failure mode. Check each of the following
explicitly — do not assume good prose style passes automatically.

**Pronouns**: Search the text for "the programmer", "the reader", "one". Every
occurrence should be "you" unless there is a specific reason it cannot be.
"The programmer cannot name their variables" is wrong. "You cannot name your
variables" is right.

**Third-person distance**: Sentences like "It is the compiler's job to...",
"The function's purpose is to...", "The reader should note that..." all signal
institutional voice. The test: could this sentence have come from a product
manual? If yes, rewrite it as something a person would say.

**Dead openings**: Flag sentences that begin with "There is", "There are",
"It is", "This is", or "That is" and do no teaching work. Some are fine — but
when a section has several in a row, each one is probably deferring real content.
Ask: what is the sentence actually saying, and can it say it directly?

**Internal vocabulary**: Search for "idiom", "discipline", "invariant",
"ergonomic", "bookkeeping cost", "naming pressure", "Phase A", "Phase B",
"assembler surface", "justified relief". These should not appear in
reader-facing prose. If they do, the writer is thinking about the course design,
not talking to the reader.

**Narrative forward motion**: Read each section opening. Does it say where this
section is going, and why now? A section that opens with a definition and then
lists facts has no narrative arc. A section that opens with the problem it is
about to solve does.

**The sitting-next-to-someone test**: Read a paragraph aloud as if you were
explaining it to a person sitting next to you. If it sounds strange spoken —
too formal, too distant, too abstract — it needs rewriting. Good course prose
reads naturally aloud.

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
- the text uses "you" throughout — no "the programmer", "the reader", or "one"
- no internal vocabulary appears in reader-facing prose (see rule #6)
- no dead openings ("There is nothing new here", "It is worth noting") go unchallenged

## Editorial rule of deletion

When in doubt, cut.

Educational prose is improved more often by removing material than by adding
more explanation.

The writer should assume:

- if a sentence does not teach, it is competing with a sentence that could

## Relationship to current ZAX course material

This standard applies to:

- the planned beginner-facing `learning/part1/` volume
- the current `learning/part2/` advanced practical-programming volume

The standard is especially important for introductions, bridges, and chapter
openings, where LLM-generated padding is most likely to appear.
