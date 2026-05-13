# ACTION_PLAN - linear-97d69ad8-ba75-432f-b8b2-21ca83754325

## Summary
- Goal: eliminate manual author refresh and conflict triage for green-but-dirty PRs by adding one bounded autonomous recovery path across review handoff and `Merging`.
- Scope: docs-first packet, local workpad source, audited docs-review child stream, one shared branch-refresh helper, additive provider proof persistence, focused regressions, and the normal validation/review flow.
- Assumptions:
  - `gh pr update-branch` is the narrowest correct GitHub-side recovery primitive for this lane
  - conflict-shaped recovery failures should transition the issue to `Rework` instead of remaining in `In Review` or `Merging`
  - existing `pr-watch-merge` snapshot truth is already the right source of blocker classification

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `BEHIND`, `DIRTY`, `In Review`, `Merging`, `Rework`, `pr-watch-merge.js`, `providerMergeCloseout.ts`, `mergeStateStatus`, and exact recovery-attempt truth.
- Not done if: green `BEHIND` PRs still need manual refresh, conflicting PRs still sit in review or merge without `Rework`, or recovery attempts are not persisted in machine-checkable proof.
- Pre-implementation issue-quality review: approved. The bounded seam is shared branch refresh plus provider reuse, not a broader merge-closeout redesign.

## Milestones & Sequencing
1. Create the `CO-140` docs packet, checklist mirrors, registry entries, and local workpad source; retry the initially blocked Linear transition and workpad upsert once the shared-budget cooldown clears, then keep the mirrors truthful with the successful retry evidence.
2. Run audited `linear child-stream --pipeline docs-review`, record the manifest, and resolve any spec ambiguity before code.
3. Add a shared branch-recovery helper in `pr-watch-merge.js` plus focused watcher tests.
4. Reuse that helper in review-handoff promotion and deterministic merge closeout, persisting exact recovery-attempt truth and `Rework` fallback metadata.
5. Add focused regressions for `BEHIND` refresh, `DIRTY` rework fallback, resumed monitoring after refresh, and persisted claim behavior.
6. Run the required validation floor, standalone review, explicit elegance review, and refresh the workpad before any PR or review handoff.

## Dependencies
- `scripts/lib/pr-watch-merge.js`
- `scripts/lib/pr-watch-merge.d.ts`
- `tests/pr-watch-merge.spec.ts`
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderIssueObservability.test.ts` if observability text changes

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-97d69ad8-ba75-432f-b8b2-21ca83754325 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-140-docs-review --format json`
  - focused regression coverage for watcher recovery and provider recovery/rework behavior
  - required repo validation floor after implementation
  - manifest-backed standalone review and explicit elegance review before handoff
- Rollback plan:
  - revert the shared recovery helper and the provider reuse together so the code returns to pre-CO-140 action-required behavior without leaving stale recovery-attempt fields half-used

## Risks & Mitigations
- Risk: recovery logic diverges from the existing snapshot classifier.
  - Mitigation: keep blocker classification in `resolveActionRequiredReasons(...)` and add recovery around it rather than replacing it.
- Risk: a GitHub update-branch request succeeds asynchronously but the immediate follow-up snapshot still looks stale.
  - Mitigation: treat successful refresh requests as resumed watching unless a stronger merged or ready state is already visible.
- Risk: conflict failures stay ambiguous.
  - Mitigation: record exact recovery-attempt stderr/stdout and transition explicit conflict-shaped failures into `Rework`.
- Risk: Linear shared-budget cooldown blocks required issue/workpad mutations during the worker lane.
  - Mitigation: keep the local workpad source and docs packet current, retry the live mutations before review handoff, and once the cooldown clears replace the temporary blocked wording with the successful retry evidence across the mirrored task packet.

## Approvals
- Reviewer: pending `docs-review` child stream
- Date: 2026-04-10
