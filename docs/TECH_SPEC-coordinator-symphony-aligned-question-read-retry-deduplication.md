---
id: 20260309-1074-coordinator-symphony-aligned-question-read-retry-deduplication
title: Coordinator Symphony-Aligned Question-Read Retry Deduplication
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-question-read-retry-deduplication.md
related_tasks:
  - tasks/tasks-1074-coordinator-symphony-aligned-question-read-retry-deduplication.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Question-Read Retry Deduplication

## Summary

Add a tiny shared helper for question-read surfaces that snapshots retry-eligible records before expiry, runs expiry, returns the current question list, and only requeues child-resolution follow-ups for records that were already closed before the read began.

## Scope

- Add a small shared helper under `orchestrator/src/cli/control/` for question-read retry deduplication.
- Update `questionQueueController.ts` to use the helper for `GET /questions`.
- Update `controlServer.ts` Telegram oversight `readQuestions()` to use the same helper.
- Add focused regressions for both the HTTP and Telegram read surfaces.

## Out of Scope

- `controlExpiryLifecycle.ts` behavior changes.
- `questionChildResolutionAdapter.ts` resolution logic changes.
- Telegram polling/rendering contract changes beyond the shared read semantics.
- Broad controller extraction beyond this bounded bug fix.

## Proposed Design

### 1. Shared question-read retry helper

Introduce a pure helper that:
- collects retry-eligible question ids from the pre-expiry snapshot,
- filters the post-expiry snapshot down to those ids,
- returns only records that should still be queued for child-resolution follow-up.

This keeps the rule explicit and reusable without moving policy into expiry or resolution internals.

### 2. Route-level adoption

Update `handleQuestionQueueRequest(...)` so the authenticated `GET /questions` path:
- snapshots retry candidates before expiry,
- runs expiry,
- reads the current question list for the response payload,
- queues follow-up child resolutions only for the filtered retry set.

### 3. Telegram oversight adoption

Update `ControlServer.createTelegramOversightReadAdapter().readQuestions()` to use the same helper and sequencing so operator `/questions` reads do not retrigger freshly expired child resolutions.

## Files / Modules

- new helper under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/questionQueueController.ts`
- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/tests/QuestionQueueController.test.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional `orchestrator/tests/ControlServer.test.ts` touch only if needed for shared regression coverage

## Risks

- Accidentally suppressing legitimate retries for previously answered/dismissed/expired records.
- Re-encoding the same logic twice instead of sharing one helper.
- Widening into expiry-lifecycle behavior that should remain unchanged.

## Validation Plan

- Focused regressions proving:
  - freshly expired questions are not retried during `GET /questions`,
  - previously closed questions still retry during `GET /questions`,
  - Telegram `/questions` reads do not double-resolve fresh expirations.
- Standard docs-first guard bundle before implementation.
