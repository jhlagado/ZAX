# ZAX v0.2 Architecture Brief

This brief is a compact design/architecture guide for contributors.

It does not define new language behavior. Normative language rules remain in `docs/zax-spec.md`.

## 1. Decision Hierarchy

### 1.1 Source-of-Truth Stack

| Level | Document                                                                                | Role                               | Can define language behavior? |
| ----- | --------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------- |
| 1     | `docs/zax-spec.md`                                                                      | Canonical language specification   | Yes (only source)             |
| 2     | `docs/v02-transition-decisions.md`                                                      | Migration rationale and sequencing | No                            |
| 3     | `docs/zax-op-system-spec.md`, `docs/zax-cli.md`                                         | Deep supporting specifications     | No (must align to Level 1)    |
| 4     | `docs/v02-implementation-checklist.md`, `docs/roadmap.md`, `docs/zax-ai-team-prompt.md` | Planning and execution tracking    | No                            |

### 1.2 Conflict Rule

- If any supporting or transition text conflicts with `docs/zax-spec.md`, `docs/zax-spec.md` wins.
- Transition docs and plans can schedule or explain behavior, but cannot override language rules.

### 1.3 Change-Control Rule

- Behavioral change path:

1. Update `docs/zax-spec.md`.
2. Add/adjust rollout issues in `docs/v02-implementation-checklist.md`.
3. Reflect milestone impact in `docs/roadmap.md`.
4. Keep `docs/v02-transition-decisions.md` as rationale/history only.

## 2. Runtime-Atom Mental Model

### 2.1 Core Concept

A runtime atom is one runtime-varying source used in address computation.

Runtime-varying sources include:

- scalar variable index sources (for example, `idx`)
- register index sources (for example, `A`, `HL`)
- indirect register sources (for example, `(HL)`, `(IX+d)`, `(IY+d)`)

Constant arithmetic and constant path segments contribute zero runtime atoms.

### 2.2 v0.2 Complexity Budgets

| Context                                | Budget             | Design intent                                          |
| -------------------------------------- | ------------------ | ------------------------------------------------------ |
| Source-level `ea` expression           | Max 1 runtime atom | Keep single-line lowering bounded and predictable      |
| Direct call-site `ea`/`(ea)` arguments | Runtime-atom-free  | Keep call marshalling simple; stage dynamic work first |

### 2.3 User Rule of Thumb

- One moving part per addressing expression.
- Constants can be nested freely.
- If you need two moving parts, stage across lines.

### 2.4 Addressing Shape

Preferred shape for a single expression:

- base symbol
- zero or more constant field/index segments
- optional single dynamic segment
- optional constant offset

Examples:

| Form                            | Atoms | v0.2 status           |
| ------------------------------- | ----- | --------------------- |
| `arr[CONST1 + CONST2 * 4]`      | 0     | Allowed               |
| `arr[CONST1 + CONST2 * 4][idx]` | 1     | Allowed               |
| `arr[idx][0]`                   | 1     | Allowed               |
| `arr[idx].field`                | 1     | Allowed               |
| `arr[i + j]`                    | 2     | Rejected              |
| `grid[row][col]`                | 2     | Rejected (must stage) |

### 2.5 Staging Pattern

```zax
; Rejected single-line form:
LD A, grid[row][col]

; Staged model:
LD HL, grid[row]
; explicit second-step addressing
; final load/store
```

## 3. Preservation and Hidden Lowering Model

### 3.1 Typed Call Boundaries (Language-Level Contract)

- Typed `void` calls: no boundary-visible register/flag clobbers.
- Typed non-`void` calls: only `HL` is boundary-visible as return channel (`L` for byte return).

### 3.2 Op Bodies

- `op` expansions are inline instruction sequences.
- Register/stack discipline in op bodies is developer-managed.
- Any enforcement diagnostics come from normal enclosing function-stream rules.

### 3.3 Design Principle

Hidden lowering is compiler-owned, but user-surprise must be minimized.

Practical policy:

- Keep hidden lowering small and composable.
- Prefer staged explicit code over hidden multi-step synthesis.
- Prefer user-visible diagnostics when complexity exceeds budget.

## 4. Rollout Plan and Ownership

### 4.1 Sequenced Waves

| Wave   | Scope                                                                          | Tracking                                           |
| ------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| Wave 1 | Runtime-atom enforcement for source-level `ea` expressions + diagnostics/tests | [#221](https://github.com/jhlagado/ZAX/issues/221) |
| Wave 2 | Runtime-atom-free direct call-site `ea`/`(ea)` enforcement + diagnostics/tests | [#222](https://github.com/jhlagado/ZAX/issues/222) |
| Wave 3 | Op stack-policy alignment across docs/implementation/tests                     | [#223](https://github.com/jhlagado/ZAX/issues/223) |

### 4.2 Suggested Ownership Model

| Workstream         | Owner role              | Deliverable                                           |
| ------------------ | ----------------------- | ----------------------------------------------------- |
| Spec authority     | Language owner          | Rule text and migration wording in `docs/zax-spec.md` |
| Lowering semantics | Compiler/lowering owner | Enforcement and lowering behavior in compiler         |
| Diagnostics        | DX owner                | User-facing errors and migration hints                |
| Test conformance   | QA/fixtures owner       | Positive/negative fixture coverage for each wave      |
| Coordination       | Project owner           | Checklist/roadmap state and merge sequencing          |

### 4.3 Acceptance Gates per Wave

- Spec alignment: no contradiction between behavior and `docs/zax-spec.md`.
- Diagnostics: user-facing errors describe budget and staged alternative.
- Tests: positive and negative fixtures for each changed rule.
- Documentation sync: checklist and roadmap updated with completion status.

## 5. Team Working Agreement

- PRs touching addressing/call lowering/op semantics should reference wave issue `#221`, `#222`, or `#223`.
- Avoid mixed-scope PRs that span multiple waves unless explicitly planned.
- Merge order should follow wave order to reduce ambiguity and regression risk.
