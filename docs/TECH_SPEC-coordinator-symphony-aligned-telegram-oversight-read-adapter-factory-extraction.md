---
id: 20260309-1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Read Adapter Factory Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md
related_tasks:
  - tasks/tasks-1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight Read Adapter Factory Extraction

## Summary

Extract the remaining Telegram oversight read-adapter factory out of `controlServer.ts` into one control-local helper. The extracted seam should own the assembly of the Telegram `TelegramOversightReadAdapter` using the existing selected-run runtime read, Telegram dispatch-read helper, and Telegram question-read helper.

## Scope

- Add one new control-local helper/module under `orchestrator/src/cli/control/`.
- Move the current Telegram oversight read-adapter factory out of `controlServer.ts`.
- Add focused regressions proving no change to Telegram selected-run, `/dispatch`, or `/questions` bridge behavior.

## Out of Scope

- Telegram polling, command parsing, or rendering changes.
- Dispatch or question-read semantics changes.
- Authenticated/API route extraction.
- Selected-run projection refactors.
- Broader Telegram controller/runtime rewrites.

## Proposed Design

### 1. Telegram oversight read-adapter factory helper

Introduce a helper that owns:
- runtime snapshot selected-run reads,
- delegation to `readControlTelegramDispatch(...)`,
- delegation to `readControlTelegramQuestions(...)`,
- returning the composed `TelegramOversightReadAdapter`.

### 2. Thinner `controlServer.ts` shell

`controlServer.ts` should keep:
- lifecycle/bootstrap/event transport ownership,
- bridge registration,
- shared control-local dependencies and callback ownership.

The shell should delegate `createTelegramOversightReadAdapter()` to the new helper instead of assembling the read-adapter methods inline.

## Files / Modules

- new helper under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional dedicated helper test

## Risks

- Accidentally widening into Telegram polling or command behavior.
- Moving lifecycle ownership out of `controlServer.ts`.
- Regressing Telegram selected-run, dispatch, or question reads by changing how the adapter is wired.

## Validation Plan

- Focused regressions for unchanged Telegram selected-run, `/dispatch`, and `/questions` behavior.
- Standard docs-first guard bundle before implementation.
