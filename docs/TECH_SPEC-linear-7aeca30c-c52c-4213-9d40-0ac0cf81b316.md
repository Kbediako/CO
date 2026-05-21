---
id: 20260521-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316
title: "CO-570 docs-review change bundle explicit scope"
relates_to: docs/PRD-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md
risk: high
owners:
  - Codex
last_review: 2026-05-21
related_action_plan: docs/ACTION_PLAN-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md
task_checklists:
  - tasks/tasks-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md
---

## Canonical Reference
- Linear issue: `CO-570` / `7aeca30c-c52c-4213-9d40-0ac0cf81b316`
- PRD: `docs/PRD-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- Canonical task spec: `tasks/specs/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- Task checklist: `tasks/tasks-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- `.agent` mirror: `.agent/task/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- Source anchor: `ctx:sha256:d9c322b93b1673e1fcb654e148e78489e74df51b03ab890768e710d3ad9e5bcc#chunk:c000001`
- Source object id: `sha256:d9c322b93b1673e1fcb654e148e78489e74df51b03ab890768e710d3ad9e5bcc`

## Summary
- Objective: define the parent implementation contract for making `docs-review` and bounded review scope explicit in `change-bundle.json`.
- Scope: docs packet, registry mirrors, and parent guidance for review scope metadata only.
- Constraints: this child lane edits no implementation, tests, Linear state, workpad, PR lifecycle, GitHub state, or review-handoff state.

## Issue-Shaping Contract
- User-request translation carried forward: CO-570 should make review scope explicit so `docs-review` and bounded review can tell whether `change-bundle.json` represents a committed branch diff, an uncommitted working tree, or a base diff.
- Protected terms / exact artifact and surface names: `docs-review`, `change-bundle.json`, committed branch diff, explicit review scope, bounded review, uncommitted working tree, base diff, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Nearby wrong interpretations to reject: dirty-tree inference as the authority, treating every bundle as uncommitted review, treating every bundle as base diff review, hiding committed branch diff context, or widening into Linear/GitHub/PR lifecycle.
- Explicit non-goals carried forward: no source/test edit from this child lane, no Linear/GitHub/PR mutation, no review-handoff command, no full validation suite, and no broad review policy rewrite.

## Technical Requirements
- Functional requirements:
  1. Parent implementation records an explicit review scope in or alongside `change-bundle.json`.
  2. The scope distinguishes committed branch diff, uncommitted working tree, and base diff.
  3. `docs-review` and bounded review handoff surface the selected scope to reviewers.
  4. The explicit scope must not be inferred solely from dirty working tree state.
  5. Missing, unknown, or contradictory scope metadata must fail closed or produce actionable diagnostics rather than silently selecting the wrong review surface.
  6. Registry mirrors must point to the CO-570 packet without changing unrelated task rows.
- Non-functional requirements:
  - keep the bundle schema change minimal and backwards-auditable
  - keep review scope language stable enough for future packet/review evidence
  - avoid broad changes to reviewer selection, PR lifecycle, or Linear state
- Interfaces / contracts:
  - `change-bundle.json` is the review metadata artifact
  - `docs-review` is the pre-implementation review lane that must see the selected scope
  - bounded review should report the explicit review scope in evidence or diagnostics

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Out of scope |
| --- | --- | --- | --- | --- |
| `docs-review` scope | Scope can be implicit in caller convention or working tree state. | Scope should be explicit review scope metadata. | Review handoff states whether it is committed branch diff, uncommitted working tree, or base diff. | Review model selection and lifecycle transitions. |
| `change-bundle.json` | Bundle evidence can exist without clear scope semantics. | Bundle metadata should carry the selected review surface. | Bundle includes explicit scope semantics that reviewers and tooling can consume. | Replacing unrelated bundle fields. |
| Committed branch diff | A branch diff can look like a base diff or stale dirty-tree review. | Committed branch diff should be a distinct scope. | Parent tests prove committed branch diff remains distinct. | PR creation, merge, or check orchestration. |
| Uncommitted working tree | Dirty state can be treated as the implicit review authority. | Uncommitted working tree should be selected explicitly. | Parent tests prove dirty-tree scope is encoded when selected. | Forcing all reviews through dirty-tree mode. |
| Base diff | Base selection can be implicit. | Base diff should be a distinct selected review surface. | Parent tests prove base diff is distinguishable from committed branch diff. | Broad base-ref calculation redesign unless source inspection proves it is necessary. |

## Readiness Gate
- Not done if:
  - protected terms are missing
  - `change-bundle.json` lacks explicit review scope metadata after parent implementation
  - committed branch diff, uncommitted working tree, and base diff remain indistinguishable
  - `docs-review` can run with ambiguous scope and still look clean
  - this child lane edits source/tests or lifecycle state
- Pre-implementation issue-quality review evidence:
  - 2026-05-21: issue is not narrower than the user request because the packet preserves the exact review surfaces, wrong interpretations, non-goals, Not Done If, and parity matrix.
  - Micro-task path is inappropriate because correctness depends on exact artifact names and protected review-scope wording.
- Safeguard ownership split:
  - child lane owns only docs/task packet and registry mirror files listed in the prompt
  - parent owns implementation, tests, review, validation, Linear state, workpad, PR lifecycle, and final handoff

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review scope metadata | `docs-review` / bounded review scope can be inferred from caller state instead of encoded in `change-bundle.json`. | `expire fallback` | CO-570 | Review bundle handoff cannot distinguish committed branch diff, uncommitted working tree, or base diff. | 2026-05-21 | 2026-05-21 | This issue | `change-bundle.json` carries explicit review scope and `docs-review` evidence surfaces it. | Parent-owned focused change-bundle/docs-review regressions plus docs checks. |

- Large-refactor check: keep a bounded metadata repair unless implementation discovery shows scope authority is split across multiple lifecycle phases.

## Architecture & Data
- Architecture / design adjustments:
  - parent should locate the `change-bundle.json` producer and `docs-review` consumer before coding
  - add or propagate a small explicit review scope field rather than relying on local checkout state
  - ensure diagnostics mention the scope when it is missing or inconsistent
- Data model changes / migrations:
  - no data migration from this child lane
  - parent should keep any schema addition backwards-compatible enough for existing review artifacts to remain readable
- External dependencies / integrations:
  - no Linear/GitHub mutation from this child lane
  - parent-owned review wrapper/docs-review integration only

## Validation Plan
- Child-lane checks:
  - protected-term scan across the declared files
  - scoped markdown trailing-whitespace check
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - changed-file review confirming only declared file paths changed
- Parent-owned checks:
  - focused regression for committed branch diff `change-bundle.json` scope
  - focused regression for uncommitted working tree `change-bundle.json` scope
  - focused regression for base diff `change-bundle.json` scope
  - regression or diagnostics proof for missing/unknown scope
  - scoped `docs-review` or equivalent bounded review proof after implementation

## Open Questions
- Parent must identify the exact schema field name after source inspection.
- Parent must decide whether base diff scope needs base ref metadata or only a normalized scope value plus existing context.

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-21
