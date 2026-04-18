---
id: 20260330-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1
title: CO-41 reopened provider refresh stall recurrence
relates_to: docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- PRD: `docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- Task checklist: `tasks/tasks-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`

## Traceability
- Linear issue: `CO-41` / `af97d673-43a4-4a36-8738-b7f61e5b71a1`
- March reference fix: `PR #324` / commit `330581458`
- Apr 18 source anchor: `ctx:sha256:32d01f29a223917c3e47b5f30f7753d44d23e7cfafd3dc6fb8977eb8a2d0c633#chunk:c000001`
- Apr 18 origin manifest: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-refresh/cli/2026-04-18T21-09-55-260Z-b69a5e6c/manifest.json`

## Summary
- Objective: Refresh the `CO-41` docs packet for the Apr 18 reopened recurrence while preserving the March `PR #324` reference fix as historical baseline.
- Current recurrence: `provider-intake-state.json` shows `stuck=true`, `restart_required=true`, `last_error=provider_refresh_lifecycle_stuck`, `refresh_phase=refresh:claim_reconcile`, and free capacity (`running=2`, `max_allowed=3`) while a `Ready` issue (`CO-252`) is not admitted until restart.
- Current source-fix posture: identified and implemented in this lane. The blocking seam is repeated active-worker restart quarantine in `controlHostSupervision.ts` treating a refresh-stuck series as quarantined/healthy even when `counts.max_allowed` shows open provider capacity; the existing `co-status --format json` operator dataset carries `counts.max_allowed`, and supervision diagnostics now preserve that signal.

## Protected Terms / Exact Surfaces
- `provider-intake-state.json`
- `provider_refresh_lifecycle_stuck`
- `refresh:claim_reconcile`
- `Ready`
- `In Progress`
- `restart_required`
- `stuck`
- `CO-41`
- `CO-252`
- `CO-217`
- `CO-211`
- `CO-214`
- `CO-248`

## Technical Requirements
- Functional requirements:
  - distinguish the Apr 18 recurrence from the already-landed March `PR #324` watchdog fix
  - preserve phase-specific stuck evidence for `refresh:claim_reconcile`
  - ensure the implementation proves why a `Ready` issue was not admitted despite `running=2`, `max_allowed=3`
  - expose machine-checkable recovery or restart-required behavior without hiding `provider_refresh_lifecycle_stuck`
  - keep adjacent issue boundaries explicit for `CO-252`, `CO-217`, `CO-211`, `CO-214`, and `CO-248`
- Non-functional requirements:
  - preserve serialized provider refresh correctness
  - avoid duplicate issue claims or unsafe forced concurrency
  - keep diagnostics truthful when recovery is unsafe by retaining `restart_required` and `stuck` evidence
- Interfaces / contracts:
  - refresh lifecycle source under the control-host provider refresh / poll path
  - `co-status --format json` operator dataset counts
  - operator evidence in `provider-intake-state.json`
  - focused regression or diagnostic harness for the Apr 18 recurrence

## Nearby Wrong Interpretations To Reject
- `PR #324 already fixed this forever.` The March fix is a reference baseline; Apr 18 reopened `CO-41` because the family recurred.
- `This is capacity exhaustion.` Apr 18 evidence has `running=2`, `max_allowed=3`.
- `This is only Linear status drift.` A `Ready` issue was not admitted until restart while the local provider refresh lifecycle reported `provider_refresh_lifecycle_stuck`.
- `This is automatically CO-211, CO-214, or CO-248.` Those are adjacent contracts; parent evidence must prove any shared seam before widening.
- `The docs refresh can close CO-41.` It cannot; source repair and validation are required.

## Current / Reference / Target Parity Matrix

| Contract | Reference: March `PR #324` | Current: Apr 18 recurrence | Target |
| --- | --- | --- | --- |
| Stuck detection | Original `CO-41` watchdog/reporting fix landed. | `stuck=true` and `restart_required=true` recur in `provider-intake-state.json`. | Detection remains truthful and leads to safe recovery or explicit restart-required closeout. |
| Refresh phase | March incident established provider refresh lifecycle stall lineage. | Recurrence is specifically `refresh:claim_reconcile`. | Fix preserves phase detail and covers free-capacity restart-required recovery. |
| Admission under capacity | Restart historically allowed stuck `Ready` issues to advance. | `running=2`, `max_allowed=3`, yet `CO-252` remains `Ready` until restart. | Free-capacity `Ready` issues can move to `In Progress`, or the blocker is explicit and machine-checkable. |
| Adjacent issue boundaries | `CO-41` is the lineage anchor. | `CO-217`, `CO-211`, `CO-214`, and `CO-248` are nearby evidence or neighboring seams. | Source changes preserve neighboring contracts unless parent evidence requires coordinated follow-up. |

## Validation Plan
- Child-lane docs checks only:
  - protected-term grep across the declared packet files
  - JSON parse check for `tasks/index.json`
  - `git diff --check` for touched docs/task files
- Implementation validation:
  - reproduce or simulate the Apr 18 `refresh:claim_reconcile` free-capacity no-admission shape
  - add focused lifecycle coverage for the identified seam and `max_allowed` diagnostic parsing
  - prove genuine `provider_refresh_lifecycle_stuck`, `restart_required`, and `stuck` evidence remains visible
  - run the validation floor before PR handoff

## Open Questions
- Which source seam now blocks `refresh:claim_reconcile` after March `PR #324`?
- Does the recurrence come from claim reconciliation itself, stale lifecycle sampling, handoff admission gating, or restart-state retention?
- Which adjacent issue needs no-regression review first: `CO-211`, `CO-214`, `CO-248`, `CO-217`, or `CO-252`?

## Approvals
- Reviewer: March docs-review approved via `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-review/cli/2026-03-30T01-25-36-879Z-17cd2f7d/manifest.json`
- Date: 2026-03-30
- Apr 18 docs refresh: bounded same-issue child lane produced the initial packet; this lane owns docs-review / implementation-gate integration.
