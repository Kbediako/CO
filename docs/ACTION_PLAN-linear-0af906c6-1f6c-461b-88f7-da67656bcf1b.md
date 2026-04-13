# ACTION_PLAN - linear-0af906c6-1f6c-461b-88f7-da67656bcf1b

## Summary
- Goal: ship a repo-tracked operator-autopilot mode that can keep CO queue shepherding alive outside a single interactive turn.
- Scope: docs-first packet, audited docs-review child stream, bounded operator-autopilot control-plane implementation, structured audit output, focused regressions, and the normal validation/review handoff flow.
- Assumptions:
  - the existing dispatch sort order is the right backlog priority truth for the first slice
  - current review-promotion and merge-closeout seams are the correct reuse points for operator-autopilot decisions

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `operator autopilot`, `queue shepherding`, `Backlog`, `Ready`, `Merging`, `Rework`, `control-host`, `providerIssueHandoff.ts`, `providerMergeCloseout.ts`, and explicit auditability.
- Not done if: queue shepherding still depends on a human keeping a single chat turn alive, or if the shipped mode only observes and never takes bounded operator actions.
- Pre-implementation issue-quality review: approved. The real remaining gap is above the already-landed `CO-116` / `CO-111` seams and belongs in bounded control-plane operator policy, not in launchd or passive monitoring.

## Milestones & Sequencing
1. Create the CO-118 docs packet, checklist mirrors, local workpad source, and registry entries, then upsert the single workpad comment.
2. Keep `docs/TASKS.md` within policy after adding the new snapshot so the packet is truthfully reviewable.
3. Run audited `linear child-stream --pipeline docs-review`, record the manifest, and resolve any blocking spec ambiguity before code. If forced standalone review fails for tooling reasons without a concrete verdict, record the failure class plus a manual docs-review fallback instead of stalling the lane.
4. Add a dedicated operator-autopilot control module plus repo-config metadata and invoke it from the provider refresh loop.
5. Reuse existing review-promotion truth for `Merging` and add bounded `Rework` transitions plus backlog-head `Backlog` -> queued-state promotion.
6. Surface pending local rollout actions and durable structured audit output, then add focused regressions.
7. Run the required validation floor, standalone review, explicit elegance review, and workpad refresh before any PR or review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `codex.orchestrator.json`
- focused control-plane tests

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-0af906c6-1f6c-461b-88f7-da67656bcf1b node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-118-docs-review --format json`
  - focused operator-autopilot unit and handoff integration tests
  - required repo validation floor after implementation
  - manifest-backed standalone review and explicit elegance review before handoff
- Rollback plan:
  - revert the operator-autopilot module, config payload, and refresh-loop integration together so queue policy returns to the pre-CO-118 manual state without leaving partial automation truth behind

## Risks & Mitigations
- Risk: backlog promotion diverges from the existing dispatch order or mutates another operator's lane.
  - Mitigation: reuse `sortLiveLinearTrackedIssuesForDispatch(...)` as the only queue order in the first slice, require current-viewer-or-unassigned ownership before mutation, and stop after one queue-head promotion per cycle.
- Risk: the operator-autopilot moves review handoffs to `Rework` too aggressively.
  - Mitigation: only use existing persisted review-promotion/action-required truth for author-action-required reasons, and explicitly exempt `review=REVIEW_REQUIRED`, `label:do-not-merge`, and `required_checks_query_failed` from the rework path.
- Risk: post-merge local rollout is still invisible.
  - Mitigation: surface explicit pending operator actions whenever merged closeout truth lands and no in-scope rollout automation is present.
- Risk: the new mode becomes an opaque background loop.
  - Mitigation: keep config repo-tracked, emit structured results into the control-host run directory, and project the latest result through control-plane observability.

## Approvals
- Reviewer: Codex manual docs-review fallback after `docs-review` rerun `.runs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b-co-118-docs-review-r2/cli/2026-04-09T09-04-17-041Z-fb44e299/manifest.json` failed as `review_outcome=failed-other` because the reviewer model was at capacity
- Date: 2026-04-09
