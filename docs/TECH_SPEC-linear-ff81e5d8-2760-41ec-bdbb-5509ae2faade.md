# TECH_SPEC - CO: release rehydrated Merging claims after merged PR when live Linear reads are cooldown-suppressed

## Added by Bootstrap 2026-04-09

## Summary
- Objective: make merged-lane claim retirement deterministic when refresh or rehydrate encounters a surviving `provider_issue_rehydrated_active_run` during shared-budget cooldown, so local truth no longer depends on a successful fresh `issue-context` reread.
- Scope:
  - add a bounded cached issue-context fallback for deterministic merge closeout
  - add a merged-PR recovery probe for rehydrated active `Merging` runs before blindly preserving them as `running`
  - persist explicit `merge_closeout` truth on the downgraded or retired claim
  - add focused regression coverage for cached issue-context fallback and active-run merged recovery
- Constraints:
  - preserve ordinary live merge shepherding behavior for open PRs
  - keep the solution inside provider handoff, merge closeout, workflow cache, and observability seams
  - avoid broad Linear budgeting or renderer changes

## Problem Decomposition
1. `runProviderDeterministicMergeCloseout(...)` currently fails at the first live `getProviderLinearIssueContext(...)` call, even when a same-run cached issue-context artifact already contains the attached PR URL needed to continue deterministic closeout under cooldown.
2. `refresh()` and `rehydrate()` currently preserve a rehydrated active run in `Merging` before any merged-closeout recovery logic can override that state when the worker itself is still alive.
3. The `CO-109` run artifacts prove the necessary fallback evidence already exists locally:
   - cached issue context beside the run
   - prior attached PR truth
   - GitHub snapshot truth for the attached PR
   - shared-root git truth in `/Users/kbediako/Code/CO`

## Design
- Add a cache-aware issue-context load path for deterministic merge closeout:
  - prefer live `issue-context` when available
  - when the live read fails because Linear shared-budget cooldown suppresses it, fall back to a same-run cached issue-context record if it matches the issue id and source setup
  - use the cached issue context only for attached-PR and workflow-state context, not as a blanket replacement for all live Linear reads everywhere
- Add a side-effect-free merged-closeout probe for rehydrated active `Merging` runs:
  - use the cached issue-context artifact from the run directory to recover same-repo attached PR context
  - fetch GitHub snapshot truth for the selected attached PR
  - only if the snapshot already shows `MERGED` should refresh or rehydrate invoke the full deterministic merge-closeout path for the active run
  - keep ordinary open-PR `Merging` runs in `running`
- Preserve machine-visible closeout truth:
  - once merged recovery succeeds or fails in a bounded way, persist `merge_closeout` on the claim
  - the claim must leave `state: "running"` for this path even if a later live Linear transition or verification step remains blocked by cooldown

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
- Expected tests:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts` if progress or projected status semantics change

## Protected Expectations
- Ordinary active merge shepherding with an open or not-yet-merged attached PR must not be retired.
- Cached issue-context fallback must remain bounded to same-run provider-worker artifacts.
- `merge_closeout` must become machine-visible for the recovery path instead of staying null.
- Local truth must stop projecting the lane as active `Merging` once merged-closeout recovery is authoritative.

## Reject These Wrong Interpretations
- `issue-context` fallback means every Linear read should become cache-backed
- a merged PR snapshot alone is enough to mutate any active run without attached-PR provenance
- this lane can be solved in `CO STATUS` formatting without handoff/closeout changes
- a cooldown-blocked transition should keep the claim `running`

## Current Truth
- `providerLinearWorkflowFacade.ts` already writes `provider-linear-issue-context-cache.json` beside the provider run when `issue-context`, `transition`, or workpad mutations succeed.
- `providerMergeCloseout.ts` does not currently reuse that cache when live `issue-context` fails.
- `providerIssueHandoff.ts` only attempts deterministic merge closeout for terminal recovered runs; it still preserves ordinary `in_progress` active runs even when merged PR truth is already locally recoverable.
- current local intake has already eventually released `CO-109`, but only after cooldown expiry allowed a later successful reread.

## Proposed Design
- Export or add a narrow cache-read helper so merge closeout can consume same-run cached issue context.
- Extend deterministic merge closeout with:
  - optional cached issue-context path input
  - a probe-only mode that inspects attached PR and snapshot truth without running merge, shared-root, or Linear transition mutations
- Extend handoff recovery so rehydrated active `Merging` runs:
  - preserve current behavior when there is no cached attached-PR evidence or the PR is not yet merged
  - switch into deterministic merge-closeout recovery when the probe proves the attached PR is already merged
- Keep observability logic compatible with the resulting non-running claim and explicit `merge_closeout` record.

## Non-Goals
- Broad cache fallback for general Linear operations.
- Changing the shared-budget budgeting rules.
- Reworking merge-closeout PR disambiguation beyond cached context reuse.
- Rewriting `CO STATUS`.

## Parity / Alignment Matrix
- Current truth:
  - cached issue context exists but deterministic merge closeout ignores it
  - active-run rehydrate preserves `provider_issue_rehydrated_active_run` too early for the `CO-109` incident shape
  - merged-lane recovery only becomes truthful after cooldown expiry
- Reference truth:
  - authoritative merged-closeout recovery should not depend on a second successful Linear read when local evidence is already sufficient
  - active runs should only stay active when the attached PR is not yet proven merged
- Target truth / intended delta:
  - cached issue context plus GitHub snapshot truth can retire or downgrade a stale merged active claim
  - ordinary open-PR active merge lanes remain active
  - local projected truth carries explicit merge-closeout metadata instead of null
- Explicitly out-of-scope differences:
  - general cache rearchitecture
  - unrelated control-host lifecycle fixes
  - renderer or dashboard redesign

## Validation Plan
- Tests / checks:
  - add a merge-closeout regression proving cached issue-context fallback continues deterministic closeout when live `issue-context` is rate-limited
  - add a handoff regression proving a rehydrated active `Merging` run with cached attached PR context and merged snapshot truth no longer stays `running`
  - preserve existing regressions that ordinary live open-PR merge shepherding does not trigger deterministic closeout
- Rollout verification:
  - inspect the cited `CO-109` artifacts and confirm the new path matches the reproduced shape
  - confirm the final claim carries non-null `merge_closeout` and leaves `state: "running"` on the reproduced scenario
- Monitoring / alerts:
  - keep `ProviderIssueObservability` and `CO STATUS` surfaces reading the persisted closeout record rather than inferring from stale `running`

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-09
