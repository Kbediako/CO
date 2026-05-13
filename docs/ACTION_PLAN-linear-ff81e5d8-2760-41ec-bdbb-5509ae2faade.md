# ACTION_PLAN - CO: release rehydrated Merging claims after merged PR when live Linear reads are cooldown-suppressed

## Added by Bootstrap 2026-04-09

## Summary
- Goal: stop merged provider lanes from surviving restart or rehydrate as active `Merging` work when live Linear rereads are under shared-budget cooldown.
- Scope:
  - docs-first packet, registry mirrors, and workpad source
  - cache-aware deterministic merge closeout
  - active-run merged recovery probe in handoff refresh or rehydrate
  - focused regression coverage and normal validation or review gates
- Assumptions:
  - same-run cached issue-context artifacts exist for the incident class because the provider worker already touched Linear before cooldown suppression
  - GitHub snapshot truth remains available even when Linear reads are cooled down

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider_issue_rehydrated_active_run`, `merge_closeout`, `Merging`, `CO STATUS`, `providerIssueHandoff.ts`, `providerMergeCloseout.ts`, `providerIssueObservability.ts`, `providerLinearWorkflowFacade.ts`
- Not done if:
  - merged lanes can still remain `running` with `merge_closeout: null` after restart or rehydrate
  - cooldown-suppressed `issue-context` reads still force local truth to wait for later live rereads before claim retirement
- Pre-implementation issue-quality review:
  - current code audit confirms the remaining defect is not renderer-only and not already solved by `CO-100`: merge closeout still hard-fails on a live issue-context read, and active-run recovery still preserves `provider_issue_rehydrated_active_run` before merged-closeout recovery can intervene.

## Milestones & Sequencing
1. Draft the `CO-111` docs packet, registry mirrors, and saved workpad source.
2. Run an audited `linear child-stream --pipeline docs-review` pass and record any truthful fallback needed for repo-wide docs baselines.
3. Implement cached issue-context fallback plus active-run merged recovery in the provider-control surfaces.
4. Add focused regressions for cooldown-suppressed closeout and active-run merged recovery while preserving open-PR active-lane behavior.
5. Run scoped and repo validation, refresh the workpad, and prepare review handoff.

## Dependencies
- `provider-linear-issue-context-cache.json` beside provider-worker runs
- GitHub PR snapshot truth from `scripts/lib/pr-watch-merge.js`
- cited `CO-109` artifacts in `.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/...`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - focused provider closeout or handoff tests for the new seams
  - repo validation floor before review handoff
- Rollback plan:
  - revert the new cache fallback and active-run merged recovery gate together if they misclassify ordinary open-PR `Merging` work as completed

## Risks & Mitigations
- Risk: active merge shepherding with an open PR could be downgraded prematurely.
  - Mitigation: require a merged PR probe result before invoking full deterministic merge closeout for an active rehydrated run.
- Risk: cached issue-context fallback could use the wrong run or issue.
  - Mitigation: require exact issue id match and same source-setup match on the cached record.
- Risk: transition or reread failure after merge still leaves ambiguous local truth.
  - Mitigation: persist explicit `merge_closeout` details and leave the claim non-running even when the final Linear transition step fails closed.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-09
