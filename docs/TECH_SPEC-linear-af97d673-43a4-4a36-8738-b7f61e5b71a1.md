---
id: 20260330-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1
title: CO-41 post-PR #547 provider refresh stall recurrence
relates_to: docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md
risk: high
owners:
  - Codex
last_review: 2026-04-19
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- PRD: `docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- Task checklist: `tasks/tasks-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`

## Traceability
- Linear issue: `CO-41` / `af97d673-43a4-4a36-8738-b7f61e5b71a1`
- March reference baseline: `PR #324` / commit `330581458`
- Apr 18 repair baseline: `PR #547` / commit `0484cd803`
- Apr 18 source anchor: `ctx:sha256:32d01f29a223917c3e47b5f30f7753d44d23e7cfafd3dc6fb8977eb8a2d0c633#chunk:c000001`
- Apr 18 origin manifest: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-refresh/cli/2026-04-18T21-09-55-260Z-b69a5e6c/manifest.json`
- Apr 19 reopened source anchor: `ctx:sha256:1bc7b3ac282ad1ebac36e250c2a063346e8497500fbf4b407ca3ea84ae327f35#chunk:c000001`
- Apr 19 origin manifest: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-apr19-refresh/cli/2026-04-19T02-56-26-118Z-98ad9a6f/manifest.json`

## Summary
- Objective: Refresh the `CO-41` docs packet for the Apr 19 reopened recurrence after `PR #547` merged, while preserving March `PR #324` and Apr 18 `PR #547` as baselines only.
- Current recurrence: Linear comments report post-#547 `restart_required` recurrences, stale `released:not_active` / `provider_issue_released:not_active` rows, `active_worker_proof_missing`, freshness-gauge stale verdict, partial restart recovery, and spare-capacity no-admission.
- Current source-fix posture: not implemented in this docs child lane. Parent owns source investigation, implementation, validation, review, Linear state, workpad, and PR lifecycle.

## Protected Terms / Exact Surfaces
- `provider-intake-state.json`
- `provider_refresh_lifecycle_stuck`
- `refresh:claim_reconcile`
- `Ready`
- `In Progress`
- `restart_required`
- `stuck`
- `released:not_active`
- `provider_issue_released:not_active`
- `active_worker_proof_missing`
- `freshness-gauge stale`
- `partial restart recovery`
- `spare-capacity no-admission`
- `CO-41`
- `CO-252`
- `CO-217`
- `CO-211`
- `CO-214`
- `CO-248`

## Technical Requirements
- Functional requirements:
  - distinguish the Apr 19 recurrence from the March `PR #324` watchdog fix and the Apr 18 `PR #547` free-capacity quarantine fix
  - preserve post-#547 `restart_required` recurrence evidence
  - preserve stale `released:not_active` / `provider_issue_released:not_active` row evidence
  - preserve `active_worker_proof_missing`, freshness-gauge stale verdict, partial restart recovery, and spare-capacity no-admission evidence
  - ensure the parent implementation proves why a `Ready` issue can still be blocked despite spare capacity after `PR #547`
  - keep adjacent issue boundaries explicit for `CO-252`, `CO-217`, `CO-211`, `CO-214`, and `CO-248`
- Non-functional requirements:
  - preserve serialized provider refresh correctness
  - avoid duplicate issue claims or unsafe forced concurrency
  - keep diagnostics truthful when recovery is unsafe by retaining `restart_required`, `stuck`, stale-release, and freshness evidence
- Interfaces / contracts:
  - control-host provider refresh / poll path
  - `provider-intake-state.json`
  - stale release rows represented as `released:not_active` / `provider_issue_released:not_active`
  - active-worker proof diagnostics, including `active_worker_proof_missing`
  - focused regression or diagnostic harness for the Apr 19 recurrence

