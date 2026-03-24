# TECH_SPEC - Coordinator Live Linear Snapshot-Only Retry Assignee-Identity Fallback

## Added by Bootstrap 2026-03-24

## Summary
- Objective: preserve same-worker ownership truth for snapshot-only queued retries by persisting viewer identity alongside assignee identity and only replaying that viewer identity when the current auth context still matches the persisted snapshot.
- Scope: docs-first registration, Symphony/CO ownership-path audit, minimal provider-intake schema extension, minimal fallback/runtime patch, focused regressions, full validation, and review handoff.
- Constraints:
  - preserve explicit foreign-assignee release behavior
  - preserve current live-resolver ownership behavior
  - keep claim-schema change additive and backward-compatible

## Technical Requirements
- Functional requirements:
  - register `1322` across PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and docs freshness registry before code edits
  - compare the snapshot-only queued-retry ownership path against the current live-resolver path and the Symphony baseline before implementation
  - persist a separate viewer identity field and viewer-auth fingerprint in provider intake claims whenever a live tracked issue is written into claim state
  - reconstruct snapshot-only queued-retry tracked issues with the persisted viewer identity instead of forcing `viewer_id: null`, but only when the current auth fingerprint matches the persisted snapshot
  - keep fallback ownership release behavior intact when the persisted snapshot already shows a foreign assignee
  - add focused regressions for:
    - snapshot-only queued retry continuation when the persisted snapshot is self-assigned
    - snapshot-only queued retry release when the persisted viewer identity no longer matches the current auth context
    - snapshot-only queued retry release when the persisted snapshot shows a foreign assignee
    - backward-compatible behavior for older claims that do not yet carry viewer identity
- Non-functional requirements (performance, reliability, security):
  - no new external calls or workflow-state assumptions
  - no broad provider-state migration or replay rewrite
  - backward compatibility for previously persisted claims without the new field
- Interfaces / contracts:
  - `linearDispatchSource.ts` remains the ownership authority for live tracked issues
  - `providerIntakeState.ts` persists the additive viewer identity field and auth fingerprint
  - `providerIssueHandoff.ts` snapshot reconstruction must use the persisted viewer identity only when the current auth fingerprint matches and live resolution is absent

## Architecture & Data
- Architecture / design adjustments:
  - extend `ProviderIntakeClaimRecord` and related normalization/summary plumbing with `issue_viewer_id?: string | null` and `issue_viewer_auth_fingerprint?: string | null`
  - update `buildTrackedIssueClaimFields(...)` so persisted claims capture `trackedIssue.viewer_id` plus the current Linear token fingerprint
  - update `buildTrackedIssueSnapshotFromClaim(...)` so snapshot-only retries replay `viewer_id` from persisted claim state only when the persisted fingerprint matches the current auth context
  - keep `assessProviderTrackedIssueEligibility(...)` unchanged; the fix is to provide truthful fallback input, not to weaken the ownership predicate
- Data model changes / migrations:
  - additive persisted claim fields: `issue_viewer_id`, `issue_viewer_auth_fingerprint`
  - no explicit migration; older claims normalize to `null` and retain current fallback behavior until refreshed by a live tracked issue write
- External dependencies / integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/control/linearGraphqlClient.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Current Truth
- Live tracked-issue ownership compares `viewer_id` and `assignee_id`.
- Snapshot-only queued retries rebuild a tracked-issue view from persisted claim state.
- The current fallback reconstruction preserves `assignee_id` but hardcodes `viewer_id: null`.
- Because `isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(...)` requires a non-empty `viewer_id` for self-assigned issues, snapshot-only retries misclassify self-assigned claims as reassigned.
- Preserving `viewer_id` separately is required; aliasing it to `assignee_id` would incorrectly mark persisted foreign assignees as owned.
- Persisted viewer identity also needs an auth-context guard; otherwise a stale viewer snapshot could be replayed under a different Linear token after auth changes.

## Validation Plan
- Tests / checks:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback`
  - focused `ProviderIssueHandoff` regressions covering:
    - snapshot-only queued retry continuation with persisted same-worker viewer/assignee identity
    - snapshot-only queued retry release when the persisted auth fingerprint no longer matches the current Linear token
    - snapshot-only queued retry release with persisted foreign assignee identity
    - backward-compatible fallback behavior when persisted viewer identity is absent
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
  - confirm the persisted claim snapshot now carries viewer identity plus auth fingerprint after a live tracked-issue write
  - confirm snapshot-only queued retry dispatch keeps same-worker retries eligible without touching live-resolver behavior
- Monitoring / alerts:
  - `provider_issue_released:assignee_changed` should no longer occur for the snapshot-only same-worker fallback case
  - existing explicit foreign-assignee release tests must remain green

## Open Questions
- None beyond the bounded observability exposure decision noted in the PRD.

## Approvals
- Reviewer: pending docs-review for `1322`.
- Date: 2026-03-24
