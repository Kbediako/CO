# PRD - Coordinator Live Linear Snapshot-Only Retry Assignee-Identity Fallback

## Added by Bootstrap 2026-03-24

## Summary
- Problem Statement: queued provider retries currently have two ownership paths. When a live tracked-issue resolver is available, CO compares the live `viewer_id` and `assignee_id` and correctly continues same-worker retries. When live resolution is unavailable, queued retries fall back to a snapshot reconstructed from the persisted claim. That snapshot currently preserves `assignee_id` but drops `viewer_id`, so a self-assigned issue can be misread as reassigned and released as `provider_issue_released:assignee_changed`.
- Desired Outcome: preserve enough worker identity in the persisted provider claim so snapshot-only queued retries can keep running when the last known snapshot still shows the issue assigned to the current worker, while still releasing when the persisted snapshot already shows a different assignee or the current auth context can no longer trust the persisted viewer identity.
- Current Outcome Target: keep the lane bounded to provider retry ownership fallback, additive persisted claim metadata, focused observability updates, focused regressions, required validation, PR feedback handling, and review handoff.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): fix CO-9 in the current workspace by comparing the snapshot-only queued-retry ownership path against the live-resolver path and the local Symphony baseline, then land the smallest change that preserves same-worker ownership without weakening the real reassignment guard.
- Success criteria / acceptance:
  - `1322` is registered with PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - the packet records the exact mismatch between the live-resolver retry path and the snapshot-only fallback
  - persisted provider claims preserve enough viewer/assignee identity for snapshot-only queued retries to continue when the issue is still self-assigned
  - snapshot-only retries no longer misclassify that same-worker case as `provider_issue_released:assignee_changed`
  - explicit foreign-assignee release behavior remains intact when the last known snapshot already shows someone else as assignee
  - snapshot-only fallback stays conservative when the current auth context no longer matches the persisted viewer identity
  - tests cover snapshot-only continuation plus the retained reassignment-stop guard
- Constraints / non-goals:
  - do not widen into unrelated provider features, workflow-state changes, or another broad parity pass
  - do not weaken assignee-stop behavior for real ownership changes already reflected in persisted claim state
  - do not introduce a broad provider-state migration; keep compatibility additive

## Goals
- Register a narrow docs-first lane for CO-9.
- Re-audit the Symphony baseline plus the current CO live-resolver ownership path before implementation.
- Persist the minimum additional ownership identity needed for snapshot-only queued retries and only trust it under the same auth context.
- Keep the runtime patch and tests narrowly focused on retry ownership fallback.
- Deliver the fix through validation, PR, and review handoff.

## Non-Goals
- Reworking fresh dispatch selection or review-handoff state behavior.
- Changing provider retry scheduling/cadence beyond the fallback ownership decision.
- Adding new Linear mutation surfaces or workflow status semantics.
- Reopening broader `1315`/`1316` parity scope.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - snapshot-only queued retries continue when the persisted snapshot still shows `viewer_id === assignee_id`
  - snapshot-only queued retries still release when the persisted snapshot shows `viewer_id !== assignee_id`
  - no new release of same-worker queued retries as `provider_issue_released:assignee_changed` in the fallback-only path
- Guardrails / Error Budgets:
  - preserve current live-resolver ownership behavior
  - preserve existing retry queue semantics and release reasons outside this bounded fallback
  - keep persisted-claim changes additive and backward-compatible

## User Experience
- Personas:
  - CO operator expecting queued retries to resume without live provider reads when the last known issue snapshot still belongs to the worker
  - maintainer auditing whether fallback ownership truth stays aligned with the live resolver path
- User Journeys:
  - a queued retry fires after a restart or offline window, live issue resolution is unavailable, and the issue still continues because the persisted snapshot still proves same-worker ownership
  - a queued retry fires after ownership moved away and the persisted snapshot already reflects that reassignment, so the claim still releases cleanly

## Technical Considerations
- Architectural Notes:
  - the live ownership authority is `isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(...)` in `linearDispatchSource.ts`
  - snapshot-only queued retries currently rebuild a `LiveLinearTrackedIssue` from the persisted claim in `buildTrackedIssueSnapshotFromClaim(...)`
  - that reconstruction hardcodes `viewer_id: null`, which makes any non-null `assignee_id` look foreign even when the persisted snapshot was self-assigned
  - inferring `viewer_id` from `assignee_id` would be incorrect because it would also treat persisted foreign assignees as owned; the persisted claim needs a separate viewer identity field plus an auth-context fingerprint so stale viewer identity is not trusted under a different token
  - the relevant upstream baseline remains `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/linearGraphqlClient.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Open Questions
- Should provider intake summary/read-model surfaces expose only `issue_viewer_id`, or should the lane keep the auth fingerprint internal to persisted/runtime behavior unless a direct consumer requires more observability?

## Approvals
- Product: Self-approved on 2026-03-24 for a narrow worker-owned retry fallback fix.
- Engineering: Self-approved on 2026-03-24 based on the Symphony baseline audit and current CO code-path comparison.
- Design: N/A
