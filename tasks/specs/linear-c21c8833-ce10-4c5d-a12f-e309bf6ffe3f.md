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

This mirror points to the canonical docs-facing TECH_SPEC at `docs/TECH_SPEC-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`.

## Scope
- Clear or suppress stale `review_promotion` metadata when live issue truth is active `Rework` with `branch_recovery_conflict`.
- Ensure stale old-run `handoff_failed` / `provider_issue_review_promotion_action_required` does not block fresh Rework reset admission after refresh.
- Preserve `branch_recovery_conflict`, `PR #751`, `CO-486`, and old-run evidence as audit/status context.
- Preserve true review-promotion action-required behavior for current `In Review` / `Human Review` failures.
- Keep parent-side `PR #751` conflict edits, direct provider-linear-worker starts, supervisor-restart-only fixes, and Linear timestamp games out of scope.

## Technical Requirements
- Reproduce the CO-486 shape: active `Rework`, dirty/conflicting `PR #751` behind `PR #750`, stale old worker run `2026-05-02T15-12-45-555Z-8bb96e84`, and stale `handoff_failed` / `provider_issue_review_promotion_action_required`.
- Update rehydrate/recovery admission so active `Rework` plus `branch_recovery_conflict` makes stale prior `review_promotion` action-required metadata non-authoritative for fresh reset admission.
- Keep `provider_issue_post_worker_exit_refresh_pending` as a transient refresh state that must converge to fresh reset admission, queueing, or deterministic actionable failure.
- Add focused tests for stale active-Rework suppression/clearing and true review-promotion preservation.
- Validate control-host recover for `CO-486` can admit or queue a fresh Rework attempt before provider workflow resolves `PR #751`.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required unless parent source inspection finds split lifecycle authorities beyond the rehydrate/recover boundary.
- Minor-seam decision: acceptable because the change removes stale authority in active `Rework`; it must not create another long-lived fallback branch.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active `Rework` stale review-promotion metadata | Prior `handoff_failed` / `provider_issue_review_promotion_action_required` remains authoritative after live issue moved to `Rework` for `branch_recovery_conflict`. | `remove fallback` | CO-493 | Live issue is active `Rework` and branch-conflict evidence exists while stale review-promotion action-required belongs to an older worker run. | observed 2026-05-02 | 2026-05-02 | This issue | Rehydrate/recovery clears or suppresses stale `review_promotion` metadata and admits a fresh reset. | Focused stale-Rework regression plus control-host recover proof for CO-486. |
| True review handoff action-required | `provider_issue_review_promotion_action_required` still blocks real review-promotion failures in `In Review` / `Human Review`. | `justify retaining fallback` | Review-promotion handoff path | Current issue state remains a true review handoff state and action-required data is current. | Existing review-promotion behavior | 2026-05-02 | Durable review safety contract | Separate issue-quality review changes review-promotion safety semantics. | Focused preservation regression for true review handoff failures. |

- Contract name: True review-promotion action-required.
- Owning surface: provider review-handoff promotion.
- Steady-state proof: real `In Review` / `Human Review` action-required cases still fail closed after this Rework stale-metadata fix.
- Tests/docs: focused provider handoff/control-host regression and the CO-493 task/TECH_SPEC packet.
- Non-expiring rationale: review-promotion action-required is durable review safety behavior; CO-493 removes only stale authority after active Rework reset.

## Validation Plan
- Focused stale active-`Rework` branch-conflict regression.
- Focused true review-promotion action-required preservation regression.
- Focused recover/relaunch/nudge convergence proof for `provider_issue_post_worker_exit_refresh_pending`.
- Required gates: build, lint, unit tests, docs:check, docs:freshness, repo:stewardship, diff-budget, standalone review, and elegance review, with evidence recorded in the provider-worker checklist.

## Non-Goals
- No parent-side manual merge-conflict edit for `PR #751`.
- No direct provider-linear-worker start.
- No broad provider-worker lifecycle rewrite.
- No weakening of review-promotion action-required behavior for true review states.
- No bypass of Rework reset semantics.
