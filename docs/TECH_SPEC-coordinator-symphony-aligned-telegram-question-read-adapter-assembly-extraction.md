---
id: 20260309-1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction
title: Coordinator Symphony-Aligned Telegram Question-Read Adapter Assembly Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md
related_tasks:
  - tasks/tasks-1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Question-Read Adapter Assembly Extraction

## Summary

Extract the remaining Telegram question-read adapter assembly out of `controlServer.ts` into one control-local helper. The extracted seam should own internal-context construction, child-resolution adapter creation, shared question-read sequencing invocation, retry queueing, and Telegram `QuestionsPayload` return for the oversight read surface.

## Scope

- Add one new control-local helper/module under `orchestrator/src/cli/control/`.
- Move the current Telegram oversight `readQuestions()` assembly out of `controlServer.ts`.
- Add focused regressions proving no change to Telegram `/questions` behavior or child-resolution retry behavior.

## Out of Scope

- Authenticated question queue route extraction.
- Telegram message formatting or polling changes.
- Expiry lifecycle refactors.
- Question child-resolution behavior changes.
- Broader controller/runtime refactors.

## Proposed Design

### 1. Telegram question-read assembly helper

Introduce a helper that owns:
- building the internal control context,
- creating the control question child-resolution adapter,
- invoking `runQuestionReadSequence(...)`,
- queueing retry candidates,
- returning the Telegram-facing `QuestionsPayload`.

### 2. Thinner `controlServer.ts` shell

`controlServer.ts` should keep:
- lifecycle/bootstrap/event transport ownership,
- read-adapter registration,
- transport-specific wiring for Telegram oversight.

The shell should delegate `readQuestions()` to the new helper instead of assembling it inline.

## Files / Modules

- new helper under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional dedicated helper test

## Risks

- Accidentally widening into general Telegram adapter extraction.
- Shifting lifecycle ownership out of `controlServer.ts`.
- Regressing answered/expired child-resolution retries at the Telegram surface.

## Validation Plan

- Focused regressions for unchanged Telegram `/questions` behavior and child-resolution retries.
- Standard docs-first guard bundle before implementation.
