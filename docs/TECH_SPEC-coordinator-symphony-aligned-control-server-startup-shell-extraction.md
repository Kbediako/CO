---
id: 20260309-1083-coordinator-symphony-aligned-control-server-startup-shell-extraction
title: Coordinator Symphony-Aligned Control Server Startup Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-startup-shell-extraction.md
related_tasks:
  - tasks/tasks-1083-coordinator-symphony-aligned-control-server-startup-shell-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Startup Shell Extraction

## Summary

Extract the remaining startup shell out of `ControlServer.start()` into one control-local helper. The helper should own server bind/listen, base URL derivation, final `bootstrapLifecycle.start(...)`, and close-on-failure behavior, while `ControlServer.start()` keeps top-level server construction and returns the ready instance.

## Scope

- Add one control-local helper under `orchestrator/src/cli/control/`.
- Move bind/listen plus bootstrap start ownership out of `ControlServer.start()`.
- Preserve current base URL derivation and startup failure cleanup behavior.
- Add focused regressions proving unchanged startup ordering and failure handling.

## Out of Scope

- Request-context/store seeding changes.
- Changes to `controlBootstrapAssembly.ts`.
- Route handling/controller logic changes.
- `close()` shutdown ordering changes.
- Splitting bind/listen and bootstrap start into separate helpers/files.

## Proposed Design

### 1. Startup-shell helper

Introduce one helper that receives the constructed `ControlServer` instance plus the already-created `server`, `host`, `token`, and `bootstrapLifecycle`, then owns:
- bind/listen error handling,
- base URL derivation,
- server error-handler registration,
- final `bootstrapLifecycle.start(...)`,
- close-on-failure startup cleanup.

### 2. Thinner `ControlServer.start()`

`ControlServer.start()` should keep:
- state/store seeding,
- request-context assembly,
- server construction,
- collaborator assembly via `controlBootstrapAssembly.ts`,
- delegation into the startup-shell helper,
- returning the ready instance.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- one new helper under `orchestrator/src/cli/control/`
- focused startup tests under `orchestrator/tests/`

## Risks

- Accidentally changing bind/listen error semantics.
- Reordering base URL derivation relative to bootstrap lifecycle start.
- Pulling too much route/setup logic into the helper and widening the seam unnecessarily.

## Validation Plan

- Focused regressions for startup success and close-on-failure behavior.
- Standard docs-first guard bundle before implementation.
