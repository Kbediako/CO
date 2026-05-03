---
id: 20260502-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f
title: CO-493 clear stale review-promotion metadata after Rework branch conflicts
relates_to: docs/PRD-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md
risk: high
owners:
  - Codex
last_review: 2026-05-02
related_action_plan: docs/ACTION_PLAN-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md
task_checklists:
  - tasks/tasks-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md
---

# TECH_SPEC - CO-493 clear stale review-promotion metadata after Rework branch conflicts

## Canonical Reference
- PRD: `docs/PRD-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- Task checklist: `tasks/tasks-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- Linear issue: `CO-493` / `c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- Source issue: `CO-486` / `6a92b5d9-3293-4e27-9bc5-28c8c62becfc`
- Source anchor: `ctx:sha256:558ddb6b0f78a449dd5d0e36c33ef67727b03fc7811585678fd513ddefe17f17#chunk:c000001`

## Summary
- Objective: prevent stale `review_promotion` action-required metadata from suppressing a fresh `Rework` branch-conflict reset after `CO-486` moved to active `Rework`.
- Scope:
  - control-host rehydrate/recover logic that decides whether prior `handoff_failed` / `provider_issue_review_promotion_action_required` metadata is current
  - focused regression coverage for active `Rework` plus `branch_recovery_conflict`
  - preservation coverage for true review-promotion action-required behavior
  - docs/task packet and registry evidence
- Constraints:
  - no manual `PR #751` conflict edit in the parent lane
  - no direct provider-linear-worker start
  - no broad provider-worker rewrite
  - no weakening review-promotion action-required for true `In Review` / `Human Review` failures
  - no bypass of `Rework` reset semantics

## Issue-Shaping Contract
- User-request translation carried forward: CO-493 is a control-host recovery fix for stale review-promotion metadata after a branch-conflict Rework reset, not a PR merge-conflict lane or supervisor restart lane.
- Protected terms / exact artifact and surface names:
  - `Rework`
  - `branch_recovery_conflict`
  - `provider_issue_post_worker_exit_refresh_pending`
  - `provider_issue_review_promotion_action_required`
  - `review_promotion`
  - `handoff_failed`
  - `PR #751`
  - `CO-486`
  - `control-host recovery`
  - `fresh Rework reset`
- Nearby wrong interpretations to reject:
  - manually resolving `PR #751` from the orchestrator parent
  - direct-starting provider-linear-worker outside control-host
  - treating supervisor restart as the root fix
  - moving Linear state only to game timestamps

## Architecture & Data
- Current behavior:
  - Branch recovery can move an issue to `Rework` with `branch_recovery_conflict`.
  - Older worker metadata can remain in provider/control-host state as `handoff_failed` with nested `review_promotion` action-required data.
  - Explicit recover/relaunch/nudge can accept `provider_issue_post_worker_exit_refresh_pending` but still fail to admit a fresh reset when stale review-promotion metadata remains authoritative.
- Target behavior:
  - Rehydrate/recover must compare stale review-promotion metadata against current live issue truth before using it as a blocker.
  - When live issue truth is active `Rework` and branch-conflict evidence is present, stale prior `review_promotion` action-required metadata is cleared, suppressed, or marked inactive for admission decisions.
  - `branch_recovery_conflict` evidence and old-run audit details remain available for operators, but they do not block a fresh `Rework` reset.
  - True current review handoff failures still preserve `provider_issue_review_promotion_action_required`.
- Likely parent-owned implementation surfaces to inspect:
  - control-host provider issue handoff rehydrate/recover logic
  - branch recovery conflict projection and intake state recording
  - review-promotion action-required persistence and status projection
  - focused tests around provider handoff, merge closeout branch recovery, and control-runtime rehydration

