# ACTION_PLAN - Coordinator Symphony Post-Worker Retry Queue Ownership

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: register and implement the next truthful parity slice after `1314` by moving post-worker retry timing under explicit scheduler ownership.
- Scope: dedicated retry queue owner, continuation/failure retry scheduling, cancel/requeue behavior, and restart-safe retry projection truth.
- Assumptions:
  - `1312` covers in-worker same-session continuation before worker exit
  - `1314` already covers backend-authoritative retry payload truth
  - the remaining blocker is retry ownership and cadence, not retry payload presence
  - `1315` is the next required slice, not the last one; post-`1315` work still remains around poll-owned discovery/recovery and observability API normalization unless provider-driven discovery is later accepted as an intentional divergence
  - broader reconciliation, UI richness, and tracker write-back remain separate

## Status Update - 2026-03-21
- docs-review for `1315` succeeded at `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`.
- `1315` implementation is now landed on the current branch, with focused regressions passing in `ProviderIssueHandoff.test.ts` and `ControlRuntime.test.ts`.
- A refreshed current-head closeout pack for the integrated `1312`-`1315` branch packet is still pending.

## Milestones & Sequencing
1. Register the bounded `1315` packet
   - draft PRD, TECH_SPEC, ACTION_PLAN, task checklist, and mirror
   - update `tasks/index.json` and `docs/TASKS.md`
2. Define the retry-owner seam
   - choose the smallest dedicated runtime retry owner that can schedule, reschedule, cancel, and consume retries
   - decide what persisted retry data remains necessary for restart/bootstrap truth
3. Implement scheduler-owned retry dispatch
   - move post-worker continuation/failure retry timing off refresh-loop deadline checks
   - make refresh / rehydrate observer-bootstrap only for retry timing
   - preserve truthful retry attempts, errors, projected due-at fields, and `workspace_path` without inventing `worker_host` fields CO does not track
4. Preserve projection/read-model truth
   - ensure `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts` stay authoritative while ownership changes
5. Validate, record, and prove
   - run focused retry-owner regressions
   - run the standard full validation lane
   - collect live control-host proof that continuation retry is scheduler-owned rather than refresh-owned
6. Prepare the follow-on parity lane
   - keep the post-`1315` real gaps explicit: poll-owned discovery/recovery, `POST /api/v1/refresh` ack shape, running/issue state semantics, and retry workspace fallback
   - do not overstate `1315` as full hardened parity closure

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`

## Validation
- docs-review for the `1315` packet before implementation: succeeded at `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`
- focused retry-owner regressions proving prompt continuation retry, cancel/requeue behavior, explicit timer-cancel conditions, no double-dispatch at the due boundary, truthful payloads, and restart-safe rebuild
- standard implementation lane commands once code lands
- current-head closeout pack for the earlier `1312`/`1313`/`1314` unit remains `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`; a refreshed current-head pack covering the integrated `1312`-`1315` branch packet is still pending
- live control-host proof for scheduler-owned continuation retry plus truthful `/api/v1/state.retrying` and `/api/v1/<issue>`

## Risks & Mitigations
- Risk: the slice widens into full reconciliation or same-session continuation work.
  - Mitigation: keep `1312`, `1314`, and `1315` seams explicit and separate.
- Risk: retry ownership gets duplicated between the queue owner and refresh loop.
  - Mitigation: make refresh an observer/reconcile path, not the active retry scheduler.
- Risk: restart safety regresses if persisted retry truth is removed too aggressively.
  - Mitigation: preserve or rebuild only the minimum persisted retry state needed for deterministic restart.
- Risk: `1315` gets overstated as full hardened parity closure.
  - Mitigation: keep the post-`1315` follow-on gaps explicit in the docs packet and closeout evidence.

## Approvals
- Reviewer: Self-approved for the next bounded retry-ownership parity slice after `1314`.
- Date: 2026-03-21
