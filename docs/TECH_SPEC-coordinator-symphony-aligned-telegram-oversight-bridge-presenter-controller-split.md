---
id: 20260312-1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split
title: Coordinator Symphony-Aligned Telegram Oversight Bridge Presenter/Controller Split
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md
related_tasks:
  - tasks/tasks-1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight Bridge Presenter/Controller Split

## Summary

Extract the Telegram read-side presenter/controller surface from `telegramOversightBridge.ts` so the bridge runtime keeps transport, persistence, and mutation ownership while presentation logic moves behind a dedicated seam.

## Current State

`telegramOversightBridge.ts` is still a 900+ line mixed runtime. Even after the earlier read-adapter and bootstrap/lifecycle extractions, the class still owns:

1. command routing for `/start`, `/help`, `/status`, `/issue`, `/dispatch`, and `/questions`,
2. selected-run and dispatch payload rendering,
3. question-summary and state-line formatting helpers,
4. projection-hash-based push-notification shaping.

The mutation path (`/pause`, `/resume`) is already bounded and should remain authoritative in the bridge runtime.

## Symphony Alignment Note

Real Symphony keeps transport/controller shells thin and pushes snapshot shaping into presenter modules such as `symphony_elixir_web/presenter.ex`. CO already has the equivalent read-adapter prerequisite; the remaining gap is read-side presenter/controller separation inside the Telegram bridge. CO should intentionally diverge by keeping mutation-authority payload ownership in the bridge shell.

## Proposed Design

### 1. Extract a dedicated Telegram presenter/controller seam

Introduce one control-local helper module that owns:
- read-side command routing for `/start`, `/help`, `/status`, `/issue`, `/dispatch`, `/questions`,
- selected-run, dispatch, and queued-question rendering,
- projection hash calculation and push-text shaping for read-only delta notifications.

### 2. Keep mutation authority in `telegramOversightBridge.ts`

`applyControlCommand(...)` remains in the bridge runtime, along with:
- Telegram polling/update transport,
- `sendMessage(...)` and Telegram API calls,
- control-token-backed mutation writes,
- persistent bridge state read/write.

### 3. Keep bridge runtime thin

`dispatchCommand(...)` and `maybeSendProjectionDelta(...)` should delegate into the extracted seam for read-side rendering while preserving current control flow and cooldown semantics.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new control-local helper near `orchestrator/src/cli/control/` for Telegram presenter/controller behavior
- focused coverage under `orchestrator/tests/TelegramOversightBridge.test.ts`

## Risks

- Accidentally moving pause/resume mutation authority into a pure presenter.
- Changing push deduplication behavior while extracting projection hashing.
- Broadening into transport, persistence, or provider behavior that earlier slices deliberately left intact.

## Validation Plan

- Add focused Telegram regression coverage for the presenter/controller seam.
- Keep integrated bridge tests as the primary proof surface.
- Run the standard docs-first guard bundle before implementation.
