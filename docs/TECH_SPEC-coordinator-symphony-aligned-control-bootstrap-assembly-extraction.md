---
id: 20260309-1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction
title: Coordinator Symphony-Aligned Control Bootstrap Assembly Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md
related_tasks:
  - tasks/tasks-1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Bootstrap Assembly Extraction

## Summary

Extract the remaining bootstrap collaborator assembly out of `ControlServer.start()` into one control-local helper. The helper should construct the expiry lifecycle and the Telegram bridge bootstrap lifecycle together and hand back ready-to-start lifecycle pieces, while `ControlServer.start()` keeps server bind/listen, base URL derivation, and top-level bootstrap start error handling.

## Scope

- Add one control-local helper under `orchestrator/src/cli/control/`.
- Move the inline expiry lifecycle and Telegram bridge bootstrap lifecycle assembly out of `ControlServer.start()`.
- Preserve current closures over `instance`, `requestContextShared`, persistence hooks, runtime publishing, and dispatch audit emission.
- Add focused regressions proving collaborator wiring and bootstrap sequencing remain unchanged.

## Out of Scope

- `persistControlBootstrapMetadata(...)` changes.
- HTTP bind/listen or server error handler changes.
- Deep changes inside `controlExpiryLifecycle.ts`, `controlTelegramBridgeBootstrapLifecycle.ts`, or `controlTelegramBridgeLifecycle.ts`.
- Splitting expiry assembly and Telegram bridge bootstrap assembly into separate helpers/files.

## Proposed Design

### 1. Shared bootstrap assembly helper

Introduce one helper that receives the already-created `ControlServer` instance plus the collaborator inputs needed to assemble:
- `expiryLifecycle`
- `bootstrapLifecycle`

The helper should return both pieces ready to assign onto the instance.

### 2. Thinner `ControlServer.start()`

`ControlServer.start()` should keep:
- request-context assembly already performed before server creation,
- server creation and request handling,
- instance construction,
- delegation into the bootstrap assembly helper,
- HTTP bind/listen and base URL derivation,
- final bootstrap start plus top-level close-on-failure handling.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- one new helper under `orchestrator/src/cli/control/`
- focused tests under `orchestrator/tests/`

## Risks

- Accidentally changing closure capture or collaborator ownership while extracting assembly.
- Reordering bootstrap steps by moving too much out of `ControlServer.start()`.
- Splitting the assembly into multiple helpers and adding complexity without reducing the core server shell.

## Validation Plan

- Focused regressions for collaborator assembly shape and start ordering.
- Standard docs-first guard bundle before implementation.
