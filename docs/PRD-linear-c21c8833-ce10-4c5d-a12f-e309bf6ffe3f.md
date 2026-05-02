# PRD - CO-493 clear stale review-promotion metadata after Rework branch conflicts

## Traceability
- Linear issue: `CO-493` / `c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- Title: Control host: clear stale review-promotion metadata after Rework branch conflicts.
- Task registry id: `20260502-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- MCP Task ID: `linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- Source issue: `CO-486` / `6a92b5d9-3293-4e27-9bc5-28c8c62becfc`
- Follow-up issue: `CO-493` / `c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- Canonical owner key: `control-host:rework-branch-conflict-stale-review-promotion`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=control-host:rework-branch-conflict-stale-review-promotion`
- Stale worker run: `2026-05-02T15-12-45-555Z-8bb96e84`
- Source anchor: `ctx:sha256:558ddb6b0f78a449dd5d0e36c33ef67727b03fc7811585678fd513ddefe17f17#chunk:c000001`
- Child lane manifest: `.runs/linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f-docs-packet-r2/cli/2026-05-02T17-56-08-642Z-79d69d05/manifest.json`

## Summary
- Problem Statement: `CO-486` moved to `Rework` after `PR #751` became dirty/conflicting behind `PR #750`, but stale review-handoff metadata from old worker run `2026-05-02T15-12-45-555Z-8bb96e84` persisted as `handoff_failed` / `provider_issue_review_promotion_action_required`. Subsequent control-host relaunch/nudge returned `provider_issue_post_worker_exit_refresh_pending` without admitting a fresh `Rework` reset, so the active Rework branch-conflict path could remain parked behind stale review-promotion truth.
- Desired Outcome: control-host recovery treats active `Rework` plus `branch_recovery_conflict` as fresh branch-reset truth, clears or suppresses stale `review_promotion` action-required metadata from prior review handoff, and admits or queues a fresh `Rework` attempt while preserving true review-promotion failures for `In Review` / `Human Review`.

## User Request Translation
- User intent / needs: turn the CO-486 recurrence into a bounded implementation contract for the control-host recovery lane, not a manual PR-conflict repair or Linear timestamp game.
- Success criteria / acceptance:
  - Reproduce the stale state: `CO-486` active in `Rework`, `PR #751` dirty/conflicting behind `PR #750`, stale old worker run metadata still reporting `handoff_failed` / `provider_issue_review_promotion_action_required`, and explicit recover/relaunch/nudge returning `provider_issue_post_worker_exit_refresh_pending`.
  - Update rehydrate/recovery logic so stale `review_promotion` action-required metadata is cleared or suppressed when live issue truth is active `Rework` with `branch_recovery_conflict`.
  - Preserve review-promotion action-required behavior for true `In Review` / `Human Review` handoff failures.
  - Add focused regression coverage for the stale Rework branch-conflict shape and for the preserved true review-promotion failure shape.
  - Validate control-host recover for `CO-486` can admit or queue a fresh `Rework` attempt after refresh, then recover `CO-486` through the control host and let the provider workflow resolve `PR #751`.
- Constraints / non-goals:
  - no parent-side merge-conflict edit for `PR #751`
  - no direct provider-linear-worker start
  - no broad provider-worker rewrite
  - no weakening `review_promotion` action-required behavior for true `In Review` / `Human Review` failures
  - no bypass of `Rework` reset semantics

## Intent Checksum
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

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| `CO-486` Linear state | Active `Rework` after branch recovery moved it out of review handoff. | `Rework` is the supported reset state for branch-conflict recovery. | Active `Rework` controls recovery admission over stale prior review-promotion metadata. | Linear-only state churn to advance timestamps. |
| Branch conflict evidence | `PR #751` became dirty/conflicting behind `PR #750`, producing `branch_recovery_conflict`. | Branch-conflict recovery should preserve audit evidence while launching a fresh reset. | `branch_recovery_conflict` remains visible and does not get erased by stale `handoff_failed` metadata. | Parent-side manual merge-conflict edits for `PR #751`. |
| Stale worker metadata | Old run `2026-05-02T15-12-45-555Z-8bb96e84` persisted `handoff_failed` / `provider_issue_review_promotion_action_required`. | Review-promotion action-required is authoritative only while it describes the current review handoff state. | Active `Rework` suppresses or clears stale `review_promotion` action-required metadata from prior handoff. | Weakening real `In Review` / `Human Review` failures. |
| Recover/relaunch/nudge | Relaunch/nudge accepted `provider_issue_post_worker_exit_refresh_pending` but did not admit a fresh reset. | Refresh-pending is a short revalidation state, not terminal active capacity. | After refresh confirms active `Rework`, recover/relaunch/nudge admits or queues a fresh `Rework` attempt. | Direct provider-linear-worker starts outside control-host. |

