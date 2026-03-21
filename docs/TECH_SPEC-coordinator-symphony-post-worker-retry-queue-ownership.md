---
id: 20260321-1315-coordinator-symphony-post-worker-retry-queue-ownership
title: Coordinator Symphony Post-Worker Retry Queue Ownership
relates_to: docs/PRD-coordinator-symphony-post-worker-retry-queue-ownership.md
risk: high
owners:
  - Codex
last_review: 2026-03-21
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: deliver the next truthful parity slice after `1314` by moving post-worker continuation/failure retry timing under an explicit runtime retry-queue owner instead of the refresh / rehydrate loop. `1315` is necessary but not sufficient for full hardened parity.
- Scope: in-memory retry queue ownership, timer cancellation/replacement, monotonic due-time tracking, restart-safe projection back into CO retry payloads.
- Constraints:
  - parity authority is `/Users/kbediako/Code/symphony/SPEC.md` plus the current Elixir `orchestrator.ex`
  - `1315` is retry-ownership only; it does not reopen `1312` same-session in-worker continuation or `1314` retry payload truth
  - post-`1315` parity work still remains around poll-owned discovery/recovery and observability API normalization unless provider-driven discovery is later accepted as an intentional divergence
  - optional dashboard/TUI/Telegram richness and tracker write-back stay out of scope
  - broader active-run reconciliation remains separate unless implementation proves a hard coupling

## Current Branch State
- Current branch status:
  - docs-review for `1315` succeeded at `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`
  - `1315` implementation is now landed on the current branch through `providerIssueRetryQueue.ts`, `providerIssueHandoff.ts`, and the coupled runtime-truth updates
  - a refreshed current-head closeout pack for the integrated `1312`-`1315` branch packet is still pending
  - the current-head closeout summary for the already-implemented branch unit remains `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`
- Upstream retry-ownership contract:
  - `/Users/kbediako/Code/symphony/SPEC.md:608-626` requires a short orchestrator-owned continuation retry after a normal worker exit
  - `/Users/kbediako/Code/symphony/SPEC.md:743-794` requires retry entry creation to cancel any existing retry timer and store `attempt`, `identifier`, `error`, `due_at_ms`, and a timer handle
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:128-145` schedules continuation retry on normal completion
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:775-812` owns retries with `Process.cancel_timer`, `Process.send_after`, and monotonic `due_at_ms`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:1130-1139` projects retry rows from in-memory retry state
- Current CO truth after `1315`:
  - `orchestrator/src/cli/control/providerIssueRetryQueue.ts` now owns retry timing in memory with cancel/replace behavior
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` now dispatches queued retries through that owner instead of waiting on refresh-loop deadline checks
  - `orchestrator/src/cli/control/providerIntakeState.ts` still persists retry truth as restart/bootstrap and observability support rather than as the active retry scheduler
- Current CO truth that must remain intact:
  - `1314` already made retry rows and issue-level retry payloads authoritative
  - `1312` already handles same-session continuation inside a single live worker session before the worker exits

## Technical Requirements
Functional requirements:
  - CO must own post-worker retry timing in a dedicated runtime retry queue instead of relying on refresh-loop deadline checks
  - refresh / rehydrate must become observer-bootstrap only, not a second active retry owner
  - scheduling a retry for an issue must cancel and replace any existing pending retry for that same issue
  - pending retry timers must also be canceled when the issue is no longer active, the claim is released, a manual stop/cancel supersedes the retry, retry dispatch succeeds, or startup rebuild replaces stale timers
  - the queue owner must track a monotonic due time or equivalent runtime-only scheduling source
  - the runtime retry record must preserve truthful retry metadata plus `workspace_path` where CO has it, without inventing `worker_host` fields the current provider flow does not track
  - `/api/v1/state.retrying` and `/api/v1/<issue>` must continue to expose truthful retry metadata during the ownership change
  - restart/bootstrap must remain safe: pending retry truth must survive control-host restart or be rebuilt deterministically from persisted state
- Non-functional requirements:
  - keep `1315` bounded away from unrelated reconciliation, workspace, and UI work
  - avoid duplicating retry ownership across the refresh loop and the new queue owner
  - preserve current provider-intake claim auditability and manifest-backed evidence
  - keep the post-`1315` real gaps explicit: poll-owned discovery/recovery, `POST /api/v1/refresh` ack shape, running/issue state semantics, and retry workspace fallback

## Architecture & Data
- Architecture / design adjustments:
  - introduce a dedicated runtime retry-queue owner under `orchestrator/src/cli/control/` or an equivalent extracted seam
  - have `providerIssueHandoff.ts` enqueue, reschedule, cancel, and consume retries through that owner
  - keep `controlServerPublicLifecycle.ts` responsible for periodic refresh and bootstrap/reconcile hooks, but not as the active owner of retry dispatch timing
  - continue projecting retry rows through `selectedRunProjection.ts`, `controlRuntime.ts`, `observabilityReadModel.ts`, and `compatibilityIssuePresenter.ts`
- Data model changes / migrations:
  - keep persisted retry claim fields only as restart/bootstrap truth or projection support as needed
  - add runtime-only monotonic due-time tracking and timer handles in the retry queue owner
  - ensure any restart rehydrate path can rebuild pending retries without inventing extra attempts, resetting backoff incorrectly, or leaving stale timers alive
- External dependencies / integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`

## Validation Plan
- Tests / checks:
  - docs-review for the registered `1315` packet before implementation: succeeded at `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`
  - focused retry-ownership regressions proving:
    - normal worker exit queues a short continuation retry without waiting for the 15s refresh loop
    - requeue cancels/replaces an older pending retry for the same issue
    - pending timer plus manual/public refresh near the due boundary dispatches exactly once
    - retry API payloads stay truthful while the queue owner is active
    - restart/bootstrap rehydrate rebuilds pending retries safely
  - standard implementation lane checks before closeout: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, targeted tests, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, review, and `npm run pack:smoke` if downstream-facing surfaces are touched
- Rollout verification:
  - live control-host proof shows a post-worker continuation retry queued and relaunched on scheduler ownership rather than refresh cadence
  - `/api/v1/state.retrying` and `/api/v1/<issue>` remain truthful during that proof
- Monitoring / alerts:
  - inspect for duplicate pending retries per issue
  - inspect for stale retry rows after relaunch or control-host restart

## Open Questions
- Decide whether `providerIssueHandoff.ts` should host the queue owner directly or delegate to a new retry-queue helper.
- Decide the minimum persisted retry data needed so restart/bootstrap can rebuild pending retries without reintroducing refresh-owned timing.
- Decide whether the post-`1315` parity follow-on should be one combined lane or split between discovery/recovery and observability API normalization.

## Approvals
- Reviewer: docs-review completed via `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`; refreshed current-head closeout/implementation approval remains pending.
- Date: 2026-03-21
