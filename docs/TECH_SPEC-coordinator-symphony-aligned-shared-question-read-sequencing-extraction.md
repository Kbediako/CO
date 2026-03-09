---
id: 20260309-1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction
title: Coordinator Symphony-Aligned Shared Question-Read Sequencing Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md
related_tasks:
  - tasks/tasks-1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Shared Question-Read Sequencing Extraction

## Summary

Extract the question-read sequencing introduced in `1074` into a shared helper/module that both the authenticated `/questions` route and Telegram oversight `readQuestions()` call. The extracted seam should own question-state snapshotting, expiry sequencing, current-list return payload, and retry-selector application, while transport-specific shells remain explicit.

## Scope

- Add one shared question-read sequencing helper/module under `orchestrator/src/cli/control/`.
- Move the duplicated sequencing out of:
  - `questionQueueController.ts`
  - `controlServer.ts` Telegram oversight read path
- Add focused regressions proving the shared seam preserves `1074` semantics.

## Out of Scope

- Telegram rendering/polling changes.
- API route/controller extraction beyond the question-read sequence.
- `controlExpiryLifecycle.ts` changes.
- `questionChildResolutionAdapter.ts` changes.

## Proposed Design

### 1. Shared sequencing helper

Introduce a helper that owns:
- capturing the pre-read question snapshot,
- invoking expiry,
- listing the post-expiry question set,
- selecting retry-eligible closed questions,
- returning the response payload plus retry list.

### 2. Thin shells at call sites

The authenticated `/questions` route and Telegram oversight `readQuestions()` should each become thin shells that:
- supply the local question queue + expiry + resolution hooks,
- delegate sequencing to the shared helper,
- keep transport-specific response shaping outside the extracted seam.

## Files / Modules

- new shared helper under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/questionQueueController.ts`
- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/tests/QuestionQueueController.test.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional new dedicated helper test

## Risks

- Widening into general controller extraction too early.
- Accidentally changing `1074` retry semantics while moving code.
- Pulling Telegram-specific formatting into the shared seam.

## Validation Plan

- Focused regressions for unchanged retry semantics across API and Telegram question reads.
- Standard docs-first guard bundle before implementation.
