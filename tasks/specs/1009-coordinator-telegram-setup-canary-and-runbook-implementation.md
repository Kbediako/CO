---
id: 20260306-1009-coordinator-telegram-setup-canary-and-runbook-implementation
title: Coordinator Telegram Setup + Canary + Runbook Implementation
relates_to: docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: define implementation-checkable Telegram setup/canary scope under Coordinator intake/control bridge boundaries.
- Scope: docs-first planning artifacts, registry synchronization, and docs validation evidence.
- Boundary: no Discord activation, no scheduler ownership transfer.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning execution.
- Reasoning: Telegram rollout requires explicit implementation and mock-test contracts before runtime edits.

## Technical Requirements
- Authority invariants:
  - CO remains execution authority.
  - Coordinator remains intake/control bridge.
  - No scheduler ownership transfer.
- Telegram setup/canary requirements:
  - setup + runbook + rollback contract,
  - scoped auth/session fail-closed behavior,
  - deterministic idempotency/replay handling,
  - traceability field requirements for auditability.
- Linear linkage requirements:
  - advisory-only follow-up linkage to `1000` and `1008` evidence,
  - no authoritative expansion in 1009.
- Discord requirements:
  - deferred in 1009; no enablement/activation tests.

## Manual Mock Test Requirements
1. Auth/session failure-path rejects (missing/expired/replayed token) with deterministic reasons.
2. Bounded command mapping from Telegram intake to CO control intents.
3. Duplicate replay handling remains idempotent and deterministic.
4. Canary rollback drill restores safe baseline behavior.
5. No scheduler ownership transfer evidence appears in traces.
6. Linear linkage check confirms advisory-only/no-mutation posture.
7. Discord activation tests remain out of scope for this slice.

## Exact Validation Gate Order (Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Validation Plan (Docs-First Stream)
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- Logs under `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/<timestamp>-docs-first/`.

## Findings Link
- `docs/findings/1009-telegram-setup-canary-deliberation.md`

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
