---
id: 20260416-linear-72286a49-e68b-435a-be72-74d5c28feb09
title: Control host: stop stale released-pending-reopen Merging claims from re-triggering refresh stuck/restart loops
relates_to: docs/PRD-linear-72286a49-e68b-435a-be72-74d5c28feb09.md
risk: high
owners:
  - Codex
last_review: 2026-04-16
---

## References
- PRD: `docs/PRD-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- Canonical mirror: `tasks/specs/linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- Checklist: `tasks/tasks-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- Source manifest: `.runs/linear-72286a49-e68b-435a-be72-74d5c28feb09-docs-packet-current/cli/2026-04-15T17-48-15-133Z-8a3b1602/manifest.json`

## Issue Contract
- User request: stop stale terminal released-pending-reopen `Merging` claims with dead worker PID evidence from destabilizing provider refresh lifecycle, supervisor recovery, and `CO STATUS running row` occupancy.
- Protected terms: `provider_refresh_lifecycle_stuck`, `restart_required`, `released-pending-reopen`, `Merging`, `stale terminal claim`, `dead worker PID`, `CO STATUS running row`, `provider_issue_released_pending_reopen:provider_issue_released:not_active`, `ECONNREFUSED`, `CO-192 projection-only pruning`, `CO-193 Ready reclaim`.
- Non-goals: no `CO-192` replacement, no `CO-193` replacement, no hidden health errors, no refresh disablement, no broad scheduler redesign, no killing unrelated live workers.
- Issue-quality review: 2026-04-16 parent/child review confirmed this is a refresh-health and supervisor-stability lane; micro-task path is ineligible because correctness depends on exact stale terminal claim shape and protected wording.

## Functional Requirements
1. Detect the stale shape only when all evidence is present:
   - provider issue is Linear-backed
   - local claim is `released`
   - reason starts with `provider_issue_released_pending_reopen:`
   - cached claim state is active worker state such as `Merging` / started
   - current tracked issue truth is terminal/Done
   - provider proof shows an in-progress local worker PID that is dead
2. Reconcile or quarantine that stale terminal claim so it cannot drive:
   - running-slot authority
   - `provider_refresh_lifecycle_stuck`
   - `restart_required`
   - immediate supervisor restart-loop recovery
3. Preserve active unrelated provider workers and do not cancel/kill them.
4. Preserve cancellation behavior for null-status or stale-proof runs that do not prove the local PID is dead.
5. Preserve genuine stuck-refresh diagnostics and restart-required truth.

## Implementation Notes
- Provider handoff discovery may classify stale in-progress proof for status resolution, but release-cancel suppression must be narrower: only dead-local-PID proof should skip cancellation for a null-status run.
- Status/read-model projection should consult matching provider-intake claim state before treating selected provider runs as authoritative running rows.
- The stale terminal classifier should be additive and auditable; retained intake history can remain for diagnostics.
- Remote worker-host proofs or timestamp-stale proofs without dead local PID evidence are not enough to suppress cancellation.

## Data / Interfaces
- `provider-intake-state.json`: retained claim state, reason, cached issue state, run id, manifest path, worker host.
- Provider worker proof: `provider-linear-worker-proof.json`, including `owner_status`, `owner_phase`, `pid`, `worker_host`, `attempt_started_at`, and `updated_at`.
- Linear tracked issue truth: terminal Done/completed state.
- `CO STATUS` compatibility projection and provider refresh lifecycle health.

## Acceptance Criteria
1. Fixture covers terminal/Done issue truth, retained released-pending-reopen `Merging` / started claim, dead worker PID, and unrelated live workers.
2. Provider refresh releases/reconciles the stale claim without `provider_refresh_lifecycle_stuck` or `restart_required`.
3. `CO STATUS` excludes the stale claim from running count with terminal truth plus dead-PID proof.
4. Live unrelated provider workers remain active.
5. Null-status stale proofs without dead-local-PID evidence still attempt cancellation.
6. Genuine refresh-health failures still surface.
7. Tests keep this lane distinct from `CO-192` and `CO-193`.

## Validation Plan
- Focused provider handoff regression for terminal stale `Merging` claim plus dead PID plus unrelated live worker.
- Focused provider handoff regression for stale remote/timestamp proof without dead-local-PID evidence still canceling.
- Focused `CO STATUS` projection regression for selected stale terminal provider claim.
- Full affected suites: `ProviderIssueHandoffRefreshSerialization.test.ts`, `ControlRuntime.test.ts`.
- Required gates: delegation guard, spec guard, build, lint, test, docs checks, stewardship, diff budget, pack smoke, standalone review, elegance pass.
