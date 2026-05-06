# ACTION_PLAN - Coordinator Symphony Same-Session Continuation After Normal Success

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: keep `1312` truthful after the runtime-contract audit and implement the chosen seam: a provider-specific long-lived worker command/owner inside the existing pipeline model. This lane is only valid if that worker owner can keep one live app-server session/thread alive across normal-success turns; it is not a `resume` rewrite and not a top-level lifecycle refactor.
- Scope: docs-first packet plus a bounded implementation plan for that provider worker owner and its narrow proof surface; authoritative live observability counters remain outside this slice as the follow-on `1313` blocker, so `1312` is not full Symphony parity closure by itself.
- Assumptions:
  - the planner already confirmed that same-session continuation must land before authoritative live observability counters
  - `/Users/kbediako/Code/symphony/SPEC.md:614-624,980,996-999` and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex:83-145` remain the contract anchors for this slice
  - current CO still diverges via fresh-child-run continuation at `orchestrator/src/cli/control/providerIssueHandoff.ts:1026-1047`
  - current CO `resume` is rerun-oriented: it only accepts `runId` plus resume metadata, reloads the previous manifest, resets it for resume, and does not carry a live thread/session handle or continuation-only guidance
  - the chosen implementation seam is a provider-specific long-lived worker command/owner launched inside the existing pipeline model, with post-worker-exit scheduler retry left as a separate path

## Status Update - 2026-03-22
- Completed on the current branch: the docs-first packet is registered, the provider-specific worker command/owner is landed, and the narrow proof sidecar is surfaced on the selected-run path only.
- Completed on the current branch: the provider worker now uses the upstream default `agent.max_turns = 20` when no explicit override exists and short-circuits already-terminal issues before launching turn 1.
- Current publication posture on `2026-03-22`: `1312` is implemented on this branch as part of the integrated `1312`/`1313`/`1314` publication unit. Use `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md` as the current-head closeout summary, and do not cite older `20260321T124445Z-stacked-closeout` or `20260321T124510Z-stack-closeout` packs as current-head validation.
- In progress: final validation/review/live-proof closure for the landed branch state.
- Still out of scope for this lane: post-worker-exit fresh-start behavior and authoritative live observability counters; those remain distinct from the in-worker same-session contract and keep `1313` open as the next registered follow-on slice.

## Milestones & Sequencing
1. Register the bounded `1312` packet
   - refresh PRD, TECH_SPEC, ACTION_PLAN, task checklist, and mirror around the audited truth
   - update `docs/TASKS.md` to make the stop/go condition explicit
   - keep `1313` explicit as the still-open follow-on blocker after `1312`
2. Lock the provider-worker seam
   - keep `resume(runId)` and top-level lifecycle semantics unchanged
   - treat current scheduler retry after worker exit as a separate post-worker path, not same-session continuation
   - if the provider worker owner cannot be made truthful inside bounded scope, stop `1312` and open the correct rescope lane instead of forcing an implementation
3. Land the provider-specific worker command/owner
   - add a provider-specific long-lived worker command/owner inside the existing pipeline model
   - start one app-server session and one live `thread_id`, send the full prompt on turn 1, and loop continuation-only guidance on later turns while the issue remains active
   - preserve same workspace, worker-host continuity, and current provider claim/release/retry boundaries already hardened in `1311`
4. Add the narrow proof surface
   - write a dedicated run-dir sidecar snapshot for `thread_id`, latest turn `session_id`, `turn_count`, owner phase/status, workspace path, and end reason
   - surface only the minimal selected-run/control proof needed for this lane without widening into authoritative `1313` counters
5. Prove the behavior narrowly or close as no-go
   - keep the existing post-worker-exit fresh-start regressions intact; add focused same-session coverage within the provider worker run instead
   - add focused worker-session/thread/workspace-lineage and continuation-guidance tests for the chosen seam
   - live-prove against the existing control host that a normal successful turn on an active issue continues on the same live worker/session/thread lineage rather than starting a new child run
   - if the seam is not feasible, close `1312` as stop/rescope only, with no parity claim
6. Keep parity sequencing truthful
   - mark `1312` complete only when same-session continuation is live-proven or when the no-go/rescope result is explicitly recorded
   - leave `1313` explicit for authoritative live observability counters and avoid any full-parity claim from `1312` alone

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
- `codex.orchestrator.json`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/run/runPaths.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/controlAuthenticatedRouteHandoff.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation
- Checks / tests:
  - docs-review for the `1312` packet before implementation
  - pre-implementation seam check: if the chosen provider worker owner cannot truthfully hold a live session/thread across turns, stop and re-scope instead of implementing
  - focused continuation regressions around `ProviderIssueHandoff` only after the deeper seam exists
  - standard implementation lane commands once code lands, including the required full-suite `npm run test` before closeout in addition to focused seam regressions
  - current-head closeout pack for the integrated implemented `1312`/`1313`/`1314` unit: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`; review/elegance reruns plus live provider proof still remain pending there
  - live proof on the existing control host showing same live thread/workspace/app-session lineage plus continuation-only guidance after a normal successful turn while the issue remains active
- Rollback plan:
  - if the provider worker owner cannot be made truthful inside the bounded seam, stop and keep the fresh-child-run plus rerun-only behavior explicitly documented instead of relabeling it as parity

## Risks & Mitigations
- Risk: `1312` gets overstated as full parity closure.
  - Mitigation: keep `1313` explicit as the remaining live-counter blocker in every mirror.
- Risk: stable thread reuse gets conflated with turn-local `session_id`.
  - Mitigation: keep the SPEC distinction explicit and require proof on stable worker-session/thread/workspace lineage rather than a fixed `session_id`.
- Risk: the implementation silently preserves fresh-child-run behavior or current rerun behavior behind new labels.
  - Mitigation: require an explicit live-session/thread continuation contract before changing tests, and require live proof that no fresh child run is launched and no rerun-only resume is misrepresented as parity.
- Risk: the truthful seam is wider than `1312` can carry.
  - Mitigation: keep an explicit no-go/rescope path in the plan instead of forcing an implementation slice that overclaims parity.

## Approvals
- Reviewer: Self-approved for the bounded continuation-contract planning slice after `1311`.
- Date: 2026-03-22