## Technical Requirements
- Functional requirements:
  1. Add a focused fixture for `CO-486`-style state: active `Rework`, `branch_recovery_conflict`, dirty/conflicting `PR #751` behind `PR #750`, and stale old-run `handoff_failed` / `provider_issue_review_promotion_action_required`.
  2. Make rehydrate/recovery logic clear or suppress stale `review_promotion` action-required metadata when live issue truth is active `Rework` and the stale metadata belongs to an older review handoff.
  3. Ensure `provider_issue_post_worker_exit_refresh_pending` remains a refresh step and does not become terminal active-capacity truth after refresh confirms a fresh `Rework` reset is needed.
  4. Preserve old-run and `branch_recovery_conflict` evidence for audit/status without treating stale review handoff metadata as current authority.
  5. Preserve true review-promotion action-required failures for current `In Review` / `Human Review` states.
  6. Validate that control-host recover for `CO-486` can admit or queue a fresh `Rework` attempt, then let provider workflow resolve `PR #751`.
- Non-functional requirements:
  - smallest local change in the recovery/rehydrate seam
  - no new lifecycle mode unless source inspection proves it is required
  - deterministic regression coverage
  - machine-readable reason strings stay explicit
- Interfaces / contracts:
  - `provider_issue_review_promotion_action_required` remains reserved for active review-promotion blockers
  - `provider_issue_post_worker_exit_refresh_pending` remains a transient revalidation reason
  - `branch_recovery_conflict` remains preserved branch-reset evidence
  - `Rework` remains the supported recovery state for branch-conflict reset

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required for the first fix; stale review-promotion metadata can be made subordinate to current live `Rework` truth at the existing rehydrate/recover boundary.
- Minor-seam decision: acceptable only if the new logic removes stale authority and keeps current live issue truth as the deciding input.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active `Rework` stale review-promotion metadata | Prior `handoff_failed` / `provider_issue_review_promotion_action_required` remains authoritative after live issue moved to `Rework` for `branch_recovery_conflict`. | `remove fallback` | CO-493 | Live issue is active `Rework` and branch-conflict evidence exists while stale review-promotion action-required belongs to an older worker run. | observed 2026-05-02 | 2026-05-02 | This issue | Rehydrate/recovery clears or suppresses stale `review_promotion` metadata and admits a fresh reset. | Focused stale-Rework regression plus control-host recover proof for CO-486. |
| True review handoff action-required | `provider_issue_review_promotion_action_required` still blocks real review-promotion failures in `In Review` / `Human Review`. | `justify retaining fallback` | Review-promotion handoff path | Current issue state remains a true review handoff state and action-required data is current. | Existing review-promotion behavior | 2026-05-02 | Durable review safety contract | Separate issue-quality review changes review-promotion safety semantics. | Focused preservation regression for true review handoff failures. |

- Contract name: True review-promotion action-required.
- Owning surface: provider review-handoff promotion.
- Steady-state proof: real `In Review` / `Human Review` action-required cases still fail closed after the CO-493 Rework fix.
- Tests/docs: focused provider handoff/control-host regression and CO-493 PRD/TECH_SPEC docs.
- Non-expiring rationale: review-promotion action-required is a durable review safety gate; CO-493 only removes stale authority after the issue has moved into active `Rework`.

## Validation Plan
- Focused tests:
  - stale active-`Rework` branch-conflict fixture with prior `handoff_failed` / `provider_issue_review_promotion_action_required`
  - recover/relaunch/nudge flow proving `provider_issue_post_worker_exit_refresh_pending` can proceed to admitted or queued fresh `Rework` reset after refresh
  - preservation test for true current `In Review` / `Human Review` review-promotion action-required
  - branch-conflict evidence projection/status assertion where practical
- Repo gates for parent implementation:
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
- Live/control-host validation:
  - after implementation, run supported control-host recover/relaunch/nudge for `CO-486`
  - record that a fresh `Rework` attempt is admitted or queued, or capture the exact actionable blocker if it is not
  - let the provider workflow resolve `PR #751` rather than manually resolving it from the parent lane

## Open Questions
- Parent source inspection must identify the exact stale metadata owner before code edits. If stale `review_promotion` is split across multiple lifecycle authorities, pause and widen ownership instead of adding another hidden fallback.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-02.
