---
id: 20260305-1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness
title: Coordinator Staged External Surfaces Onboarding + Runbook Readiness
relates_to: docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md
risk: high
owners:
  - Codex
last_review: 2026-03-05
---

## Summary
- Objective: define an implementation-checkable staged onboarding plan for external surfaces with explicit runbook deliverables and safety gates.
- Rollout order: Telegram first, Linear advisory path now, Discord deferred until Telegram evidence closes.
- Constraint: docs-only stream; no runtime edits under `orchestrator/src/**`.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning execution.
- Reasoning: staged onboarding can proceed safely only with explicit runbook contracts and phase gates that preserve CO authority boundaries.

## Technical Requirements
- Authority invariants:
  - CO remains execution authority.
  - Coordinator remains intake/control bridge.
- Mutating-control auth/token requirements:
  - scoped identity binding,
  - token/session expiry,
  - replay protection,
  - revocation support,
  - deterministic fail-closed reject semantics.
- Mutating-control idempotency requirements:
  - deterministic request/intent dedupe behavior,
  - replay-window enforcement,
  - canonical traceability fields for audit replay.
- Stage requirements:
  1) Telegram setup/canary first with runbook and rollback evidence.
  2) Linear advisory setup now with non-authoritative/no-mutation guarantees.
  3) Discord deferred until Telegram evidence closure.
- Runbook requirements:
  - Telegram operator setup/canary/rollback/incident runbook.
  - Linear advisory source-binding/validation/fail-closed runbook.
  - Discord deferred-entry checklist and reusable setup skeleton.

## Rollout Stage Gates
1. Telegram setup + canary gate.
- Evidence required:
  - setup runbook complete,
  - credential lifecycle controls documented,
  - canary passed,
  - rollback drill passed,
  - auth/replay/idempotency manual checks captured.

2. Linear advisory setup gate.
- Evidence required:
  - advisory-only contract preserved,
  - default-off + kill-switch controls validated,
  - malformed-source fail-closed behavior validated,
  - no-mutation proof captured.

3. Discord defer gate.
- Required before start:
  - Telegram evidence closed and stable,
  - Discord entry checklist approved with same safety controls.

## Manual/Mock Expectations
- Telegram: manual canary and replay/idempotency/auth failure-path simulations, plus rollback trace logs.
- Linear: manual advisory simulations for disabled/default-off, advisory-ready, kill-switched, malformed-source fail-closed, with no-mutation proof.
- Discord: no activation/manual execution in this slice; checklist-only defer posture.

## Ordered Validation Gates (Policy Reference)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required only when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Validation Plan (Docs-First Stream)
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- Logs captured under `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/<timestamp>-docs-first/`.

## Findings Link
- `docs/findings/1008-transport-readiness-deliberation.md`

## Acceptance
- PRD/TECH_SPEC/ACTION_PLAN/spec/checklist mirrors are synchronized for task 1008.
- Stage ordering and deferred Discord criteria are explicit and auditable.
- Auth/token + idempotency guardrails for mutating controls remain explicit and fail-closed.
- Docs-first validation logs exist for `spec-guard --dry-run`, `docs:check`, and `docs:freshness`.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-05.
