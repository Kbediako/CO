# PRD - Coordinator Symphony Same-Session Continuation After Normal Success

## Added by Bootstrap 2026-03-21

## Summary
- Problem Statement: `1311` left one real parity blocker in place, but the new runtime-contract audit shows that the current CO gap is deeper than "fresh `start` after `succeeded`". Upstream authority in `/Users/kbediako/Code/symphony/SPEC.md:614-624,980,996-999` and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex:83-145` requires the worker to keep one app-server session alive across normal-success turns, reuse the same live thread in the same workspace, and send only continuation guidance on later turns. CO does not currently have that contract: `orchestrator/src/cli/control/providerIssueHandoff.ts` treats `resume` as a rerun surface over an existing `run_id` and still launches a fresh `start` after `latestRun.status === 'succeeded'`; `orchestrator/src/cli/types.ts` exposes no continuation/thread/guidance inputs on `ResumeOptions`; `orchestrator/src/cli/orchestrator.ts` and `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts` reload and reset the prior manifest for another run lifecycle rather than reusing a live app-server thread/session handle.
- Desired Outcome: keep `1312` truthful after that audit and lock the chosen seam. This lane now targets a provider-specific long-lived worker command/owner inside the existing pipeline model: it must keep one live app-server session and `thread_id` alive across normal-success turns, send continuation-only guidance on later turns, and hand control back to today’s scheduler logic only after the worker actually exits. `resume` stays rerun-only, top-level lifecycle stays intact, and `1313` is now the next registered follow-on blocker for backend-authoritative runtime snapshot parity after any truthful `1312` result.

## Status Update - 2026-03-22
- Current branch state: the provider-specific long-lived worker command/owner is now landed via `orchestrator/src/cli/providerLinearWorkerRunner.ts`, the `provider-linear-worker` pipeline in `codex.orchestrator.json`, and the default provider start path in `orchestrator/src/cli/controlHostCliShell.ts`.
- Same-session continuation now exists within one provider worker run: turn 1 sends the full prompt, later turns reuse the same live `thread_id` with continuation-only guidance, and a run-dir proof sidecar is written to `provider-linear-worker-proof.json`.
- The provider worker now resolves its max-turns budget from explicit env, `CODEX_HOME/config.toml [agent].max_turns`, or the upstream Symphony default `agent.max_turns = 20`, and it fails closed before turn 1 when the issue is already terminal.
- Current branch publication posture on `2026-03-22`: `1312`, `1313`, and `1314` are one integrated implemented publication unit. Use `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md` as the current-head closeout summary; older `20260321T124445Z-stacked-closeout` and `20260321T124510Z-stack-closeout` packs are stale for current-head validation.
- The truthful remaining boundary is unchanged: `resume(runId)` is still rerun-only, post-worker-exit refresh still launches a fresh provider worker run, selected-run proof surfacing is intentionally selected-only, and `1313` is now the next registered backend-authoritative runtime snapshot slice.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): refresh the `1312` packet so it reflects the runtime-contract audit exactly, keeps the upstream SPEC plus current Elixir runner as authority, and stops implying that a simple `succeeded -> resume` reroute is enough for same-session continuation parity.
- Success criteria / acceptance:
  - the packet states the real current blocker exactly: current CO `resume` is only a same-`run_id` rerun surface today, not true same-session continuation on a persisted live thread/session
  - the packet states explicitly that CO does not currently persist or reuse a live app-server thread/session handle after normal success and cannot pass continuation-only guidance on `resume` today
  - the packet cites the upstream authority for same-session continuation at `/Users/kbediako/Code/symphony/SPEC.md:614-624,980,996-999` and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex:83-145`
  - the packet cites the current CO divergence and current `resume` contract limitations at `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/types.ts`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`, and `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - the packet states the chosen implementation seam explicitly: a provider-specific long-lived worker command/owner inside the existing pipeline model, not a `resume` rewrite and not a top-level lifecycle refactor
  - scope stays bounded to `1312`; `1313` remains explicit as the next registered follow-on blocker for authoritative live observability counters, so `1312` is not described as full Symphony parity closure by itself
  - validation planning includes an explicit go/no-go gate for that chosen seam: either prove the provider worker command/owner can hold a live app-server/session/thread across turns and carry continuation-only guidance, or stop and re-scope instead of relabeling fresh-start or rerun behavior as parity
- Constraints / non-goals:
  - do not edit or restate `1311` as solved
  - do not widen `1312` into authoritative live observability counters, dashboard richness, or unrelated lifecycle slices
  - do not describe the existing `resume` surface as same-session continuation when it only reruns an existing `run_id`
  - do not describe `1312` alone as truthful full parity closure

