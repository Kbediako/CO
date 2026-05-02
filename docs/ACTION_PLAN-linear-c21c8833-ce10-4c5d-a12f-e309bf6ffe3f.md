# ACTION_PLAN - CO-493 clear stale review-promotion metadata after Rework branch conflicts

## Summary
- Goal: allow active `Rework` branch-conflict recovery to proceed even when stale prior review-promotion metadata still says `handoff_failed` / `provider_issue_review_promotion_action_required`.
- Scope: control-host rehydrate/recover logic, stale `review_promotion` suppression or clearing, focused tests, docs packet, validation, and parent-owned recovery of `CO-486`.
- Assumptions:
  - `CO-486` is the source issue and `CO-493` is the follow-up owner.
  - `PR #751` remains provider-workflow-owned; the parent should not manually resolve its conflict.
  - Current live `Rework` plus `branch_recovery_conflict` is stronger admission truth than stale prior review-handoff metadata.
  - True current review-promotion action-required behavior remains required.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - `CO-486` in `Rework` can remain parked on stale `review_promotion` action-required metadata
  - recover/relaunch/nudge returns accepted refresh-pending without eventually admitting a fresh `Rework` run
  - fix loses `branch_recovery_conflict` evidence or treats stale review handoff metadata as authoritative in active `Rework`
  - true `In Review` / `Human Review` review-promotion action-required behavior is weakened
- Pre-implementation issue-quality review:
  - CO-493 is specific and implementation-ready: the root is stale current-state authority at the control-host rehydrate/recover boundary after a Rework branch-conflict reset.
  - The micro-task path is unavailable because exact stale/cached review-promotion semantics, Rework reset semantics, and protected reason strings define correctness.
- Fallback / refactor decision:
  - `remove fallback`: stale review-promotion metadata must not remain authoritative after live issue truth moves to active `Rework` for branch-conflict recovery.
  - `justify retaining fallback`: true review-promotion action-required behavior remains a durable review safety gate.
- Large-refactor decision: not required unless parent source inspection finds split lifecycle authorities that cannot be corrected at the current rehydrate/recover seam.
- Minor-seam decision: acceptable only as stale-authority removal; do not add a second long-lived authority path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active `Rework` stale review-promotion metadata | Prior `handoff_failed` / `provider_issue_review_promotion_action_required` remains authoritative after live issue moved to `Rework` for `branch_recovery_conflict`. | `remove fallback` | CO-493 | Live issue is active `Rework` and branch-conflict evidence exists while stale review-promotion action-required belongs to an older worker run. | observed 2026-05-02 | 2026-05-02 | This issue | Rehydrate/recovery clears or suppresses stale `review_promotion` metadata and admits a fresh reset. | Focused stale-Rework regression plus control-host recover proof for CO-486. |
| True review handoff action-required | `provider_issue_review_promotion_action_required` still blocks real review-promotion failures in `In Review` / `Human Review`. | `justify retaining fallback` | Review-promotion handoff path | Current issue state remains a true review handoff state and action-required data is current. | Existing review-promotion behavior | 2026-05-02 | Durable review safety contract | Separate issue-quality review changes review-promotion safety semantics. | Focused preservation regression for true review handoff failures. |

- Contract name: True review-promotion action-required.
- Owning surface: provider review-handoff promotion.
- Steady-state proof: real `In Review` / `Human Review` action-required cases still fail closed after the CO-493 Rework fix.
- Tests/docs: focused provider handoff/control-host regression and the CO-493 packet.
- Non-expiring rationale: review-promotion action-required is supported review safety behavior, not temporary fallback behavior.

