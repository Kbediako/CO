# PRD - CO: Disambiguate historical attached PRs during deterministic merge closeout for reopened issues

## Added by Bootstrap 2026-04-08

## Traceability
- Linear issue: `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
- Linear URL: https://linear.app/asabeko/issue/CO-104/co-disambiguate-historical-attached-prs-during-deterministic-merge
- Source issue: `CO-81` / `529457d9-5636-4394-a21e-b96e4f4fae74`

## Summary
- Problem Statement: deterministic merge closeout for reopened `Merging` issues currently reads live `issue.attachments`, filters same-repo GitHub PR URLs, and fails closed with `reason: multiple_attached_prs` whenever more than one same-repo PR is attached. That blocks autonomous merge closeout for the `CO-81` shape where a historical merged PR attachment (`https://github.com/Kbediako/CO/pull/360`) remains attached alongside the current replacement PR (`https://github.com/Kbediako/CO/pull/372`).
- Desired Outcome: merge closeout should safely ignore clearly historical merged PR attachments on reopened issues, automatically select the one unambiguous current same-repo candidate when one remains, and persist machine-checkable evidence showing which PR was selected, which were ignored as historical, and which remain conflicting when ambiguity persists.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): make the `Merging` to `Done` closeout path reliable for reopened issues without requiring operators to manually clean up stale Linear PR attachments from earlier merged attempts, while still failing closed when multiple current candidates remain.
- Success criteria / acceptance:
  - a reopened issue with one historical merged same-repo PR attachment and one current same-repo replacement PR no longer stalls on generic `multiple_attached_prs`
  - safe historical disambiguation only ignores attachments that are deterministically historical merged PRs
  - when ambiguity remains, the action-required merge-closeout record names the conflicting PR URLs instead of hiding behind generic stall semantics
  - `provider-intake-state.json` / `merge_closeout` persist the selected PR plus ignored-historical and conflicting PR URL sets in machine-checkable form
  - focused regressions cover the `CO-81` historical-plus-replacement shape, a true multi-candidate ambiguity, and unchanged repo-mismatch / no-attached-PR behavior
- Constraints / non-goals:
  - do not reopen the stale-proof rehydrate / reclaim scope already handled under `CO-81`
  - do not reopen shared-root reconciliation from `CO-100`
  - do not redesign the full PR attachment lifecycle or add global attachment garbage collection
  - do not depend on manual operator cleanup as the intended steady-state path

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `providerMergeCloseout.ts`
  - `providerIssueHandoff.ts`
  - `issue.attachments`
  - `multiple_attached_prs`
  - `Merging`
  - `provider-intake-state.json`
  - `merge_closeout`
  - reopened issue
  - historical merged PR attachment
  - replacement PR attachment
  - `CO-81`
  - `https://github.com/Kbediako/CO/pull/360`
  - `https://github.com/Kbediako/CO/pull/372`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `/.runs/linear-529457d9-5636-4394-a21e-b96e4f4fae74/cli/2026-04-06T18-36-00-118Z-d2c05d9a/provider-linear-issue-context-cache.json`
  - `/.runs/local-mcp/cli/control-host/provider-intake-state.json`
- Nearby wrong interpretations to reject:
  - `CO-81` already owns this seam because its workpad mentioned both PRs
  - `CO-100` already owns this because merge closeout was involved
  - keep `multiple_attached_prs` as-is and require operators to remove stale attachments manually
  - auto-delete older attachments as the only fix
  - solve this only in workpad wording, `CO STATUS`, or observability text without changing merge-closeout candidate selection

## Parity / Alignment Matrix
- Current truth:
  - `providerMergeCloseout.ts` collects all same-repo attached PR URLs and hard-stops when there is more than one match, regardless of whether one is already merged historical baggage from an earlier attempt
  - `providerIssueHandoff.ts` persists merge-closeout records, but those records currently expose only `attached_pr_urls` and the selected `pr`, so ignored-versus-conflicting attachment truth is not preserved
  - the `CO-81` artifact pair proves the shape: the issue-context cache shows both `#360` and `#372` attached, then later `provider-intake-state.json` shows merge closeout succeeding only after the stale historical attachment was removed
