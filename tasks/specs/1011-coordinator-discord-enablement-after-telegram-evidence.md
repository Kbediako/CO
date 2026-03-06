---
id: 20260306-1011-coordinator-discord-enablement-after-telegram-evidence
title: Coordinator Discord Enablement After Telegram Evidence
relates_to: docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: define implementation-checkable Discord enablement scope after Telegram evidence closure.
- Scope: docs-first planning artifacts, registry synchronization, and docs validation evidence.
- Dependencies: task 1009 completed; task 1010 remains in-progress advisory lane.
- Boundary: CO execution authority remains unchanged; no scheduler ownership transfer.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning execution.
- Reasoning: Discord enablement requires explicit dependency, security, and audit contracts before runtime edits.

## Technical Requirements
- Authority invariants:
  - CO remains execution authority.
  - Coordinator remains intake/control bridge.
  - No scheduler ownership transfer.
- Dependency requirements:
  - 1009 completion evidence must be explicit.
  - 1010 status must be reflected in dependency/audit fields without authority expansion.
- Discord requirements:
  - auth/token fail-closed boundaries,
  - deterministic idempotency/replay handling,
  - traceability and auditable event output contract,
  - deterministic allow/deny reason outputs.

## Manual Mock Test Requirements
1. Auth/token failure-path rejects with deterministic reasons.
2. Discord ingress/context binding only allows approved route and rejects deterministically otherwise.
3. Duplicate replay handling is idempotent and deterministic.
4. Dependency checks include 1009 completion proof and 1010 status output.
5. Traceability fields are complete and stable for each decision.
6. Auditable event outputs are emitted for both accept and reject paths.
7. No scheduler ownership transfer evidence appears in traces/events.

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
- `diff -u tasks/tasks-1011-coordinator-discord-enablement-after-telegram-evidence.md .agent/task/1011-coordinator-discord-enablement-after-telegram-evidence.md`
- Logs under `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/<timestamp>-docs-first/`.

## Findings Link
- `docs/findings/1011-discord-enablement-deliberation.md`

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
