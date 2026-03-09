---
id: 20260309-1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction
title: Coordinator Symphony-Aligned Telegram Dispatch Read Adapter Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md
related_tasks:
  - tasks/tasks-1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Dispatch Read Adapter Extraction

## Summary

Extract the remaining Telegram dispatch-read adapter assembly out of `controlServer.ts` into one control-local helper. The extracted seam should own internal-context construction, runtime dispatch evaluation reading, Telegram-surface dispatch audit emission, and Telegram `ControlDispatchPayload` return for the oversight read surface.

## Scope

- Add one new control-local helper/module under `orchestrator/src/cli/control/`.
- Move the current Telegram oversight `readDispatch()` assembly out of `controlServer.ts`.
- Add focused regressions proving no change to Telegram `/dispatch` behavior or dispatch audit emission.

## Out of Scope

- Dispatch evaluation or tracker semantics changes.
- Authenticated dispatch route extraction.
- Telegram message formatting or polling changes.
- Selected-run read adapter extraction.
- Broader Telegram controller/runtime refactors.

## Proposed Design

### 1. Telegram dispatch-read assembly helper

Introduce a helper that owns:
- building the internal control context,
- reading runtime dispatch evaluation,
- invoking the existing dispatch-read surface,
- emitting Telegram dispatch audit events,
- returning the Telegram-facing `ControlDispatchPayload`.

### 2. Thinner `controlServer.ts` shell

`controlServer.ts` should keep:
- lifecycle/bootstrap/event transport ownership,
- read-adapter registration,
- transport-specific wiring for Telegram oversight.

The shell should delegate `readDispatch()` to the new helper instead of assembling it inline.

## Files / Modules

- new helper under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional dedicated helper test

## Risks

- Accidentally widening into general Telegram read-adapter extraction.
- Shifting audit or runtime-read authority out of the control-local seam.
- Regressing Telegram `/dispatch` audit emission or payload shaping.

## Validation Plan

- Focused regressions for unchanged Telegram `/dispatch` behavior and audit emission.
- Standard docs-first guard bundle before implementation.