This parity matrix keeps the CO-493 packet boundaries reviewer-visible across the active incident, the stale prior-run metadata, and the intended fresh reset.

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| `CO-486` | Active `Rework` after `PR #751` became dirty/conflicting behind `PR #750` | `Rework` branch-conflict recovery should reset provider work | Active `Rework` admits or queues a fresh reset |
| `branch_recovery_conflict` | Present as branch-conflict evidence | Branch conflict evidence is operator-auditable and should not be erased | Preserved while no longer blocked by stale review-promotion metadata |
| old worker run | `2026-05-02T15-12-45-555Z-8bb96e84` persisted stale action-required data | Prior-run metadata is audit evidence, not current authority after Rework reset | Suppressed/cleared for admission decisions when live Rework is current |
| `provider_issue_post_worker_exit_refresh_pending` | Accepted refresh pending can park without fresh reset admission | Refresh pending should revalidate and then converge | Proceeds to admitted/queued fresh Rework attempt or deterministic actionable failure |
| true review handoff failures | Still need `provider_issue_review_promotion_action_required` | Review-promotion safety gate remains fail-closed | Preserved for current `In Review` / `Human Review` states |
| `PR #751` | Dirty/conflicting behind `PR #750` | Provider workflow owns branch repair | Provider workflow resolves after fresh Rework reset |

## Milestones & Sequencing
1. Parent establishes live issue/workpad state, accepts this docs packet, and records the active Rework recovery plan.
2. Inspect the stale metadata owner and rehydrate/recover admission path before code edits.
3. Add a focused regression for the CO-486 stale active-Rework shape.
4. Add a preservation regression for true current review-promotion action-required in `In Review` / `Human Review`.
5. Implement the smallest change that clears or suppresses stale `review_promotion` metadata when live issue truth is active `Rework` with `branch_recovery_conflict`.
6. Run focused tests, then required repo gates and manifest-backed review.
7. Run supported control-host recover/relaunch/nudge for `CO-486` and record whether a fresh `Rework` attempt is admitted or queued.
8. Let the provider workflow resolve `PR #751`, then complete PR review and Linear handoff under parent ownership.

## Dependencies
- Parent-owned live issue truth for `CO-486` and `CO-493`.
- Control-host recover/relaunch/nudge command path.
- Existing branch recovery and review-promotion tests.
- Adjacent boundaries:
  - `PR #751` conflict resolution remains provider workflow scope
  - supervisor restart is not the root fix
  - direct provider-linear-worker launch remains forbidden

## Validation
- Checks / tests:
  - focused stale-Rework branch-conflict regression
  - focused true review-promotion action-required preservation regression
  - focused recover/relaunch/nudge convergence proof for `provider_issue_post_worker_exit_refresh_pending`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed review via `TASK=<task-id> NOTES="..." MANIFEST=<path> codex-orchestrator review --manifest <path>` or equivalent wrapper evidence
  - elegance/minimality review
  - `npm run pack:smoke` if required by touched CLI/package surface
- Pre-merge/review-handoff condition:
  - unresolved actionable review threads must be `0`, or a waiver with owner, expiry, reason, and evidence must be recorded before merge/handoff
  - control-host recovery evidence for `CO-486` must show fresh reset admission/queueing or an exact blocker
- Rollback plan:
  - Revert the stale-metadata suppression/clearing change and focused tests if true review-promotion handoff failures regress.
  - If validation shows the issue is actually split lifecycle authority, move CO-493 to blocked or relaunch with widened ownership instead of layering a hidden fallback.

## Risks & Mitigations
- Risk: the fix treats all `provider_issue_review_promotion_action_required` as stale.
  - Mitigation: gate suppression on current active `Rework` plus branch-conflict recovery evidence and add true-review-state preservation coverage.
- Risk: `branch_recovery_conflict` audit evidence is lost when stale metadata is cleared.
  - Mitigation: keep old-run and branch-conflict evidence in status/audit projection while removing it as current admission authority.
- Risk: `provider_issue_post_worker_exit_refresh_pending` keeps parking the issue.
  - Mitigation: validate recover/relaunch/nudge reaches fresh Rework admission/queueing or deterministic actionable failure.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-02.
