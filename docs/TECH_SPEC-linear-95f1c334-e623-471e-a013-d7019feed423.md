---
id: 20260407-linear-95f1c334-e623-471e-a013-d7019feed423
title: CO: Harden Linear rate-limit handling with user-scoped budgeting, endpoint-aware buckets, and complexity-aware preflight
relates_to: docs/PRD-linear-95f1c334-e623-471e-a013-d7019feed423.md
risk: high
owners:
  - Codex
last_review: 2026-05-08
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-95f1c334-e623-471e-a013-d7019feed423.md`
- PRD: `docs/PRD-linear-95f1c334-e623-471e-a013-d7019feed423.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-95f1c334-e623-471e-a013-d7019feed423.md`
- Task checklist: `tasks/tasks-linear-95f1c334-e623-471e-a013-d7019feed423.md`

## Traceability
- Linear issue: `CO-106` / `95f1c334-e623-471e-a013-d7019feed423`
- Linear URL: https://linear.app/asabeko/issue/CO-106/harden-linear-rate-limit-handling-user-scoped-budgeting-endpoint-aware

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: harden the existing shared Linear budget substrate so it reflects real quota ownership and endpoint pressure more truthfully under concurrent provider-worker and control-host activity.
- Scope:
  - register the docs-first packet for `linear-95f1c334-e623-471e-a013-d7019feed423`
  - extend header capture and normalization with endpoint-name and request-complexity data
  - change the canonical persisted budget key from token-only to user-scoped with an explicit fallback and migration path
  - replace single endpoint bucket fields with endpoint-aware bucket maps plus operation aliases
  - extend preflight and execution wrappers with request and complexity floors plus shared reservations or smoothing
  - merge partial observations safely and jitter or degrade control-host polling under relevant pressure
  - add focused tests for the hardened contract and close the issue without reopening unrelated provider redesign work
- Constraints:
  - preserve the existing `CO-62` shared-budget improvements instead of replacing them wholesale
  - keep the implementation bounded to rate-limit truth, scheduling, and supporting tests or docs
  - remain truthful when viewer identity, endpoint identity, or per-request cost is unknown

## Technical Requirements
- Functional requirements:
  - `executeLinearGraphql(...)` and `linearRateLimit.ts` must preserve `x-ratelimit-endpoint-name` and `x-complexity` when Linear sends them
  - provider helper issue-context and summary queries must request `viewer.id` so canonical user-scoped persistence can be learned outside dispatch-only paths
  - shared persisted budget state must use a canonical user-scoped key once viewer identity is known; token fingerprint may remain only as a bootstrap alias or migration mechanism
  - endpoint-specific request and complexity buckets must be stored and consulted per endpoint identity, using the header-provided endpoint name when available
  - preflight must support explicit complexity headroom and reservation-aware available-budget calculations, not just request-count floors
  - mixed observations must merge bucket-wise so richer prior bucket or reset data survives newer partial writes unless the newer observation explicitly supersedes it
  - cooldown calculation must document and test the precedence rule between `retry-after` and exhausted-bucket reset timestamps
  - control-host polling/backoff must jitter and degrade according to the relevant budget pressure, including endpoint-aware pressure when the tracked-issues endpoint is the constraint
  - concurrent callers must reserve or smooth budget demand through shared state before issuing live requests, or the lane must record a narrow follow-up with explicit residual risk
- Non-functional requirements (performance, reliability, security):
  - shared-state writes must remain atomic and lock-protected
  - stale or missing state must not block truthful live reads
  - reservation or smoothing state must self-heal when a process dies mid-request
  - the hardening must remain reviewable and not split quota truth across multiple inconsistent helpers
- Interfaces / contracts:
  - `linearGraphqlClient.ts` success and failure header contract
  - `linearRateLimit.ts` normalized details contract
  - `linearBudgetState.ts` persistence, preflight, polling, and reservation APIs
  - dispatch and provider helper query wrappers
  - control-host polling health outputs and tests

## Architecture & Data
- Architecture / design adjustments:
  - extend `linearBudgetState.ts` from a flat snapshot into a richer state object with:
    - canonical budget scope metadata
    - per-endpoint request and complexity bucket maps
    - operation-to-endpoint aliasing
    - last-observed request complexity metadata
    - active reservation records with expiry
  - use server-provided endpoint names as canonical endpoint keys when present, with operation-name aliases only as a fallback or lookup aid
  - update provider and dispatch wrappers so each request can:
    - read effective budget state
    - reserve bounded request or complexity headroom when appropriate
    - release or reconcile the reservation on completion
    - record the merged observation after the response
  - update control-host polling policy so the tracked-issues endpoint can back off differently from generic global pressure and so intervals include bounded jitter
- Data model changes / migrations:
  - persisted budget files need a schema bump for user scope, endpoint buckets, aliases, and reservations
  - a token-fingerprint alias or bootstrap record may remain for migration, but the canonical state must no longer be token-only
  - tests need deterministic state fixtures for schema upgrade, partial merge, and reservation expiry behavior
- External dependencies / integrations:
  - Linear GraphQL headers and viewer identity
  - existing lock-file helper for multi-process coordination
  - control-host polling-health persistence and read surfaces

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Packet freshness metadata | Fallback-sensitive historical packet remains active during docs freshness rollover. | expire fallback | CO-492 provider-worker docs repair | Spec guard rechecked refreshed historical packets on 2026-05-08 during PR #793. | 2026-05-08 | 2026-05-22 | 2026-06-07 | Remove this rollover row when the original lane packet is archived or a lane owner refresh records a dedicated fallback table. | `node scripts/spec-guard.mjs --dry-run` plus `npm run docs:freshness` in PR #793. |

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - targeted coverage for `orchestrator/tests/LinearGraphqlClient.test.ts`
  - targeted coverage for `orchestrator/tests/LinearBudgetState.test.ts`
  - targeted coverage for `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - targeted coverage for `orchestrator/tests/LinearDispatchSource.test.ts` and `orchestrator/tests/ControlServerPublicLifecycle.test.ts` as required by the implementation
  - required repo validation floor after implementation
- Rollout verification:
  - confirm user-scope persistence and legacy-token bootstrap or migration behavior
  - confirm endpoint-aware preflight and reservation behavior on dispatch and provider helper paths
  - confirm jittered degraded polling under low, exhausted, and endpoint-specific pressure
- Monitoring / alerts:
  - rely on workpad validation notes, helper audit logs, and polling-health state for operator explanation of quota pressure and reservation behavior

## Open Questions
- None before implementation. If the first reservation step cannot safely land for both request and complexity buckets in one slice, the exact narrower residual-risk follow-up must be documented explicitly before handoff.

## Approvals
- Reviewer: pending docs-review child stream
- Status: bootstrap drafted
- Date: 2026-04-07
