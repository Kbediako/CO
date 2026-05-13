---
id: 20260401-linear-95b040bc-b150-4c39-bc56-64b13f55579f
title: CO: Reduce steady-state Linear request burn across control-host and provider-worker flows
relates_to: docs/PRD-linear-95b040bc-b150-4c39-bc56-64b13f55579f.md
risk: high
owners:
  - Codex
last_review: 2026-04-01
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-95b040bc-b150-4c39-bc56-64b13f55579f.md`
- PRD: `docs/PRD-linear-95b040bc-b150-4c39-bc56-64b13f55579f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-95b040bc-b150-4c39-bc56-64b13f55579f.md`
- Task checklist: `tasks/tasks-linear-95b040bc-b150-4c39-bc56-64b13f55579f.md`

## Traceability
- Linear issue: `CO-62` / `95b040bc-b150-4c39-bc56-64b13f55579f`
- Linear URL: https://linear.app/asabeko/issue/CO-62/co-reduce-steady-state-linear-request-burn-across-control-host-and

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: reduce avoidable Linear request pressure across control-host polling, provider-worker rereads, and helper mutation flows by introducing shared, token-scoped budget awareness that survives across callers and exposes truthful reset-window metadata.
- Scope:
  - register the docs-first packet for `linear-95b040bc-b150-4c39-bc56-64b13f55579f`
  - add a shared Linear budget-state owner fed by GraphQL response headers from success and explicit rate-limit failures
  - replace fixed control-host poll scheduling with a policy-driven interval that can back off or suppress itself truthfully under pressure
  - gate helper mutation flows and provider-worker rereads on the shared budget state when a cooldown is active or the remaining budget is already insufficient
  - surface the resulting budget and suppression state in worker proof plus control-host observability output
- Constraints:
  - preserve the narrow `CO-33` and `CO-34` fixes instead of reopening those lanes
  - do not build a broad stale cache of issue payloads
  - fail truthfully when the shared Linear budget is exhausted; do not silently retry away the condition

## Technical Requirements
- Functional requirements:
  - relevant Linear request or complexity headers must be available to callers on both successful and rate-limited GraphQL responses
  - a shared budget-state store must persist the latest relevant Linear rate-limit sample keyed to the active token without leaking the raw token
  - control-host polling must derive its next interval from the shared budget state instead of a hard-coded `15s` timer only
  - multi-step helper flows must fail fast before live Linear mutations when the latest shared budget state shows an active cooldown or clearly insufficient request budget for the planned sequence
  - provider-worker tracked-issue rereads must record the shared Linear budget metadata they observe and respect the same cooldown state
  - observability output must explain why polling or rereads are suppressed, including reset-window metadata when available
- Non-functional requirements (performance, reliability, security):
  - keep the new state machine deterministic and fail-closed when the budget file is missing or malformed
  - key persisted state by token fingerprint rather than raw credentials
  - use atomic persistence so concurrent callers do not leave partially written shared state
  - avoid widening into unrelated Linear workflow or dashboard redesign work
- Interfaces / contracts:
  - `executeLinearGraphql` success and failure contracts
  - control-host refresh scheduling in `controlServerPublicLifecycle.ts`
  - helper mutation entrypoints in `providerLinearWorkflowFacade.ts`
  - tracked-issue reread lifecycle and proof output in `providerLinearWorkerRunner.ts`
  - control-host compatibility projection / observability output in `observabilityReadModel.ts` and `observabilitySurface.ts`

## Architecture & Data
- Architecture / design adjustments:
  - introduce a new Linear budget-state helper under `orchestrator/src/cli/control/` that can:
    - parse relevant response headers into a normalized budget sample
    - persist the latest sample and active cooldown keyed by token fingerprint
    - evaluate whether an operation should proceed, back off, or fail fast
  - update `linearGraphqlClient.ts` so successful responses preserve the same relevant headers already read on failures
  - feed the shared budget store from `linearDispatchSource.ts` and `providerLinearWorkflowFacade.ts`, since those are the main sources of steady-state control-host and helper spend
  - update `controlServerPublicLifecycle.ts` to compute the next poll delay from the shared budget state and persist the chosen schedule through the existing polling health path
  - update `providerLinearWorkerRunner.ts` to persist the latest shared Linear budget snapshot in worker proof and to stop re-hitting an already exhausted bucket from later turns
- Data model changes / migrations:
  - add a token-scoped shared budget-state file under the Codex home or an explicit env override for deterministic tests
  - extend `ProviderLinearWorkerProof` with a Linear budget or suppression summary that is distinct from the existing Codex `rate_limits` payload
  - extend control-host compatibility or observability payloads so the shared budget state can be inspected without reading local files directly
- External dependencies / integrations:
  - Linear GraphQL headers
  - existing helper audit path and worker proof persistence
  - existing control-host polling health persistence in `provider-intake-state.json`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused unit coverage for the shared Linear budget-state logic
  - focused regressions in `orchestrator/tests/LinearDispatchSource.test.ts`
  - focused regressions in `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - focused regressions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - targeted observability or polling coverage if new read-model fields or schedule policy require it
- Rollout verification:
  - verify the control-host next poll interval backs off or suppresses itself based on shared budget state
  - verify helper flows fail before redundant sequential GraphQL requests when the budget is already insufficient
  - verify worker proof and control-host read surfaces record the relevant budget or cooldown metadata
- Monitoring / alerts:
  - rely on worker proof, helper audit logs, and control-host polling state for human explanation of suppression decisions

## Open Questions
- None before implementation. Exact interval thresholds can remain implementation-scoped as long as the resulting policy is truthful and test-covered.

## Approvals
- Reviewer: pending docs-review child stream
- Status: bootstrap drafted
- Date: 2026-04-01
