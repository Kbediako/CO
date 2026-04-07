# PRD - CO: Disambiguate historical attached PRs during deterministic merge closeout for reopened issues

## Added by Bootstrap 2026-04-08

## Traceability
- Linear issue: `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
- Linear URL: https://linear.app/asabeko/issue/CO-104/co-disambiguate-historical-attached-prs-during-deterministic-merge
- Source issue: `CO-81` / `529457d9-5636-4394-a21e-b96e4f4fae74`

## Summary
- Problem: deterministic merge closeout currently reads live `issue.attachments`, filters same-repo GitHub PR URLs, and stops with `multiple_attached_prs` whenever more than one same-repo PR is attached. That blocks reopened `Merging` issues when a historical merged PR like `https://github.com/Kbediako/CO/pull/360` remains attached alongside the current replacement PR `https://github.com/Kbediako/CO/pull/372`.
- Desired outcome: safe historical disambiguation should let the lane continue when one current candidate is unambiguous, while still failing closed and persisting machine-readable truth when ambiguity remains.

## User Request Translation
- Need: make reopened merge closeout reliable without requiring operators to manually clean up stale Linear PR attachments from earlier attempts.
- Success criteria:
  - one historical merged same-repo PR plus one current replacement PR no longer stalls on generic `multiple_attached_prs`
  - only deterministically historical merged attachments are ignored
  - `merge_closeout`, `provider-intake-state.json`, and provider debug snapshots preserve the selected PR plus ignored historical and conflicting attached PR URLs
  - repo-mismatch and no-attached-PR behavior stay unchanged
- Constraints: do not reopen `CO-81` stale-proof recovery, `CO-100` shared-root reconciliation, or the broader attachment lifecycle; do not make manual cleanup the intended steady-state path.

## Intent Checksum
- Protected terms: `providerMergeCloseout.ts`, `providerIssueHandoff.ts`, `issue.attachments`, `multiple_attached_prs`, `Merging`, `provider-intake-state.json`, `merge_closeout`, reopened issue, historical merged PR attachment, replacement PR attachment, `CO-81`, `https://github.com/Kbediako/CO/pull/360`, `https://github.com/Kbediako/CO/pull/372`.
- Reject these interpretations: `CO-81` already solved this seam; `CO-100` owns it; operators should remove stale attachments manually; older attachments should be auto-deleted; observability or workpad wording alone is sufficient.

## Non-Goals
- Reopen stale-proof rehydrate / reclaim from `CO-81`.
- Reopen shared-root reconciliation or reporting from `CO-100`.
- Redesign the full PR-attachment lifecycle or add global attachment garbage collection.

## Not Done If
- a reopened issue with one historical merged same-repo PR and one current same-repo PR still needs manual attachment cleanup before merge closeout finishes
- deterministic closeout still collapses the obvious historical/current split into generic `multiple_attached_prs`
- provider/control-host artifacts still cannot show which PR was selected, ignored as historical, or rejected as ambiguous

## Evidence / Validation Hook
- Primary proof pair: `/Users/kbediako/Code/CO/.runs/linear-529457d9-5636-4394-a21e-b96e4f4fae74/cli/2026-04-06T18-36-00-118Z-d2c05d9a/provider-linear-issue-context-cache.json` shows both `#360` and `#372`; `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json` later shows successful closeout with only `#372`.
- Regressions must cover the `CO-81` historical-plus-replacement shape, a true multi-candidate ambiguity shape, and unchanged repo-mismatch / no-attached-PR behavior.
