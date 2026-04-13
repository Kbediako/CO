# PRD - CO: decouple released-claim deferred-poll suppression from unrelated fresh discovery

## Traceability
- Linear issue: `CO-161` / `d26b2799-a4a1-41d0-87cb-ee64eabcdbba`
- Linear URL: https://linear.app/asabeko/issue/CO-161/co-decouple-released-claim-deferred-poll-suppression-from-unrelated
- Source issue: `CO-160` / `95011595-52df-4ad8-9cb5-256e7eee5424`
- Related landed slices: `CO-160`, `CO-159`

## Summary
- Problem Statement: at turn start, `CO-160` had already stopped deferred polls from re-reading retained released claims by id, but released-only cached skip reasons still shared the same global suppression channel as other cached poll outcomes. That meant a deferred poll whose retained claim set was fully released could also skip `fresh_discovery`, hiding unrelated runnable issues that were not currently retained.
- Desired Outcome: prove that mixed/unrelated runnable case with focused regression coverage, then separate release-only local fail-closed handling from the global fresh-discovery suppression channel while keeping retained released claims local-first and zero-direct-read. The current branch now reflects that narrowed contract; remaining work is validation and handoff truth.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-161` by validating the specific post-`CO-160` design concern around deferred-poll discovery suppression. The lane must stay narrow: first prove whether released-only cached skip reasons can hide unrelated runnable work, then change only the release-only suppression contract if needed, and keep the accepted no-direct-read behavior for retained released claims.
- Success criteria / acceptance:
  - reproduce or disprove whether released-only deferred-poll skip reasons can suppress discovery of unrelated runnable issues when the retained claim set is fully released
  - if the mixed/unrelated runnable case is real, separate release-only local fail-closed handling from global fresh-discovery suppression without reintroducing per-claim `resolveTrackedIssue(...)` or `dispatch_source_issue_by_id` reads for retained released claims
  - add regression coverage for both the retained all-released local-first case and the mixed/unrelated runnable discovery case
  - keep `CO-159` dead-active and review-wait fail-closed handling unchanged
- Constraints / non-goals:
  - do not reopen `CO-160` into broader request-budget policy, poll cadence, or status-surface redesign
  - do not weaken `CO-159` dead-active or review-wait fail-closed handling
  - do not require live issue-by-id reads for each retained released claim
  - do not reintroduce per-claim `resolveTrackedIssue(...)` or `dispatch_source_issue_by_id` reads for retained released claims

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "decouple released-claim deferred-poll suppression from unrelated fresh discovery"
  - "all-released deferred-poll case"
  - "mixed/unrelated runnable case"
  - "fresh_discovery"
  - "local-first no-burn behavior"
- Protected terms / exact artifact and surface names:
  - `CO-160`
  - `CO-159`
  - `runRefreshCycle(...)`
  - `resolveReleasedProviderIssuePollFailClosedReason(...)`
  - `resolveTrackedIssuePollResolutionWithFallback(...)`
  - `resolveTrackedIssue(...)`
  - `dispatch_source_issue_by_id`
  - `provider_issue_poll_cached_released_not_active`
  - `provider_issue_poll_cached_released_not_mutable`
  - `ProviderIssueHandoff.test.ts`
- Nearby wrong interpretations to reject:
  - reopen the whole `CO-160` design instead of isolating the release-only suppression seam
  - redesign deferred poll cadence or request-budget policy
  - re-enable live issue-by-id reads for retained released claims
  - weaken unrelated non-released cached fail-closed behavior
  - broaden into status-surface or workflow-state presentation work

## Parity / Alignment Matrix
- Not applicable. This is a bounded provider poll follow-up rather than a parity or alignment migration.
- Current truth:
  - `resolveReleasedProviderIssuePollFailClosedReason(...)` returns `provider_issue_poll_cached_released_not_active` / `_not_mutable` for retained released claims during deferred polls
  - `runRefreshCycle(...)` now delegates global discovery suppression to `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)`
  - `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)` explicitly excludes `provider_issue_poll_cached_released_*`, so released-only cached outcomes no longer block unrelated `fresh_discovery` admission on the current branch
  - deferred `fresh_discovery` still treats retained released claims as blocked replay targets, so the same released issue cannot come back through the generic dispatch path and be rewritten out of `released`
  - `ProviderIssueHandoff.test.ts` now covers both the retained all-released local-first case and the mixed/unrelated runnable discovery case
- Reference truth:
  - retained released claims should remain local-first and zero-direct-read on deferred polls
  - unrelated runnable work should still be admissible through bounded discovery when release-only cached truth is the only thing blocking the cycle
  - non-released cached fail-closed suppression should stay intact
- Target truth / intended delta:
  - prove with focused regression that released-only cached skips did block unrelated runnable discovery on the pre-fix tree
  - separate the release-only fail-closed path from the global fresh-discovery suppression decision while preserving local retained released-claim no-burn behavior
  - keep non-released cached suppression unchanged
- Explicitly out-of-scope differences:
  - request-budget policy redesign
  - poll cadence tuning or new scheduler policy
  - broader provider status-surface changes

## Not Done If
- The lane weakens suppression without proving the mixed/unrelated runnable case end to end.
- Deferred polls regain per-claim `resolveTrackedIssue(...)` or `dispatch_source_issue_by_id` reads for retained released claims.
- The change broadens into request-budget policy, cadence, or unrelated provider presentation work.

## Goals
- Prove or disprove the mixed/unrelated runnable suppression case with machine-checkable regression coverage.
- Keep retained released claims local-first and zero-direct-read during deferred polls.
- If the case is real, land the narrowest suppression-seam change that restores unrelated discovery without touching unrelated cached fail-closed classes.

## Non-Goals
- Redesigning poll cadence or discovery budgeting.
- Reopening `CO-159` or `CO-160` into broader provider polling work.
- Requiring live issue-by-id reads for retained released claims.
- Changing unrelated workflow-state or review-handoff behavior.

## Stakeholders
- Product: CO operator / control-host owner
- Engineering: provider intake and `providerIssueHandoff.ts` maintainers
- Design: N/A

## Technical Considerations
- Architectural Notes:
  - the code seam stayed narrow: retained released claims already had their own fail-closed helper, and the fix only separated the fresh-discovery suppression classifier from the release-only cached classifier
  - the landed implementation uses a dedicated `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)` helper plus retained released-claim replay blocking in deferred `fresh_discovery`, rather than rebuilding the deferred-poll fallback flow
  - the issue itself is the explicit product/spec decision authorizing that narrow contract change once the proof existed
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Open Questions
- Resolved on 2026-04-13: the narrowest truthful implementation is a dedicated fresh-discovery suppression helper that excludes released-only cached reasons.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: docs-review child stream completed and implementation validation is in progress on the final tree
- Design: N/A
