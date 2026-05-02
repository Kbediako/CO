---
id: 20260502-linear-34faa7f9-640b-494f-af58-47096b6d0541
title: CO-491 retained released/not_active canceled metadata refresh
relates_to: docs/PRD-linear-34faa7f9-640b-494f-af58-47096b6d0541.md
risk: high
owners:
  - Codex
last_review: 2026-05-02
related_action_plan: docs/ACTION_PLAN-linear-34faa7f9-640b-494f-af58-47096b6d0541.md
task_checklists:
  - tasks/tasks-linear-34faa7f9-640b-494f-af58-47096b6d0541.md
---

# TECH_SPEC - CO-491 retained released/not_active canceled metadata refresh

## Canonical Reference
- PRD: `docs/PRD-linear-34faa7f9-640b-494f-af58-47096b6d0541.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-34faa7f9-640b-494f-af58-47096b6d0541.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-34faa7f9-640b-494f-af58-47096b6d0541.md`
- Task checklist: `tasks/tasks-linear-34faa7f9-640b-494f-af58-47096b6d0541.md`
- Linear issue: `CO-491` / `34faa7f9-640b-494f-af58-47096b6d0541`
- Source anchor: `ctx:sha256:10648cc31b6c8a3312a310a70a91e0852a279546347dfdb5835865865caabb42#chunk:c000001`

## Summary
- Objective: refresh retained `released` / `provider_issue_released:not_active` metadata when live Linear moves the issue into `Duplicate` / `canceled`, including when fresh terminal truth is visible only through persisted dependent blocker-edge data.
- Scope:
  - `ProviderIssueHandoff` retained released/not_active metadata refresh path
  - focused tests for persisted blocker-edge disagreement and terminal/canceled metadata convergence
  - docs/task packet and registry evidence
- Constraints:
  - no manual `provider-intake-state.json` edits
  - no CO-470 state/ownership changes
  - no CO-459 top-level projection work
  - no CO-476 `/ui/data` timeout work
  - no weakening still-open released/not_active recovery

## Issue-Shaping Contract
- User-request translation carried forward: CO-491 is a recurrence fix for CO-292, triggered by CO-470 retaining stale started-state metadata after a guarded `Duplicate` / `canceled` transition.
- Protected terms / exact artifact and surface names:
  - `CO-292`
  - `CO-470`
  - `Duplicate/canceled`
  - `provider-intake-state.json`
  - retained `released` / `provider_issue_released:not_active` row
  - `issue_state=Blocked`
  - `issue_state_type=started`
  - `issue_updated_at` stale
  - live Linear `issue-context`
  - fresh blocker-edge truth
- Nearby wrong interpretations to reject:
  - fixing only co-status top-level projection
  - deleting raw intake by hand
  - reopening CO-470
  - treating CO-292 as still active
  - special-casing CO-470
  - weakening released/not_active recovery for still-open issues

## Architecture & Data
- Current behavior:
  - Retained released/not_active claims can be kept local-first during deferred polls.
  - The refresh path already knows how to use live poll/fresh-discovery blocker snapshots as a hint before direct issue-by-id reads.
  - The gap is persisted intake blocker-edge truth: a sibling/dependent claim can carry fresher `issue_blocked_by` terminal metadata for the same issue, while the retained same-issue row remains stale.
- Target behavior:
  - Build a blocker snapshot map from persisted provider-intake claims' `issue_blocked_by` arrays.
  - Merge those snapshots with live poll blocker snapshots without overriding fresher live poll truth.
  - Use persisted blocker-edge disagreement only as a hint to attempt live Linear issue refresh for the retained issue.
  - Update/release/degrade the retained row from live issue-context truth; do not mutate same-issue metadata from stale persisted blocker edge alone.
- Data model changes:
  - No schema migration.
  - Existing claim fields (`issue_state`, `issue_state_type`, `issue_updated_at`, `issue_blocked_by`) remain the authority surfaces.
- Consumer contract:
  - A terminal/canceled live issue must not remain visible as a started active blocker from stale retained metadata.
  - Released/not_active rows for still-open issues keep existing recovery and recheck semantics.

## Technical Requirements
- Functional requirements:
  1. Add a generic retained released/not_active fixture where the retained row is stale `Blocked` / `started` and a persisted dependent blocker edge reports the same issue as `Duplicate` / `canceled`.
  2. Ensure the refresh path uses that disagreement to perform a live issue-by-id read for the retained issue.
  3. Update the retained row with live terminal/canceled metadata, or preserve an explicit degraded disagreement if live refresh fails according to existing fail-closed behavior.
  4. Preserve same-issue retained-row and dependent blocker-edge convergence without special-casing CO-470.
  5. Keep existing still-open released/not_active recovery tests green.
- Non-functional requirements:
  - smallest local change in provider-intake refresh logic
  - no new dependency or storage format
  - deterministic unit coverage
  - clear docs/workpad validation evidence
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - existing status/active-claim classification in `providerIntakeState.ts`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required; the change routes one stale cached retained-row case into the existing live issue refresh machinery.
- Minor-seam decision: acceptable because the persisted blocker-edge branch only decides whether to refresh, while live issue-by-id remains the metadata authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Retained terminal/canceled metadata | Cached same-issue retained row can carry stale started metadata while blocker-edge truth is terminal/canceled | `remove fallback` | CO-491 | Retained released/not_active claim disagrees with blocker-edge terminal metadata. | 2026-05-02 | 2026-05-02 | This issue | Live source refresh updates or degrades the retained row. | Focused persisted blocker-edge regression. |
| Still-open released/not_active recovery | Existing retention/recovery behavior for non-terminal issues | `justify retaining fallback` | Provider-intake control-host | Live truth remains non-terminal or unavailable. | Existing CO-292-era behavior | 2026-05-02 | Existing provider-intake policy | Separate owner decides removal. | Existing retained released/not_active recovery coverage remains green. |

- Contract name: Still-open released/not_active recovery.
- Owning surface: Provider-intake control-host retained released/not_active recovery.
- Steady-state proof: existing retained released/not_active recovery coverage remains green after the terminal/canceled metadata refresh change.
- Tests/docs: `orchestrator/tests/ProviderIssueHandoff.test.ts -t "retained released"` and CO-491 PRD/TECH_SPEC docs.
- Non-expiring rationale: still-open released/not_active recovery is supported provider-intake behavior; it is not governed as an expiring fallback unless a future owner removes that contract.

## Validation Plan
- Focused tests:
  - new ProviderIssueHandoff regression for persisted blocker-edge `Duplicate` / `canceled` disagreement
  - existing retained released/not_active recovery cluster around terminal and still-open behavior
  - status/consumer coverage that released/not_active stale started metadata is not counted as active where practical
- Repo gates:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
  - explicit elegance/minimality pass
  - `npm run pack:smoke` if CLI/downstream package scope requires it
- Live/current-main status check:
  - Run the practical current-main or live issue-context/status command available in the worker environment and record whether it is validation evidence or blocked by external state.

## Open Questions
- None blocking. If validation exposes stale top-level projection or `/ui/data` timeout debt, file/reuse the relevant adjacent owner instead of broadening CO-491.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-02.
