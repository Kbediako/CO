---
id: 20260306-1010-coordinator-linear-advisory-setup-and-runbook-implementation
title: Coordinator Linear Advisory Setup + Runbook Implementation
relates_to: docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: define implementation-checkable Linear advisory setup scope under Coordinator intake/control bridge boundaries.
- Scope: docs-first planning artifacts, registry synchronization, and docs validation evidence.
- Dependency: Telegram prerequisite is satisfied via completed task 1009.
- Boundary: no Discord activation and no scheduler ownership transfer.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning execution.
- Reasoning: Linear advisory setup requires explicit non-authoritative contracts and dependency proof before runtime edits.

## Technical Requirements
- Authority invariants:
  - CO remains execution authority.
  - Coordinator remains intake/control bridge.
  - No scheduler ownership transfer.
- Dependency requirement:
  - Telegram prerequisite from task `1009` is satisfied and must be referenced by evidence paths.
- Linear advisory requirements:
  - advisory-only setup + runbook + rollback contract,
  - scoped auth/session fail-closed behavior,
  - deterministic idempotency/replay handling,
  - traceability field requirements for auditability.
- Discord requirements:
  - deferred in 1010; no enablement/activation tests.

## Manual Mock Test Requirements
1. Auth/session failure-path rejects (missing/expired/replayed credentials) with deterministic reasons.
2. Bounded mapping from Linear advisory intake to Coordinator bridge intents only.
3. Duplicate replay handling remains idempotent and deterministic.
4. Advisory rollback drill restores safe baseline behavior.
5. No scheduler ownership transfer evidence appears in traces/status fields.
6. Telegram dependency verification references completed 1009 evidence before 1010 activation.
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
- `diff -u tasks/tasks-1010-coordinator-linear-advisory-setup-and-runbook-implementation.md .agent/task/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`
- Logs under `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/<timestamp>-docs-first/`.

## Findings Link
- `docs/findings/1010-linear-advisory-setup-deliberation.md`

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
