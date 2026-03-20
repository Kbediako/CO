# PRD - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap 2026-03-20

## Summary
- Problem Statement: `1310` proved that CO was not yet at full Symphony parity. The remaining blockers are not small bug fixes; they are architectural and lifecycle gaps against the current `/Users/kbediako/Code/symphony/SPEC.md` contract and the current Elixir reference at commit `a164593aacb3db4d6808adc5a87173d906726406`. CO still lacks deterministic per-issue workspaces, authoritative claim/running/retry/completed bookkeeping, true internal continuation while an issue stays active, and a provider-owned reconcile/stop loop when issue state changes.
- Desired Outcome: open and execute a new delivery lane that closes the remaining real parity gaps as far as current authoritative CO data allows, using docs-first planning and delegated implementation streams, while leaving any residual blocker explicit instead of overstating full parity closure.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Open a new docs-first delivery lane for actual full Symphony parity, orchestrate it end to end with subagents doing as much of the implementation and review work as possible, and use the current SPEC plus current Elixir reference as the truth source instead of reusing the narrower 1310 audit lane.
- Success criteria / acceptance:
  - a new `1311` docs-first packet exists and explicitly supersedes `1310` as the closure lane
  - the lane lands deterministic workspace confinement, authoritative lifecycle bookkeeping, repeated continuation while active, running-issue reconcile/stop behavior, and truthful observability/read-model hardening
  - any still-open closure blockers, including issue eligibility breadth or missing authoritative turn/token/rate-limit capture, are recorded explicitly and kept out of merged parity claims
  - tracker-write ownership stays correctly classified as aligned at the core-contract level rather than being misframed as the blocker
  - docs-review runs before implementation and implementation streams are broken into bounded ownership slices
  - the lane carries through implementation, validation, live provider proof, PR feedback, merge, and clean-main closeout unless a concrete external blocker prevents completion
- Constraints / non-goals:
  - when SPEC and current Elixir reference differ, parity claims are governed by the SPEC
  - do not reopen `1303` or mutate `1310` into a new architecture lane; keep the audit packet truthful and intact
  - do not rely on the shared repo root as an implicit fallback workspace once the parity lane starts landing workspace confinement
  - do not widen tracker authority into orchestrator-owned ticket writes that the SPEC keeps in worker/tooling space

## Goals
- Close the real remaining gaps between CO and the current Symphony orchestrator contract without overstating closure when authoritative data is still missing.
- Keep the delivery sequence explicit: docs/spec first, workspace substrate, provider lifecycle reconcile plus continuation, then observability/UI parity.
- Preserve CO as execution authority while matching Symphony's scheduler/runner and tracker-reader responsibilities.
- Produce artifact-backed proof that the new behavior works against the existing provider/control-host setup.

## Non-Goals
- Re-litigating whether `1310` was truthful; that lane is already the accepted rebaseline.
- Expanding the lane into general multi-tenant control-plane work or unrelated cloud/runtime migrations.
- Treating repo-owned tracker writes as a mandatory parity requirement when the SPEC still leaves them to workflow/runtime tooling.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - child runs execute inside deterministic per-issue workspaces instead of the shared repo root
  - provider lifecycle state is authoritative enough to reconcile running, retrying, completed, and released states without stale `running` claims after child completion
  - normal child completion can continue work while the issue remains active without waiting for a fresh provider event
  - running work is stopped or released correctly when the provider issue leaves the active set
  - selected-run, compatibility, and UI surfaces expose real issue/workspace/lifecycle state and never fabricate turn/token/rate-limit values when authoritative capture does not exist
- Guardrails / Error Budgets:
  - fail closed if workspace provisioning fails; do not silently fall back to shared repo-root execution
  - keep parity claims SPEC-governed whenever the Elixir tree shows richer or drifted behavior
  - keep each implementation slice reviewable and evidence-backed rather than landing one opaque rewrite

## User Experience
- Personas: CO operator trying to run Symphony-style long-lived issue execution safely and truthfully
- User Journeys:
  - start the control host and see issue work mapped to deterministic workspaces and authoritative lifecycle state
  - watch the selected-run or compatibility surfaces and understand which issue is running, where it is running, and whether it is retrying, continuing, or being reconciled
  - move a provider issue out of the active state and see CO stop or release the work without stale ledger state

## Technical Considerations
- Architectural Notes:
  - the new lane is a follow-on to `1310`, not a correction of it; `1310` remains the truthful audit and bounded-fix packet
  - the current upstream contract is rooted in `/Users/kbediako/Code/symphony/SPEC.md`, with corroborating behavior in the Elixir orchestrator, agent runner, workspace, status dashboard, presenter, and observability API modules
  - the expected workspace substrate for `1311` is deterministic per-issue repository workspaces with persisted workspace identity, rather than continuing to infer workspace from run directory or repo root
  - lifecycle parity requires a single durable control-host authority over claim/running/retry/completed state, plus explicit reconcile and stop behavior when tracker state changes
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workspace.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`

## Open Questions
- Should the richer Elixir dashboard/host monitor behavior be closed completely in `1311`, or should the lane claim SPEC-level parity first and treat additional Elixir-only operator affordances as a separate stretch target?
- Do provider-active-state continuation semantics require a new explicit control-host reconcile tick, or can they reuse the existing runtime refresh surface once lifecycle authority is widened?

## Approvals
- Product: Self-approved from the operator directive to get to full hardened parity using a docs-first approach.
- Engineering: Pre-implementation self-review completed on 2026-03-20 against the current Symphony SPEC, current Elixir reference, and current CO control-host/lifecycle surfaces.
- Design: N/A
