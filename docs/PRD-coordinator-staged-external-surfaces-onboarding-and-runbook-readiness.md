# PRD - Coordinator Staged External Surfaces Onboarding + Runbook Readiness (1008)

## Summary
- Problem Statement: Coordinator transport/control policy is hardened, but setup readiness for external surfaces still lacks one staged onboarding plan with explicit operator runbooks and gating.
- Desired Outcome: docs-first planning slice that sequences setup safely as Telegram first, Linear advisory path in parallel-now, and Discord deferred until Telegram evidence closes.
- Scope Status: docs-first planning lane under task `1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness`; no runtime code edits in this stream.

## User Request Translation
- Create a new planning slice focused on real setup readiness with staged activation.
- Preserve authority boundaries: CO remains execution authority; Coordinator remains intake/control bridge only.
- Make rollout gates explicit and auditable with mock/manual expectations and runbook deliverables.

## Authority + Safety Invariants
- CO remains the sole execution authority for control-state transitions and scheduler actions.
- Coordinator remains an intake/control bridge and cannot become runtime execution authority.
- External surfaces submit intents through CO control APIs only; direct state mutation is forbidden.

## Auth/Token + Idempotency Requirements (Mutating Controls)
- Mutating-control requests must remain bound to scoped actor identity and transport principal.
- Token/session requirements remain mandatory: scope, expiry, replay protection, revocation, and fail-closed rejection.
- Idempotency requirements remain mandatory: deterministic request/intent index behavior, replay-window enforcement, and canonical traceability fields.
- Any missing/invalid auth token, replay guard, or idempotency context is hard-fail with auditable reason codes.

## Rollout Order + Promotion Gates
1. Telegram setup + canary first.
- Gate: setup runbook completed, credentials scoped/rotatable, canary path validated, rollback tested, no authority drift.

2. Linear advisory integration setup now (non-authoritative).
- Gate: advisory-only dispatch contract preserved, no mutation side effects, kill-switch/default-off posture verified.

3. Discord deferred.
- Gate to start Discord: Telegram setup/canary evidence closed and stable; then Discord follows same setup/canary controls.

## Operator Runbook Deliverables
- Telegram setup runbook:
  - credential provisioning/rotation checklist,
  - webhook/ingress setup and validation steps,
  - canary procedure, rollback steps, and incident triage matrix,
  - audit/traceability field verification checklist.
- Linear advisory runbook:
  - source binding and advisory-only mapping checklist,
  - non-authoritative dispatch validation steps,
  - malformed source fail-closed checks,
  - kill-switch/default-off verification steps.
- Discord deferred runbook stub:
  - explicit defer criteria,
  - readiness entry checklist that depends on Telegram closure evidence,
  - preflight and rollback templates reused from Telegram.

## Mock/Manual Test Expectations
- Telegram:
  - manual canary walkthrough confirms status visibility and guarded mutating-intent path behavior,
  - replay/expiry/idempotency edge-case simulation logs captured,
  - rollback drill demonstrates return to CO-only control path.
- Linear:
  - manual advisory dispatch simulations cover disabled-default, advisory-ready, kill-switched, malformed-source fail-closed,
  - explicit no-mutation proof (`control_seq` unchanged, no control-action events).
- Discord:
  - no activation tests in this slice; only deferred-entry checklist and acceptance conditions.

## Goals
- Produce complete docs-first artifacts for staged onboarding readiness.
- Freeze rollout order and go/no-go gates for Telegram, Linear advisory path, and Discord deferral.
- Define concrete operator runbook deliverables and manual evidence expectations.

## Non-Goals
- Runtime implementation changes under `orchestrator/src/**`.
- Enabling Discord active integration in this slice.
- Changing authority boundaries or weakening auth/idempotency controls.

## Acceptance Criteria
1. PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are created and synchronized for task 1008.
2. Rollout sequence is explicit: Telegram first, Linear advisory now, Discord deferred until Telegram evidence closure.
3. CO authority + Coordinator intake/control-bridge boundaries are explicit and unchanged.
4. Auth/token and idempotency requirements for mutating controls are explicit and fail-closed.
5. Ordered validation gates list is documented exactly and aligned with current repository policy.
6. Required docs validations for this stream (`spec-guard --dry-run`, `docs:check`, `docs:freshness`) are captured with evidence logs.
