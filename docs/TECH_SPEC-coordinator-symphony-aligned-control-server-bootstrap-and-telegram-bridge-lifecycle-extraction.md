---
id: 20260308-1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction
title: Coordinator Symphony-Aligned Control Server Bootstrap and Telegram Bridge Lifecycle Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md
related_tasks:
  - tasks/tasks-1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Bootstrap and Telegram Bridge Lifecycle Extraction

## Summary

Extract the remaining post-bind startup/teardown ownership cluster from `controlServer.ts` into a dedicated lifecycle module. The extracted owner should handle auth/endpoint persistence, initial control-state persistence, and Telegram bridge start/stop wiring, while `controlServer.ts` keeps raw server creation, bind/listen handling, and request routing explicit.

## Scope

- Add a control-local bootstrap/lifecycle module under `orchestrator/src/cli/control/`.
- Move control auth/endpoint file writes, initial control-state persistence, Telegram bridge start/stop, and runtime subscription wiring out of `controlServer.ts`.
- Add focused startup/bridge lifecycle regressions.

## Out of Scope

- Route/controller rewiring.
- Expiry lifecycle behavior already extracted in `1069`.
- SSE client ownership.
- Generic runtime/service container abstraction.
- Telegram provider-surface redesign.

## Proposed Design

### 1. Introduce a dedicated bootstrap/bridge lifecycle owner

Create a new control-local module, likely something like `controlServerLifecycle.ts`, that owns:

- post-bind metadata/bootstrap sequencing,
- control auth and endpoint file writes,
- initial `controlPath` snapshot persistence,
- Telegram bridge startup,
- runtime subscription wiring for Telegram projection deltas,
- startup failure cleanup,
- orderly close/teardown for the bridge/subscription side of the server lifecycle.

The target interface should stay explicit and bounded, for example:

- `start()`
- `close()`

with any internal helpers kept private to the module.

### 2. Keep `controlServer.ts` as the outer shell

`controlServer.ts` should continue to own:

- store/runtime construction,
- raw HTTP server creation,
- bind/listen and listen-error handling,
- base URL derivation,
- request handling and authenticated dispatch handoff,
- SSE client ownership,
- outer `close()` coordination.

It should no longer directly own the bootstrap/Telegram bridge bodies themselves.

### 3. Preserve current sequencing

The extraction must keep:

- bind before base URL derivation,
- auth/endpoint file writes before Telegram bridge startup,
- initial control-state persistence in the same post-bind bootstrap flow,
- Telegram bridge subscription only after successful bridge creation,
- warn-and-continue behavior when Telegram bridge startup fails,
- best-effort Telegram bridge shutdown on close,
- startup failure cleanup without leaving partial bridge/subscription state behind.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new bootstrap/lifecycle owner under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- `orchestrator/tests/ControlServer.test.ts`
- optional new dedicated lifecycle test file under `orchestrator/tests/`

## Risks

- Widening into a generic lifecycle container.
- Reordering auth/endpoint writes, initial control-state persistence, and Telegram bridge startup.
- Regressing bridge subscription cleanup on startup failure or close.
- Accidentally absorbing bind/listen, SSE, or route ownership into the new helper.

## Validation Plan

- Focused regressions for:
  - control auth/endpoint bootstrap persistence,
  - initial control-state persistence,
  - non-fatal Telegram bridge startup failure,
  - Telegram bridge startup/close ordering,
  - subscription cleanup on startup failure,
  - unchanged HTTP/request behavior around startup.
- Standard docs-first guard bundle before implementation.
