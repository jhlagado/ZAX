# v0.2 Closeout And Follow-ups

v0.2 implementation work is complete.

This note records the project state at closeout and identifies the follow-on areas
that should now move into future developer work rather than remain as open v0.2
tickets.

## v0.2 closeout status

- The current v0.2 language, lowering, and fixture work is treated as complete.
- The normative references remain:
  - `docs/zax-spec.md`
  - `docs/addressing-model.md`
  - `docs/v02-codegen-worked-examples.md`
  - `examples/language-tour/00_call_with_arg_and_local_baseline.expected-v02.asm`
  - `examples/language-tour/00_call_with_arg_and_local_baseline.codegen-notes.md`
- Remaining open work should not be framed as unfinished v0.2 implementation
  unless it is a true regression or spec violation.

## Ticket policy at closeout

- Any v0.2 ticket that only existed to tighten wording or point to already-landed
  behavior should be closed.
- Any v0.2 enhancement ticket that describes optional capability expansion should
  be moved to a new future-work ticket for the developer.
- Future work should use current terminology and current semantics; do not carry
  forward stale `flags`, legacy return-width keywords, or retired `@place`
  assumptions into new tickets.

## Follow-on developer work (future scope)

The next developer-facing work items that grow naturally out of the completed
v0.2 base are:

### 1. Virtual 16-bit transfer patterns

Low-cost virtual register-transfer forms remain useful future work, for example:

- `ld hl, bc`
- `ld hl, de`
- other preservation-safe 16-bit moves that lower to compact legal Z80 sequences

This should be treated as an explicit follow-on design/implementation task, not
as unfinished v0.2 verification work.

### 2. IXH/IXL/IYH/IYL support

Undocumented byte-lane register forms are also future work:

- parser acceptance where the forms are intentionally supported
- correct opcode emission for supported cases
- explicit shuttle-based lowering for cases that need preservation-safe handling

This should also be treated as a future capability expansion, not as a blocker
against the completed v0.2 surface.

## Designer responsibilities after v0.2

- Keep the normative docs consistent with the now-completed v0.2 surface.
- Close stale v0.2 issues once they are either completed or superseded.
- Reissue future capability work as new developer tickets with current wording,
  current constraints, and clear acceptance checks.
