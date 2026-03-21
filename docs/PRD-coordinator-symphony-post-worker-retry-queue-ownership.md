# PRD - Coordinator Symphony Post-Worker Retry Queue Ownership

## Added by Bootstrap 2026-03-21

## Summary
- Problem Statement: after `1314`, the remaining retry parity blocker is no longer retry payload truth, but retry ownership. Upstream authority in `/Users/kbediako/Code/symphony/SPEC.md:608-626`, `/Users/kbediako/Code/symphony/SPEC.md:743-794`, and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:128-145,775-812,1130-1139` expects the orchestrator to own post-worker continuation and failure retries through an in-memory queue with cancelable timers and monotonic due times. CO still relies on persisted wall-clock `retry_due_at` plus the control-host refresh / rehydrate loop to decide when to relaunch.
- Desired Outcome: open the next truthful bounded slice after `1314` so CO moves retry dispatch ownership closer to Symphony. Post-worker continuation and failure retries should be owned by a dedicated scheduler/runtime seam instead of the 15s refresh cadence, while `/api/v1/state.retrying` and `/api/v1/<issue>` remain truthful and restart-safe. `1315` is necessary but not sufficient for full hardened parity: post-`1315` work still remains around poll-owned discovery/recovery and observability API normalization unless provider-driven discovery is later accepted as an intentional divergence.

## Status Update - 2026-03-22
- Docs-review for `1315` succeeded at `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`.
- `1315` implementation is now landed on the current branch through `orchestrator/src/cli/control/providerIssueRetryQueue.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, and the coupled runtime-truth fix in `orchestrator/src/cli/control/controlRuntime.ts`.
- Focused current-branch regressions now pass in `orchestrator/tests/ProviderIssueHandoff.test.ts` and `orchestrator/tests/ControlRuntime.test.ts`; a refreshed current-head closeout pack for the integrated `1312`-`1315` branch packet is still pending.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): continue the full hardened parity program by closing the real next blocker after `1314`, not by overstating partial parity. The next slice must target scheduler-owned retry queue behavior and keep the docs packet explicit about what still remains beyond it.
- Success criteria / acceptance:
  - normal post-worker continuation retries are scheduled promptly by a dedicated runtime retry queue owner instead of waiting for the public refresh loop
  - refresh / rehydrate becomes observer-bootstrap only, not a second active retry owner
  - retry requeue cancels and replaces any prior pending retry for the same issue
  - pending retry timers are also canceled when the issue becomes non-active, the claim is released, manual stop/cancel wins, retry dispatch succeeds, or startup rebuild replaces stale timers
  - retry deadlines inside the owner are monotonic/runtime-owned even if CO still persists a projected wall-clock timestamp for restart/bootstrap truth
  - retry ownership preserves truthful retry metadata plus `workspace_path` where CO actually tracks it, without inventing `worker_host` fields that the current provider flow does not carry
  - `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts` remain truthful while the ownership seam changes
  - the packet keeps the remaining post-`1315` real gaps explicit: poll-owned discovery/recovery, `POST /api/v1/refresh` ack shape, running/issue state semantics, and retry workspace fallback
  - the slice stays separate from `1312` same-session in-worker continuation, broader tracker reconciliation, optional dashboard/TUI/Telegram richness, and tracker write-back

## Goals
- Introduce an explicit CO runtime owner for post-worker retry queue scheduling and dispatch.
- Make normal post-worker continuation retries happen on a short scheduler-owned delay instead of waiting for the control-host refresh timer.
- Cancel and replace existing pending retries for the same issue when a new retry supersedes them.
- Keep persisted retry claim fields as compatibility/bootstrap truth only where they are still needed for restart safety and observability.
- Preserve authoritative retry payloads already delivered by `1314`.

## Non-Goals
- Reopening the `1314` retry-state/API authority slice.
- Reopening the `1312` in-worker same-session continuation seam.
- Claiming full hardened parity from `1315` alone.
- Solving full active-run reconciliation, tracker refresh richness, or broader stop/release orchestration in this packet.
- Treating orchestrator-managed Linear write-back as a parity requirement.
- Bundling optional dashboard/TUI/Telegram presentation richness into this slice.

## Metrics & Guardrails
- Primary Success Metrics:
  - a clean worker exit queues a continuation retry immediately under scheduler ownership rather than waiting for the 15s refresh loop
  - rescheduling a retry for the same issue cancels the old pending retry
  - pending timer plus public/manual refresh near the same due boundary still dispatches exactly once
  - retry queue projections remain truthful for `attempt`, `due_at`, and `error`
  - restart/bootstrap paths do not silently lose retry truth or increment attempts incorrectly
- Guardrails / Error Budgets:
  - do not conflate this slice with in-worker same-session continuation
  - do not weaken current provider-intake claim truth or retry API payload truth
  - do not silently depend on wall-clock persistence as the active runtime owner once the queue owner exists
  - keep the diff bounded away from unrelated reconciliation and UI work unless tests prove a hard coupling

## User Experience
- Personas:
  - CO operator validating whether post-worker continuation retry behavior now matches Symphony more closely
  - follow-on implementer carrying full parity forward without reopening already-landed retry payload truth
- User Journeys:
  - after a worker exits normally, the operator sees a continuation retry queued promptly under scheduler ownership
  - the retry entry remains truthful on `/api/v1/state.retrying` and `/api/v1/<issue>` while the timer is pending
  - if a retry is superseded, the operator does not see stale duplicate pending retries for the same issue

## Technical Considerations
- Architectural Notes:
  - `1314` already made retry payloads authoritative, but left retry launch timing under persisted `retry_due_at` plus refresh / rehydrate ownership
  - Symphony and the Elixir reference own retries in memory with timer cancellation and monotonic due times
  - the likely CO seam is a dedicated runtime retry-queue owner under `orchestrator/src/cli/control/` that cooperates with `providerIssueHandoff.ts` and `controlServerPublicLifecycle.ts`
  - persisted retry metadata may remain as a shadow/projection layer for restart/bootstrap truth even if it no longer owns active timing
  - even after `1315`, full parity still requires a follow-on lane for poll-owned discovery/recovery plus observability API normalization unless provider-driven discovery is later documented as an intentional divergence
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`

## Open Questions
- Should the runtime owner persist a projected `retry_due_at` wall-clock timestamp only for restart/bootstrap, or should restart rehydrate rebuild pending timers from a narrower persisted record?
- Does the cleanest seam live inside `providerIssueHandoff.ts`, or should retry ownership move into a new dedicated queue helper that `controlServerPublicLifecycle.ts` wires up?

## Approvals
- Product: Self-approved for the next bounded retry-ownership parity slice after `1314`.
- Engineering: Self-approved on 2026-03-22 against the current Symphony SPEC, current Elixir orchestrator behavior, and the refreshed branch publication posture that now reflects the landed `1315` implementation.
- Design: N/A