## Nearby Wrong Interpretations To Reject
- `PR #324 already fixed this forever.` The March fix is a reference baseline; Apr 19 reopened `CO-41` because the family recurred again.
- `PR #547 is current completion proof.` No: `PR #547` is the Apr 18 repair baseline, while Apr 19 evidence is post-merge recurrence evidence.
- `This is capacity exhaustion.` No: Apr 19 evidence includes spare-capacity no-admission.
- `This is only Linear status drift.` No: local control-host provider refresh/admission evidence remains central.
- `This is automatically CO-39, CO-40, CO-33, CO-211, CO-214, or CO-248.` Those are boundaries or neighboring seams; parent evidence must prove any shared seam before widening.
- `The docs refresh can close CO-41.` It cannot; source repair and validation are required.

## Current / Reference / Target Parity Matrix

| Contract | Reference: March `PR #324` | Reference: Apr 18 `PR #547` | Current: Apr 19 recurrence | Target |
| --- | --- | --- | --- | --- |
| Stuck detection | Original `CO-41` watchdog/reporting fix landed. | Free-capacity repeated active-worker restart quarantine was narrowed. | Post-#547 `restart_required` recurrences still occur. | Detection remains truthful and leads to safe recovery or explicit restart-required closeout. |
| Stale release rows | March lineage established provider refresh stall triage. | Apr 18 focused on `refresh:claim_reconcile` and `counts.max_allowed`. | Stale `released:not_active` / `provider_issue_released:not_active` rows are current evidence. | Parent fix proves stale release rows cannot suppress eligible intake silently. |
| Active-worker proof | Not the March focus. | Apr 18 used active-worker series and capacity to avoid wrong quarantine. | `active_worker_proof_missing` is current evidence. | Missing proof is surfaced and cannot masquerade as healthy active-worker protection. |
| Freshness / recovery | Restart was a mitigation for the original stall. | Apr 18 repair aimed to trigger supervision recovery under free capacity. | Freshness-gauge stale verdict and partial restart recovery show restart is not final proof. | Freshness/recovery state is machine-checkable before closeout. |
| Capacity / admission | Restart historically allowed stuck `Ready` issues to advance. | `running=2`, `max_allowed=3` represented free-capacity no-admission. | Spare-capacity no-admission recurs after `PR #547`. | Available capacity admits `Ready` work to `In Progress`, or the blocker is explicit. |
| Adjacent issue boundaries | `CO-41` is the lifecycle-stall lineage anchor. | `CO-217`, `CO-211`, `CO-214`, and `CO-248` stayed boundaries. | Do not widen into `CO-39`, `CO-40`, `CO-33`, or unrelated families. | Source changes preserve neighboring contracts unless parent evidence requires coordinated follow-up. |

## Validation Plan
- Child-lane docs checks only:
  - JSON parse check for `tasks/index.json`
  - `git diff --check` for touched docs/task files
- Parent implementation validation:
  - reproduce or simulate the Apr 19 post-#547 recurrence shape
  - add focused lifecycle coverage for stale `released:not_active` rows, `active_worker_proof_missing`, freshness-gauge stale verdict, partial restart recovery, and spare-capacity no-admission
  - prove genuine `provider_refresh_lifecycle_stuck`, `restart_required`, and `stuck` evidence remains visible
  - run focused tests and review gates before PR handoff

## Open Questions
- Which source seam now blocks intake after `PR #547`?
- Are stale `released:not_active` rows and `active_worker_proof_missing` two symptoms of one stale-proof path or separate failure paths?
- What parent-owned focused test best captures partial restart recovery plus spare-capacity no-admission?

## Approvals
- March docs-review approval date: 2026-03-30
- March docs-review evidence: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-review/cli/2026-03-30T01-25-36-879Z-17cd2f7d/manifest.json`
- Apr 18 docs refresh approval date: 2026-04-18
- Apr 18 docs refresh evidence: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-refresh/cli/2026-04-18T21-09-55-260Z-b69a5e6c/manifest.json`
- Apr 19 docs refresh evidence: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-apr19-refresh/cli/2026-04-19T02-56-26-118Z-98ad9a6f/manifest.json`
