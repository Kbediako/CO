---
id: 20260320-1311-coordinator-symphony-full-parity-hardening-and-closure
title: Coordinator Symphony Full-Parity Hardening and Closure
relates_to: docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md
risk: high
owners:
  - Codex
last_review: 2026-03-21
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Keep `1311` truthful to the current branch state. The hardening tranche below is landed, but full Symphony parity is still not closed.
- Scope: record the landed workspace/lifecycle/UI/compatibility fixes, keep the remaining blockers explicit, and describe validation without overstating parity closure.
- Constraints:
  - parity claims are governed by `/Users/kbediako/Code/symphony/SPEC.md` when the Elixir tree drifts
  - tracker writes remain outside the core blocker set
  - full parity cannot be claimed while the remaining blockers are still present

## Current Branch State
- Landed fixes:
  - deterministic workspace recreation plus prune
  - legacy resume deterministic workspace fallback
  - resume workspace-root confinement validation
  - startup immediate refresh
  - queued/null release fail-closed behavior
  - released-claim stability on rehydrate
  - explicit authenticated/manual refresh requests now queue one follow-up pass instead of being dropped behind in-flight provider handoff work
  - issue eligibility now covers `Todo` plus Linear `state_type=started` issues, with a Todo blocker rule that prefers Linear blocker `state.type` and falls back to blocker state names
  - terminal-only cleanup for provider-managed `.workspaces/<taskId>` is present on release/startup replay
  - provider workspace cleanup now resolves against the real repo root when `CODEX_ORCHESTRATOR_RUNS_DIR` lives outside the repository
  - forced manifest writes now preempt same-tick scheduled persister waits instead of inheriting the full heartbeat interval
  - selected child-manifest UI metadata truthfulness
  - selected-run workspace fallback stays truthful for child CLI manifests under repo-local and external overridden runs roots
  - compatibility `session_id` null handling
- Continuation posture:
  - provider control-host continuation/retry handoff for active issues is materially covered, but full parity is still not closed
- Remaining blockers:
  - live observability is still not an authoritative runtime snapshot for turn/retry/token/rate-limit counters
  - active-issue continuation after a normal success still starts a fresh child run instead of continuing the same session

## Technical Requirements
- Landed/maintained requirements:
  - workspace recreation and pruning must stay deterministic across provider starts and resume paths
  - legacy resume paths must recover the deterministic workspace rather than silently drifting to the shared repo root
  - resume/startup flows must validate workspace-root confinement before launching child work
  - startup refresh must run immediately enough to reconcile provider state without waiting for a later poll
  - explicit refresh requests during in-flight startup/rehydrate work must queue one follow-up refresh without reopening overlap between provider handoff operations
  - queued/null release handling must fail closed, and released claims must remain stable across rehydrate
  - provider workspace cleanup must resolve against the real repository root rather than assuming `.runs` lives under the repo root
  - forced manifest writes must be able to preempt a same-tick scheduled persist without waiting for the heartbeat interval
  - selected-run/UI compatibility payloads must expose truthful child-manifest metadata and preserve `session_id=null` where no session exists
- Remaining requirements:
  - add authoritative runtime capture for live turn/retry/token/rate-limit counters or explicitly defer those counters out of parity scope
  - replace fresh-child-run continuation after success with upstream-faithful same-session continuation
- Interfaces / contracts:
  - selected child-manifest metadata must stay truthful in read models and UI surfaces
  - compatibility issue payloads must keep `session_id` nullable rather than inventing values
  - release/retry bookkeeping must remain fail-closed across queued/null and rehydrate paths

## Architecture & Data
- Workspace/lifecycle surfaces touched by the landed tranche:
  - `orchestrator/src/cli/run/workspacePath.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/controlAuthenticatedRouteHandoff.ts`
- Read-model/UI surfaces touched by the landed tranche:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/selectedRunPresenter.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `packages/orchestrator-status-ui/*`

## Validation Plan
- Current verified checks:
  - `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure node scripts/delegation-guard.mjs` passed (`5` subagent manifests found)
  - `node scripts/spec-guard.mjs --dry-run` passed
  - `npm run build` passed
  - `npm run lint` passed
  - the March 21 review-fix regression pack passed `5/5` files and `70/70` tests
  - the persister fast-path regression pack passed `2/2` files and `16/16` tests
  - a trivial `CodexOrchestrator.start()` repro dropped from about `5.1s` to about `112ms`
  - local `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` is terminal again at `282/282` files and `2014/2014` tests in `204.37s`; the earlier quiet tail reflected long late suites (`tests/cli-command-surface.spec.ts` and `tests/run-review.spec.ts`), not a persister deadlock
- Closure gate:
  - do not claim parity closeout until the remaining blockers are resolved, even though the local suite is now terminal green again

## Open Questions
- Whether `1311` should add authoritative live counter capture directly, or explicitly defer those fields into a narrower follow-on without pretending parity is closed.
- Whether same-session continuation should be implemented inside the provider/control-host architecture, or moved into a dedicated follow-on session-owner lane.

## Approvals
- Reviewer: Codex (top-level orchestrator)
- Date: 2026-03-21