## Current Evidence
- 2026-05-02: `CO-486` moved to `Rework` after `PR #751` became dirty/conflicting behind `PR #750`.
- 2026-05-02: old worker run `2026-05-02T15-12-45-555Z-8bb96e84` still carried `handoff_failed` / `provider_issue_review_promotion_action_required`.
- 2026-05-02: control-host relaunch/nudge returned `provider_issue_post_worker_exit_refresh_pending` without admitting a fresh `Rework` reset.
- 2026-05-02: parent verified the worker run source payload and reconciled this packet to the parent source anchor.

## Not Done If
- `CO-486` in `Rework` can remain parked on stale `review_promotion` action-required metadata.
- recover/relaunch/nudge returns accepted refresh-pending without eventually admitting a fresh `Rework` run.
- The fix loses `branch_recovery_conflict` evidence or treats stale review handoff metadata as authoritative in active `Rework`.
- True `In Review` / `Human Review` review-promotion action-required behavior is weakened.
- The accepted solution is a parent-side manual conflict edit, direct worker start, supervisor restart, or Linear timestamp shuffle.

## Goals
- Clear or suppress stale review-promotion metadata when live issue truth is active `Rework` branch-conflict recovery.
- Preserve branch-conflict audit evidence and review-promotion action-required behavior for real review states.
- Add focused regression coverage for the stale CO-486 shape and the preserved handoff-failure shape.
- Recover CO-486 through control-host-managed provider workflow so `PR #751` resolution happens in the proper provider lane.

## Non-Goals
- No manual merge-conflict resolution for `PR #751` in the orchestrator parent.
- No direct provider-linear-worker start.
- No broad provider-worker lifecycle rewrite.
- No weakening of review-promotion action-required semantics for true review handoff failures.
- No bypass or replacement of Rework reset semantics.

## Stakeholders
- Product: CO operators watching provider-worker queue and Rework recovery state.
- Engineering: control-host recovery, provider-worker, and review-handoff maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary success metrics:
  - focused stale-Rework regression fails before the fix and passes after
  - active `Rework` plus `branch_recovery_conflict` admits or queues a fresh reset after refresh
  - `branch_recovery_conflict`, `PR #751`, and stale old-run evidence remain auditable
  - true `provider_issue_review_promotion_action_required` review handoff failures remain protected
- Guardrails / error budgets:
  - zero direct provider-linear-worker starts
  - zero manual `PR #751` conflict edits by the parent
  - zero Linear-state-only timestamp games
  - zero broad provider-worker rewrite

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required for the first fix; this lane removes one stale cached review-promotion authority path in active `Rework` without redefining the entire provider-worker lifecycle.
- Minor-seam decision: acceptable only if stale `review_promotion` is treated as suppressed/cleared by current live state and `branch_recovery_conflict`, not as another long-lived parallel authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active `Rework` stale review-promotion metadata | Prior `handoff_failed` / `provider_issue_review_promotion_action_required` remains authoritative after live issue moved to `Rework` for `branch_recovery_conflict`. | `remove fallback` | CO-493 | Live issue is active `Rework` and branch-conflict evidence exists while stale review-promotion action-required belongs to an older worker run. | observed 2026-05-02 | 2026-05-02 | This issue | Rehydrate/recovery clears or suppresses stale `review_promotion` metadata and admits a fresh reset. | Focused stale-Rework regression plus control-host recover proof for CO-486. |
| True review handoff action-required | `provider_issue_review_promotion_action_required` still blocks real review-promotion failures in `In Review` / `Human Review`. | `justify retaining fallback` | Review-promotion handoff path | Current issue state remains a true review handoff state and action-required data is current. | Existing review-promotion behavior | 2026-05-02 | Durable review safety contract | Separate issue-quality review changes review-promotion safety semantics. | Focused preservation regression for true review handoff failures. |

- Contract name: True review-promotion action-required.
- Owning surface: provider review-handoff promotion.
- Steady-state proof: real `In Review` / `Human Review` action-required cases still fail closed after the CO-493 Rework fix.
- Tests/docs: focused provider handoff/control-host regression and this CO-493 packet.
- Non-expiring rationale: review-promotion action-required is a durable review safety gate; CO-493 only removes stale authority after the issue has moved into active `Rework`.

## Open Questions
- None for packet creation. Parent implementation should confirm the exact source seam before code changes and stop if the fix requires broader provider-worker lifecycle ownership.

## Approvals
- Product: Linear CO-493.
- Engineering: provider-worker parent lane.
- Design: N/A.
