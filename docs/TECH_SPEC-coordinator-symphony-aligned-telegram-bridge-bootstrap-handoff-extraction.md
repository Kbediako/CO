---
id: 20260309-1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction
title: Coordinator Symphony-Aligned Telegram Bridge Bootstrap Handoff Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md
related_tasks:
  - tasks/tasks-1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Bridge Bootstrap Handoff Extraction

## Summary

Extract the remaining Telegram bridge bootstrap handoff out of `controlServer.ts` into one control-local helper. The extracted seam should own the wiring that feeds the Telegram read-adapter factory and related bootstrap dependencies into `createControlServerBootstrapLifecycle(...)`.

## Scope

- Add one new control-local helper/module under `orchestrator/src/cli/control/`, or another equally narrow extraction surface.
- Move the current Telegram bootstrap handoff assembly out of `controlServer.ts`.
- Add focused regressions proving no change to bootstrap metadata persistence, expiry lifecycle ordering, or Telegram bridge subscription behavior.

## Out of Scope

- Telegram bridge runtime or polling logic.
- Telegram command-routing or mutating control behavior.
- Dispatch, question-read, or selected-run semantics.
- Authenticated/API route changes.
- Broader server bootstrap refactors beyond the Telegram handoff seam.

## Proposed Design

### 1. Telegram bootstrap handoff helper

Introduce a helper that owns the assembly of the Telegram bootstrap handoff into `createControlServerBootstrapLifecycle(...)`, including:
- persistence callback wiring,
- expiry lifecycle startup handoff,
- runtime subscription surface,
- Telegram read-adapter factory callback.

### 2. Thinner `controlServer.ts` shell

`controlServer.ts` should keep:
- top-level store/runtime creation,
- server bind/start ownership,
- lifecycle instance ownership.

The shell should delegate the Telegram bootstrap handoff assembly to the new helper instead of constructing the full lifecycle options inline.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`
- optional new helper under `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`

## Risks

- Accidentally widening into bridge runtime behavior or polling logic.
- Moving lifecycle ownership away from `controlServer.ts`.
- Regressing bootstrap ordering or Telegram bridge subscription cleanup.

## Validation Plan

- Focused regressions for unchanged bootstrap ordering and bridge subscription behavior.
- Standard docs-first guard bundle before implementation.
