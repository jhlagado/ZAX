# ZAX v0.2 Implementation Checklist

This checklist is non-normative planning support.

Normative language behavior is defined in `docs/zax-spec.md`.

## Usage

1. Create one GitHub issue per planned change (use the `v0.2 Change Task` template).
2. Add or update a row in the table below with the issue number and status.
3. Link the implementing PR in the `PR` column.
4. Keep rule text in `docs/zax-spec.md`; keep this file as a pointer/checklist only.

## Active Queue

| Area | Change | Issue | Status | PR |
| --- | --- | --- | --- | --- |
| docs | Runtime-atom model and single-expression budget | (add issue) | In progress | [#219](https://github.com/jhlagado/ZAX/pull/219) |
| diagnostics | Runtime-atom quota compile errors | (add issue) | Planned | — |
| lowering | Staged-addressing guidance in examples/fixtures | (add issue) | Planned | — |

## Status Legend

- `Planned`: scoped issue exists; work not started.
- `In progress`: PR open or implementation active.
- `Blocked`: waiting on dependency/decision.
- `Done`: merged to `main`.
