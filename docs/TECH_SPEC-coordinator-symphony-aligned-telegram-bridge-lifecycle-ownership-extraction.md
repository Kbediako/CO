---
id: 20260309-1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction
title: Coordinator Symphony-Aligned Telegram Bridge Lifecycle Ownership Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md
related_tasks:
  - tasks/tasks-1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Bridge Lifecycle Ownership Extraction

## Summary

Extract the remaining Telegram bridge lifecycle ownership out of `controlServerBootstrapLifecycle.ts` into one control-local helper. The extracted seam should own bridge startup, runtime subscription attachment, bridge instance/unsubscribe state, close-on-attach-failure handling, and shutdown, while the bootstrap lifecycle keeps ordered startup ownership.

## Scope

- Add one new control-local helper/module under `orchestrator/src/cli/control/`.
- Move the current Telegram bridge lifecycle block out of `controlServerBootstrapLifecycle.ts`.
- Preserve lazy `createTelegramReadAdapter()` behavior and current bridge shutdown behavior.
- Add focused regressions proving no change to attach/close semantics or startup ordering.

## Out of Scope

- Changes to `persistControlBootstrapMetadata(...)`.
- Expiry lifecycle ownership or ordering changes.
- Changes to `createControlTelegramReadAdapter(...)`.
- Changes inside `telegramOversightBridge.ts`.
- Splitting bridge startup and bridge attachment across multiple helpers/files.

## Proposed Design

### 1. Telegram bridge lifecycle helper

Introduce one helper that owns:
- calling `startTelegramOversightBridge(...)`,
- lazy adapter creation through the existing factory,
- `controlRuntime.subscribe(...)` attachment,
- bridge instance and unsubscribe state,
- close-on-attach-failure cleanup,
- close-time bridge shutdown.

### 2. Thinner bootstrap lifecycle coordinator

`controlServerBootstrapLifecycle.ts` should keep:
- ordered bootstrap sequencing,
- expiry lifecycle startup,
- delegation into bootstrap metadata persistence,
- delegation into the extracted Telegram bridge lifecycle helper.

The lifecycle should delegate the Telegram bridge runtime ownership rather than implementing it inline.

## Files / Modules

- `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`
- one new helper under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlTelegramBridgeBootstrapLifecycle.ts`
- focused lifecycle tests under `orchestrator/tests/`

## Risks

- Accidentally reordering the existing `persist -> expiry -> bridge` contract.
- Splitting one cohesive Telegram bridge concern into too many files for little gain.
- Changing lazy adapter creation or shutdown behavior while extracting ownership.

## Validation Plan

- Focused regressions for unchanged startup, attach, and close semantics.
- Standard docs-first guard bundle before implementation.
