# Task Checklist - CO-493

- Linear Issue: `CO-493` / `c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- Source Issue: `CO-486` / `6a92b5d9-3293-4e27-9bc5-28c8c62becfc`
- Task registry id: `20260502-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- MCP Task ID: `linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f`
- Primary PRD: `docs/PRD-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- TECH_SPEC: `tasks/specs/linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- Agent mirror: `.agent/task/linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`
- Canonical owner key: `control-host:rework-branch-conflict-stale-review-promotion`
- Source anchor: `ctx:sha256:558ddb6b0f78a449dd5d0e36c33ef67727b03fc7811585678fd513ddefe17f17#chunk:c000001`
- Child lane manifest: `.runs/linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f-docs-packet-r2/cli/2026-05-02T17-56-08-642Z-79d69d05/manifest.json`

## Docs-First
- [x] PRD drafted with user-request translation, intent checksum, non-goals, Not Done If, parity matrix, and fallback/refactor decision.
- [x] TECH_SPEC mirror drafted with issue-shaping contract, technical requirements, validation plan, and fallback/refactor decision.
- [x] Canonical task spec drafted under `tasks/specs/`.
- [x] ACTION_PLAN drafted with milestones, dependencies, validation, risks, and readiness gate.
- [x] Checklist mirrored to `.agent/task`.
- [x] Registry mirrors updated in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Protected Issue Terms
- [x] `Rework`
- [x] `branch_recovery_conflict`
- [x] `provider_issue_post_worker_exit_refresh_pending`
- [x] `provider_issue_review_promotion_action_required`
- [x] `review_promotion`
- [x] `handoff_failed`
- [x] `PR #751`
- [x] `CO-486`
- [x] `control-host recovery`
- [x] `fresh Rework reset`
- [x] `control-host:rework-branch-conflict-stale-review-promotion`

## Wrong Interpretations Rejected
- [x] manually resolving `PR #751` from the orchestrator parent
- [x] direct-starting provider-linear-worker outside control-host
- [x] treating supervisor restart as the root fix
- [x] moving Linear state only to game timestamps

## Acceptance
- [x] Parent reproduces stale state: active `Rework`, `branch_recovery_conflict`, `PR #751` dirty/conflicting behind `PR #750`, and stale old worker run `2026-05-02T15-12-45-555Z-8bb96e84` reporting `handoff_failed` / `provider_issue_review_promotion_action_required`.
- [x] Parent updates rehydrate/recovery logic so stale `review_promotion` is cleared or suppressed in active `Rework`.
- [x] Parent preserves true `provider_issue_review_promotion_action_required` behavior for current `In Review` / `Human Review` failures.
- [x] Parent adds focused regression coverage for stale Rework suppression and true review-promotion preservation.
- [ ] Parent validates control-host recover for `CO-486` can admit or queue a fresh `Rework` attempt.
- [ ] Parent recovers `CO-486` through control host and lets provider workflow resolve `PR #751`.

## Validation
- [x] Child docs lane protected-term grep over packet files.
- [x] Child docs lane JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] Child docs lane `git diff --check` over declared touched files.
- [x] Parent docs-review child stream completed with clean review telemetry.
- [x] Parent focused stale active-Rework regression.
- [x] Parent true review-promotion action-required preservation regression.
- [x] Parent validation chain: delegation guard, spec guard, build, lint, full test, docs:check, docs:freshness, repo:stewardship, diff-budget, pack:smoke, and git diff --check.
- [x] Parent manifest-backed standalone review completed as `bounded-success` after command-intent retry with no actionable findings.
- [x] Parent explicit elegance/minimality pass completed with no simplification required.
- [ ] Parent control-host recover/relaunch/nudge proof for `CO-486`.
- [ ] Parent PR checks, ready-review drain, and Linear handoff.

## CO-382 Fallback Metadata
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor check: parent can keep this scoped to stale-authority removal at the rehydrate/recover boundary unless source inspection proves review-promotion authority is split across lifecycle phases.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active `Rework` stale review-promotion metadata | Prior `handoff_failed` / `provider_issue_review_promotion_action_required` remains authoritative after live issue moved to `Rework` for `branch_recovery_conflict`. | `remove fallback` | CO-493 | Live issue is active `Rework` and branch-conflict evidence exists while stale review-promotion action-required belongs to an older worker run. | observed 2026-05-02 | 2026-05-02 | This issue | Rehydrate/recovery clears or suppresses stale `review_promotion` metadata and admits a fresh reset. | Focused stale-Rework regression plus control-host recover proof for CO-486. |
| True review handoff action-required | `provider_issue_review_promotion_action_required` still blocks real review-promotion failures in `In Review` / `Human Review`. | `justify retaining fallback` | Review-promotion handoff path | Current issue state remains a true review handoff state and action-required data is current. | Existing review-promotion behavior | 2026-05-02 | Durable review safety contract | Separate issue-quality review changes review-promotion safety semantics. | Focused preservation regression for true review handoff failures. |

- Contract name: True review-promotion action-required.
- Owning surface: provider review-handoff promotion.
- Steady-state proof: real `In Review` / `Human Review` action-required cases still fail closed after the CO-493 Rework fix.
- Tests/docs: focused provider handoff/control-host regression and the CO-493 packet.
- Non-expiring rationale: review-promotion action-required is durable review safety behavior, not temporary fallback behavior.

## Progress Log
- 2026-05-02: Bounded same-issue docs child lane created the CO-493 docs-first packet and registry mirrors from the parent-provided issue truth.
- 2026-05-02: Parent verified the worker run source payload and reconciled packet content to the parent source anchor.
- 2026-05-02: Parent implemented stale active-Rework review-promotion suppression, added focused provider handoff regression coverage, completed the full local validation chain, and recorded standalone review plus elegance evidence.
- 2026-05-02: Live `CO-486` control-host recovery remains a post-merge step because the running supervised control host resolves to shared clean `main`, not this unmerged issue workspace patch.

## Notes
- Parent owns Linear state, workpad, docs-review, source implementation, validation, PR lifecycle, and recovery of `CO-486`.
- NOTES: Goal: clear stale review-promotion metadata after Rework branch conflicts. | Summary: Scope is active Rework branch-conflict recovery, stale old-run review-promotion suppression/clearing, and true review-promotion preservation. | Risks: Do not broaden into manual PR #751 conflict repair, direct provider-linear-worker starts, supervisor restart, or Linear timestamp games.
