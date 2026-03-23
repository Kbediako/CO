# TECH_SPEC - Coordinator Live Linear Unassigned Active-Claim Alignment and Recovery

## Added by Bootstrap 2026-03-23

## Summary
- Objective: close the live `CO-3` reclaim bug by making existing active claims honor the same unassigned-ownership rule as fresh dispatch and by letting already-released misclassified claims reopen on refresh without another Linear update.
- Scope: docs-first registration, live contract capture, minimal runtime patching in provider claim eligibility/recovery, focused regressions, full validation, live retest on `CO-3`, and delivery closeout.
- Constraints:
  - preserve explicit reassignment-away release behavior
  - preserve provider execution-authority and delegation-guard boundaries
  - keep the fix narrower than a new `1319` parity lane

## Technical Requirements
- Functional requirements:
  - register `1321` across PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and docs freshness registry before code edits
  - record the live contradiction precisely: `CO-3` is still `Merging` and recommended by `/api/v1/dispatch`, yet persisted intake is still `released:assignee_changed`
  - align existing-claim eligibility so an active unassigned issue does not count as `provider_issue_released:assignee_changed`
  - preserve current release behavior when an issue is explicitly assigned to a different user
  - add the smallest refresh recovery seam needed so a previously misclassified released claim can relaunch without a newer `updated_at`
  - add focused regressions for direct webhook/accepted issue handling, refresh/poll handling, and released-claim recovery
  - prove the live control host reclaims `CO-3` and resumes autonomous merge/conflict handling without another operator flip
- Non-functional requirements (performance, reliability, security):
  - no new external setup or workflow-state creation
  - no widening of dispatch selection or broader provider behavior beyond this mismatch
  - validation must cover the repo’s required floor and include a review/elegance pass
- Interfaces / contracts:
  - `linearDispatchSource.ts` remains the fresh-dispatch ownership authority for viewer-owned or unassigned issues
  - `providerIssueHandoff.ts` existing-claim eligibility and refresh recovery must match that ownership contract for active issues
  - current Symphony `WORKFLOW.md` remains the operational authority that `Merging` is an active merge-handling state

## Architecture & Data
- Architecture / design adjustments:
  - narrow the `assigneeChanged` predicate in `assessProviderTrackedIssueEligibility()` so `assignee_id: null` is not treated as a foreign owner for existing active claims
  - keep explicit non-null foreign assignee release behavior intact
  - add a bounded released-claim recovery rule in refresh handling for previously misclassified `provider_issue_released:assignee_changed` claims when the live tracked issue is now eligible at the same timestamp
  - avoid changing `linearDispatchSource.ts` runtime logic unless a test gap needs a cross-surface contract lock
- Data model changes / migrations:
  - no schema migration
  - persisted claim reasons/states may now transition from previously stuck `released:assignee_changed` to `starting`/`running` on refresh when the issue is active and unassigned
- External dependencies / integrations:
  - live local control host and authenticated `/api/v1/dispatch`
  - live Linear issue-context for `CO-3`
  - GitHub PR `#289`

## Current Truth
- Live `issue-context` for `CO-3` reports state `Merging`, `state.type = started`, and `assignee_id: null`.
- Live `/api/v1/dispatch` recommends `CO-3` and also surfaces `assignee_id: null`.
- Persisted intake still records `CO-3` as `released` with reason `provider_issue_released:assignee_changed`.
- `linearDispatchSource.ts` already treats unassigned issues as dispatchable.
- `providerIssueHandoff.ts` still treats `assignee_id: null` as assignee identity on the existing-claim path, which is the direct mismatch.
- Released-claim recovery currently requires a newer `updated_at`, so the already-stuck live claim will not self-heal after only the ownership boolean changes.
- This is a narrow internal contract bug, not a missing workflow state or external provider setup issue.

## Validation Plan
- Tests / checks:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery`
  - focused `ProviderIssueHandoff` regressions covering:
    - active existing claim + `Merging` + `assignee_id: null`
    - refresh/poll handling for active unassigned existing claims
    - released `assignee_changed` equal-timestamp refresh recovery
    - explicit foreign-assignee release behavior remains intact
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` only if downstream-facing CLI/package/skill surfaces change
- Rollout verification:
  - rebuild/restart the local control host on the patched tree
  - prove `CO-3` reclaims without another operator Linear state flip
  - prove the resumed run begins conflict/merge handling for PR `#289`
- Monitoring / alerts:
  - provider-intake should move away from `released:assignee_changed` for active unassigned `CO-3`
  - live `/api/v1/dispatch` should remain internally consistent while the resumed run is active

## Open Questions
- Whether review-handoff null-assignee behavior should intentionally stay aligned with the shared ownership rule, or whether a later lane should re-split review-only null handling if evidence demands it.

## Approvals
- Reviewer: pending docs-review for `1321`.
- Date: 2026-03-23