## Goals
- Keep the packet truthful about the actual gap between current CO and upstream same-session continuation after normal success.
- Define the chosen deeper contract `1312` needs in order to be real: a provider-specific long-lived worker command/owner inside the existing pipeline model, with worker-lifetime live app-server/session/thread ownership plus a continuation-turn path that can send continuation-only guidance on the existing thread.
- Preserve truthful parity sequencing by recording that `1312` does not close full Symphony parity by itself and that `1313` still remains afterward as the next registered runtime-snapshot slice.

## Non-Goals
- Closing authoritative live `turn_count`, `codex_totals`, `rate_limits`, or retry-counter parity in this slice.
- Reopening the broader `1311` hardening scope or the earlier `1310` truthfulness audit.
- Claiming parity based only on scheduler-owned retry handoff, fresh-child-run relaunch behavior, or the current `resume` rerun surface.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - docs remain explicit that `1312` is not a simple `succeeded -> resume` reroute
  - docs remain explicit that the chosen seam is a provider-specific long-lived worker command/owner and that `resume` remains rerun-only
  - the upstream contract and the current CO rerun-only contract are both cited precisely enough for a follow-on implementer to act without re-deriving the slice
  - the packet keeps `1313` visible as the remaining blocker after `1312`, so `1312` is not mistaken for full parity closure
  - the packet contains an explicit stop/re-scope condition if that provider-worker seam is not feasible inside bounded scope
- Guardrails / Error Budgets:
  - do not conflate same-session continuation with a fixed turn-local `session_id`; the SPEC keeps the worker-lifetime app-server session and `thread_id` stable while turn-level `session_id` advances as `<thread_id>-<turn_id>`
  - do not mark parity closed until live proof shows no fresh child run is created for a normal-success continuation, the live thread/session is actually reused, continuation-only guidance is sent on that live thread, and the separate observability-counter blocker is also resolved
  - keep same-session wording tied to the upstream contract, not to best-effort CO retry/relaunch semantics or the current `resume` rerun semantics

## User Experience
- Personas:
  - CO operator validating truthful Symphony parity progress
  - follow-on implementer carrying the next continuation slice without reopening `1311`
- User Journeys:
  - before implementation, the operator can tell that `1312` now targets a provider-specific worker owner inside the existing pipeline model rather than an overclaimed "just use resume" plan
  - if `1312` lands truthfully, a normal successful turn on an active issue continues in the same workspace, worker-lifetime app-server session, and thread lineage instead of starting from a new child run
  - after `1312`, the operator still sees `1313` called out as the remaining parity blocker before any full-parity claim

## Technical Considerations
- Architectural Notes:
  - the current CO scheduler path still takes `latestRun.status === 'succeeded'` and calls `launchStartForTrackedIssue(...)` with `reason: 'provider_issue_continuation_launched'`, which is fresh-child-run continuation rather than same-session continuation
  - the current regression tests intentionally codify that divergence by expecting a fresh `start` instead of live-thread reuse after a succeeded run remains associated with an active issue
  - current CO `resume` is a rerun surface: it accepts `runId`, `actor`, `reason`, and `launchToken`, reloads that manifest, records a resume event, resets the run for resume, and runs lifecycle again; it does not accept or recover a live app-server thread/session handle or continuation-only guidance payload
  - the chosen seam is a provider-specific long-lived worker command/owner launched inside the existing pipeline model; it keeps one provider child run `in_progress` across continuation turns and only returns control to the current scheduler retry path after the worker exits
  - `resume` and top-level `performRunLifecycle(...)` semantics stay bounded: they remain rerun/run-lifecycle surfaces, not same-session continuation primitives
  - upstream behavior is more precise than "just retry later": the worker itself continues on the same live app-server session and thread during one worker lifetime, then the orchestrator only schedules a short continuation retry after the worker exits normally
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/types.ts`
  - `orchestrator/src/cli/orchestrator.ts`
  - `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/controlAuthenticatedRouteHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Open Questions
- Resolved on the current branch: the runtime-session proof snapshot stays as the dedicated run-dir sidecar `provider-linear-worker-proof.json` for this lane; it is not mirrored into broader manifest-backed counter surfaces.
- Resolved on the current branch: the minimal proof surfacing for `1312` is the selected-run path only (`selectedRunProjection` -> `observabilityReadModel` -> selected presenter/control payloads), while authoritative live counters remain deferred to `1313`.
- Remaining open question: live provider proof against the existing control host still needs to show this continuation contract end to end before `1312` can be called fully closed.

## Approvals
- Product: Self-approved for a bounded docs-first continuation-contract slice that stays truthful about remaining blockers and includes an explicit stop/re-scope path.
- Engineering: Self-approved on 2026-03-22 against the current upstream SPEC, current Elixir runner behavior, and the refreshed integrated branch publication posture.
- Design: N/A
