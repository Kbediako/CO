# PRD - CO: capture live Linear request-burn telemetry after webhook-first targeted reconcile rollout
## Traceability
- Linear issue: `CO-147` / `7105185a-05da-4f49-89d9-35efbba38f3c`
- Linear URL: https://linear.app/asabeko/issue/CO-147/co-capture-live-linear-request-burn-telemetry-after-webhook-first
- Source implementation: `CO-144` / commit `6aeb56796` (`CO-144 shift Linear intake to webhook-first targeted reconcile (#407)`)
## Problem
- `CO-144` already landed the webhook-first targeted reconcile split, but the repo still needs live post-rollout telemetry before anyone can truthfully argue for a later Linear quota increase.
- The follow-up is evidence capture, not behavior redesign: the team needs current shared-budget headroom, header-backed endpoint observations, and an explicit sufficiency verdict from the rolled-out path.
## Outcome
- Capture a live shared-budget snapshot from the shared-root control-host and the active CO-147 provider-worker proof.
- Record fresh live `dispatch_source_tracked_issues:fresh_discovery` and `dispatch_source_tracked_issues:recovery_sweep` observations from the shipped `resolveLiveLinearTrackedIssues(...)` path.
- Store a machine-checkable evidence packet under `out/linear-7105185a-05da-4f49-89d9-35efbba38f3c/manual/`.
- Record whether current optimized steady-state load is sufficient or whether a later quota-increase follow-up is warranted.
## Acceptance Criteria
- Live shared-budget and header-backed telemetry is captured against the landed `CO-144` behavior.
- The evidence separates tracked-issue reads for `dispatch_source_tracked_issues:recovery_sweep` versus `dispatch_source_tracked_issues:fresh_discovery`.
- The packet records an explicit evidence-backed verdict on current optimized-load sufficiency versus a later quota-increase lane.
- The lane completes without reopening intake behavior redesign.
## Non-Goals
- Reopening `CO-144` implementation or redesigning provider mutation, workpad, or PR helper behavior.
- Weakening shared-budget fail-fast, cooldown, or reservation semantics.
- Filing or approving a Linear quota-increase request in this lane.
- Replacing live proof with another deterministic local-only model.
## Protected Terms
- Preserve `webhook-first targeted reconcile`, `slow full recovery sweeps`, `dispatch_source_tracked_issues:recovery_sweep`, and `dispatch_source_tracked_issues:fresh_discovery`.
- Reject wrong interpretations such as "revisit the CO-144 design", "webhook-only intake", "request a quota increase now", or "treat stale deterministic proof as sufficient live evidence."