- Reference truth:
  - reopened merge closeout should tolerate historical merged PR attachments from earlier attempts without requiring manual attachment cleanup
  - deterministic merge closeout should continue to fail closed when there are multiple current candidate PRs
  - machine-readable provider/control-host artifacts should preserve selected, ignored, and conflicting attached PR URLs
- Target truth / intended delta:
  - merge closeout disambiguates historical merged PR attachments from current candidates
  - one remaining current candidate is selected automatically and its ignored historical attachments are persisted
  - unresolved ambiguity keeps `multiple_attached_prs` action-required truth while persisting the conflicting PR URLs explicitly
- Explicitly out-of-scope differences:
  - deleting attachments in Linear
  - changing stale-proof rehydrate logic from `CO-81`
  - changing shared-root reconciliation behavior from `CO-100`

## Not Done If
- a reopened issue with one historical merged same-repo PR and one current same-repo PR still requires manual Linear attachment cleanup before merge closeout can finish
- merge closeout still collapses the obvious historical/current split into generic `multiple_attached_prs` without enough persisted context to act on it
- provider/control-host artifacts still cannot show which attached PR was selected, ignored as historical, or rejected as ambiguous
- the implementation silently picks a PR without a deterministic rule or persisted evidence
- the fix depends on deleting attachments instead of making closeout selection or truth explicit

## Goals
- Disambiguate historical merged PR attachments from current candidates during deterministic merge closeout.
- Preserve fail-closed behavior for true multi-candidate ambiguity.
- Persist machine-checkable merge-closeout evidence for selected, ignored historical, and conflicting attached PR URLs.
- Cover the reopened-issue seam with focused regressions in merge closeout and handoff persistence.

## Non-Goals
- Reopening `CO-81` stale-proof recovery scope.
- Reopening shared-root reconciliation or shared-root reporting work from `CO-100`.
- Redesigning attachment lifecycle management or adding global cleanup.

## Stakeholders
- Product: CO operators who expect `Merging` closeout to complete autonomously for reopened issues
- Engineering: CO maintainers responsible for provider merge closeout, handoff persistence, and deterministic operator truth
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - reopened issues with one historical merged PR attachment and one current replacement PR can reach deterministic merge closeout without manual Linear cleanup
  - ambiguous multiple-current-candidate lanes remain explicit action-required truth
  - merge-closeout artifacts preserve selected, ignored historical, and conflicting PR URL sets
- Guardrails / Error Budgets:
  - preserve existing `no_attached_pr` and repo-mismatch behavior
  - ignore only deterministically historical merged PR attachments
  - keep the implementation additive and deterministic rather than heuristic or destructive

## User Experience
- Personas:
  - operator waiting for autonomous `Merging` closeout on a reopened Linear issue
  - maintainer inspecting provider/control-host artifacts after a restart or recovery path
  - reviewer validating why a PR was selected or why ambiguity still blocks closeout
- User Journeys:
  - reopened issue with `#360` merged historical plus `#372` current replacement selects `#372` and records `#360` as ignored historical evidence
  - reopened issue with `#372` already merged and an older stale unmerged same-repo attachment still reaches the merged-recovery path instead of selecting the stale PR
  - reopened issue with two current open same-repo PRs remains action-required and records both conflicting URLs explicitly
  - repo-mismatch or missing-attached-PR lanes keep the existing fail-closed behavior

## Technical Considerations
- Architectural Notes:
  - `providerMergeCloseout.ts` owns candidate selection and should own the historical-versus-current disambiguation record
  - `providerIssueHandoff.ts` already persists `merge_closeout` records into intake claims, so it is the right continuity seam for regression coverage proving the new structured fields survive into provider/control-host artifacts
  - keep `multiple_attached_prs` available as the machine-readable reason for unresolved ambiguity while enriching the record with explicit conflicting PR URL context
- Dependencies / Integrations:
  - live Linear `issue.attachments`
  - GitHub PR readiness snapshots already used by merge closeout
  - provider intake claim persistence in `.runs/local-mcp/cli/control-host/provider-intake-state.json`

## Open Questions
- Pending implementation check: whether the minimal useful artifact surface is the merge-closeout record alone or whether the debug/observability projection also needs the ignored/conflicting URL fields for reviewer ergonomics. The default implementation target is the merge-closeout record first because that already lands in provider/control-host artifacts and satisfies the issue acceptance contract.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review and implementation validation
- Design: N/A
