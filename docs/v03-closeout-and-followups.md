# v0.3 Closeout And Follow-ups

v0.3 implementation work is complete.

This note records the project state at closeout and marks the transition from
the v0.3 planning/implementation cycle into v0.4 planning.

## v0.3 closeout status

- The v0.3 queue is treated as complete.
- The v0.3 additions now considered landed are:
  - `docs/codegen-corpus-workflow.md`
  - `docs/virtual-reg16-transfer-patterns.md`
- The v0.3 planning docs remain as historical planning references:
  - `docs/v03-planning-track.md`
  - `docs/v03-priority-queue.md`

## Boundary rule

- `v0.3.0` marks the end of the v0.3 line.
- Work after that tag is v0.4-era work unless it is a true regression fix on the
  released v0.3 surface.

## Follow-on policy

- Do not reopen completed v0.3 tickets as implicit carry-over work.
- If a v0.3 behavior needs to change, create a new v0.4-scoped issue with the
  updated rationale.
- Keep the shipped v0.3 behavior stable unless a new planned change explicitly
  replaces it.

## Next planning state

- Active planning moves to:
  - `docs/v04-planning-track.md`
  - `docs/v04-priority-queue.md`
