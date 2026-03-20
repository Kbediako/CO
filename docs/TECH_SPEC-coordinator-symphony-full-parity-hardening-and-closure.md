---
id: 20260320-1311-coordinator-symphony-full-parity-hardening-and-closure
title: Coordinator Symphony Full-Parity Hardening and Closure
relates_to: docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md
risk: high
owners:
  - Codex
last_review: 2026-03-20
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Land the current hardening slice that closes the remaining real parity gaps where authoritative CO data already exists, and record any residual blockers explicitly instead of overstating hardened full parity.
- Scope: `1311` covers four ordered slices: docs/spec lock, deterministic per-issue workspace substrate, authoritative provider lifecycle reconcile plus continuation behavior, and the required observability/UI parity surfaces.
- Constraints:
  - parity claims are governed by `/Users/kbediako/Code/symphony/SPEC.md` when the Elixir tree drifts
  - tracker writes remain outside the core blocker set
  - no shared-repo-root execution fallback once per-issue workspace semantics land

## Technical Requirements
- Functional requirements:
  - Implement deterministic per-issue workspaces and persist workspace identity for provider-started child runs.
  - Ensure provider child runs execute with `cwd` confined to the issue workspace, not the shared repo root.
  - Expand provider lifecycle bookkeeping so one control-host authority owns `claimed`, `running`, `retrying`, `completed`, and `released` semantics.
  - Add a running-issue reconcile loop that:
    - checks child-run terminal state
    - checks current provider issue state
    - stops or releases work when an issue leaves the active set
    - schedules continuation or retry without waiting for a fresh provider event when the issue remains active
  - Raise issue eligibility from the current narrow accepted-event plus `started` contract toward the upstream scheduler model, including claimed/running exclusion and explicit active-state gating.
  - Extend compatibility and observability surfaces to expose authoritative issue/workspace/lifecycle state, and return `null` rather than synthetic values when live turn/token/rate-limit data is not currently captured.
- Non-functional requirements (performance, reliability, security):
  - workspace provisioning must fail closed and be restart-safe
  - lifecycle reconciliation must be idempotent across restart and repeated provider events
  - manifests and ledgers must remain auditable from `.runs/<task>/` and `out/<task>/` without hidden state
- UI/read-model updates must be driven from authoritative runtime state rather than best-effort inference
- Interfaces / contracts:
  - add persisted workspace identity to child-run manifests and selected-run read models
  - widen provider-intake state to record authoritative lifecycle state, not just best-effort launch correlation
  - preserve existing `/api/v1/state`, `/api/v1/<issue>`, and `/api/v1/refresh` routes, but make refresh semantics capable of true poll-plus-reconcile for the provider lifecycle path

## Architecture & Data
- Architecture / design adjustments:
  - `1311A` docs program locks the state machine, workspace contract, validation, and lane sequencing
  - `1311B` workspace substrate introduces deterministic per-issue repository workspaces, rooted under a dedicated workspace root, with child runs launched via explicit `CODEX_ORCHESTRATOR_ROOT` plus preserved `RUNS_DIR` and `OUT_DIR`
  - `1311C` provider lifecycle owns reconcile, continuation, retry, and stop/release semantics across `providerIssueHandoff`, `providerIntakeState`, runtime publish paths, and control-host lifecycle wiring
  - `1311D` observability/UI parity upgrades selected-run, compatibility, and UI payloads only after the workspace and lifecycle contracts are authoritative
- Data model changes / migrations:
- child-run manifests need persisted workspace metadata so selected-run projection no longer guesses workspace from run directory
- provider-intake state needs explicit lifecycle fields for claim status, reconcile timestamps, and terminal release reasons
- compatibility/read-model payloads need workspace, retry, continuation, and refresh-state fields, plus truthful null handling for non-authoritative counters
- External dependencies / integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workspace.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `packages/orchestrator-status-ui/*`

## Validation Plan
- Tests / checks:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1311-coordinator-symphony-full-parity-hardening-and-closure`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - focused lifecycle/workspace tests:
    - `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ControlServerPublicLifecycle.test.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/SelectedRunProjection.test.ts orchestrator/tests/ControlServer.test.ts`
  - repo gate chain:
    - `node scripts/delegation-guard.mjs`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run review`
    - `npm run pack:smoke` when downstream CLI/control-host/status-UI contracts change
- Rollout verification:
  - restart the control host against the existing provider setup
  - prove a real provider issue launches inside a deterministic workspace
  - prove normal completion while still active continues without a fresh provider event
  - prove a provider transition out of the active set stops or releases the run and clears stale `running` state
- Monitoring / alerts:
  - persist lifecycle evidence under `.runs/local-mcp/cli/control-host/`
  - capture live proof notes under `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/<timestamp>-closeout/`

## Open Questions
- Whether the richer Elixir dashboard/host monitor behavior should be a hard requirement for the initial closure claim, or a second closeout pass after SPEC-level lifecycle/workspace parity is green.
- Whether issue eligibility parity should include full Todo-blocker gating in the first lifecycle slice, or land immediately after authoritative reconcile semantics are stable.

## Current Branch Truth
- The current branch lands deterministic per-issue workspace confinement, refresh-driven continuation, release-on-inactive reconcile behavior, and truthful observability/read-model hardening.
- Live `turn_count`, `codex_totals`, `rate_limits`, and related retry counters are not derivable from current authoritative CO sources, so `1311` cannot truthfully claim full parity closure until that capture exists or is explicitly deferred into follow-on work.

## Approvals
- Reviewer: Codex (top-level orchestrator)
- Date: 2026-03-20
