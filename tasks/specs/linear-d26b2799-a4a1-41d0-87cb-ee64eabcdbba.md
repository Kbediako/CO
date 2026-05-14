---
id: 20260413-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba
title: CO: decouple released-claim deferred-poll suppression from unrelated fresh discovery
status: completed
owner: Codex
created: 2026-04-13
last_review: 2026-05-14
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md
related_action_plan: docs/ACTION_PLAN-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md
related_tasks:
  - tasks/tasks-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md
review_notes:
  - 2026-04-13: Opened from Linear issue `CO-161` after rechecking the live CO workflow states with `linear issue-context`; the team exposes `Ready`, `In Progress`, `In Review`, `Merging`, and `Rework`, and the issue started this lane in `Ready` with no attached PR and no prior workpad comment.
  - 2026-04-13: The worker recorded the required same-turn parallelization decision as `stay_serial` / `single_bounded_change`, moved the issue from `Ready` to `In Progress`, switched the workspace onto branch `linear/co-161-decouple-released-discovery-suppression`, and prepared the initial workpad source at `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
  - 2026-04-13: A focused regression first proved the mixed/unrelated runnable case on the pre-fix tree: released-only deferred-poll cached skips kept `fresh_discovery` from running, so the unrelated runnable issue never surfaced until the suppression seam was split.
  - 2026-04-13: `runRefreshCycle(...)` now routes global discovery suppression through `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)`, which preserves non-released cached suppression while excluding `provider_issue_poll_cached_released_*`; retained released claims remain local-first and zero-direct-read on deferred polls.
  - 2026-04-13: Standalone review surfaced one follow-on correctness hole after that split: deferred `fresh_discovery` could replay the same released issue and demote it out of `released`. The final tree closes that by tracking current-cycle `provider_issue_poll_cached_released_*` skips as replay-blocked deferred fresh-discovery targets while still allowing unrelated runnable issues through the same query.
  - 2026-04-13: The audited docs-review child stream completed under `.runs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba-co-161-docs-review/cli/2026-04-13T10-22-31-837Z-45c76cb6/manifest.json` and surfaced a stale packet claim after the code change; this spec refresh addresses that truthfulness gap before handoff.
  - 2026-05-14: CO-530 current-head root-cause reclassification verified live Linear CO-161 remains Done/completed and archived this historical packet out of active docs freshness lifecycle debt; no implementation scope reopened.
---
## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| docs freshness | Completed Linear task spec remained active in freshness/spec guard metadata after issue closeout | remove fallback | CO-530 | May 14 current-head reclassification of recurring historical packet freshness debt for CO-161 | 2026-04-13 | N/A after removal | N/A after removal | Spec frontmatter is terminal and registry row is archived as historical metadata | `node scripts/spec-guard.mjs`; `npm run docs:freshness -- --warn`; `node scripts/docs-freshness-maintain.mjs --check --format json --warn` |


# Technical Specification

## Context

`CO-160` already landed the local retained released-claim no-burn path:

- deferred polls do not call `resolveTrackedIssue(...)` or `dispatch_source_issue_by_id` for retained released inactive or non-mutable claims
- released claims stay local-first and stable through cached poll reasons

The lane started from the adjacent design question raised during `CO-160` review: whether released-only cached skip reasons also block unrelated runnable discovery because deferred polls historically routed cached `provider_issue_poll_cached_*` reasons through one global `suppressFreshDiscovery` flag.

Current branch truth is now:

- `resolveProviderIssuePollFailClosedReason(...)` still covers accepted/non-runnable, review-wait, and merge-wait classes
- `resolveReleasedProviderIssuePollFailClosedReason(...)` separately covers retained released `not_active` and `not_mutable` claims
- `resolveTrackedIssuePollResolutionWithFallback(...)` returns `skip` with the released cached reason family during deferred polls
- `runRefreshCycle(...)` now asks `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)` before suppressing global `fresh_discovery`
- `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)` preserves suppression for non-released cached fail-closed reasons while excluding `provider_issue_poll_cached_released_*`
- `runRefreshCycle(...)` now tracks current-cycle `provider_issue_poll_cached_released_*` skips separately from the generic blocked-claim set, so deferred `fresh_discovery` still skips replaying the same released issue without changing non-deferred refresh reopen behavior
- the new focused regression first failed on the pre-fix tree because `refetchTrackedIssues` stayed at zero, then passed once the release-only suppression split landed

This packet now records the proved behavior and the accepted narrow fix: retain `CO-160`'s released-claim local-first no-burn contract while keeping unrelated bounded discovery available when release-only cached truth is the only thing that would otherwise suppress the cycle.

## Requirements

1. Reproduce or disprove whether released-only deferred-poll skip reasons can suppress discovery of unrelated runnable issues when the retained claim set is fully released.
2. Preserve the `CO-160` retained released-claim local-first contract: no per-claim `resolveTrackedIssue(...)` or `dispatch_source_issue_by_id` reads during deferred polls for retained released inactive or non-mutable claims.
3. Keep `CO-159` and other non-released cached fail-closed suppression paths unchanged.
4. If the mixed/unrelated runnable case is real, separate the release-only local fail-closed path from global fresh-discovery suppression with the smallest truthful implementation.
5. Add regression coverage for both the retained all-released local-first case and the mixed/unrelated runnable discovery case.

## Current Truth

- `resolveReleasedProviderIssuePollFailClosedReason(...)` returns:
  - `provider_issue_poll_cached_released_not_active`
  - `provider_issue_poll_cached_released_not_mutable`
- `runRefreshCycle(...)` now calls `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)` before setting `suppressFreshDiscovery = true`.
- `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)` excludes `provider_issue_poll_cached_released_*` while leaving non-released cached fail-closed suppression keyed off the shared `provider_issue_poll_cached_` family.
- Deferred `fresh_discovery` now skips provider keys that hit the current-cycle released poll fail-closed path, so the same released issue is not replayed through generic dispatch even when unrelated runnable discovery is allowed.
- `ProviderIssueHandoff.test.ts` now covers both the retained all-released local-first case and the mixed/unrelated runnable discovery case.
- The mixed/unrelated runnable case was real on the pre-fix tree: the new regression first failed because `fresh_discovery` never ran and `refetchTrackedIssues` stayed at zero.

## Implemented Design

### 1. Prove the suppression case with a focused regression

- Seed retained released claims that resolve through the released cached fail-closed path during a deferred poll.
- Provide a `fresh_discovery` refetch that would surface an unrelated runnable tracked issue.
- Assert the pre-fix truth first: released-only cached skips blocked that unrelated discovery until the suppression seam was split.

### 2. Separate release-only fail-closed handling from global fresh-discovery suppression

- Keep released-only deferred-poll fail-closed classification local-first so retained released claims still skip direct issue-by-id reads.
- Narrow the fresh-discovery suppression decision so non-released cached fail-closed reasons still suppress discovery, while released-only cached reasons no longer force the same global suppression path.
- Keep the implementation local to `providerIssueHandoff.ts`; do not add new cadence or budget policy.

### 3. Preserve unaffected cached suppression and reopen behavior

- Do not weaken accepted/non-runnable, review-wait, merge-wait, dead-active, or handoff-related cached suppression.
- Do not interfere with retained released reopen helpers or cancellation cleanup behavior.

### 4. Add focused regression coverage

- Cover the retained all-released deferred-poll case and assert:
  - zero direct `resolveTrackedIssue(...)` calls for retained released claims
  - stable released claim state or timestamps where applicable
- Cover the mixed/unrelated runnable case and assert:
  - unrelated runnable work is admitted when released-only cached suppression was the only blocker
  - non-released cached suppression remains unchanged

## Validation Plan

- Run audited docs-review through `linear child-stream --pipeline docs-review`.
- Add or update focused coverage in `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- Verify:
  - the proof reproduces the unrelated runnable suppression case on the pre-fix tree and stays green on the final tree
  - retained released claims remain zero-direct-read on deferred polls
  - unaffected cached suppression classes still behave as before
- Run the required repo validation floor after implementation.
