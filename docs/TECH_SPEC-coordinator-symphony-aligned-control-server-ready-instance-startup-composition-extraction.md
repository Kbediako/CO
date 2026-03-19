---
id: 20260310-1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction
title: Coordinator Symphony-Aligned Control Server Ready-Instance Startup Composition Extraction
status: draft
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md
related_tasks:
  - tasks/tasks-1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Ready-Instance Startup Composition Extraction

## Summary

Extract the remaining ready-instance startup composition out of `ControlServer.start()` into one control-local helper. The helper should own bootstrap lifecycle attachment plus final startup sequencing over the already-extracted request-shell binding, bootstrap assembly, and startup sequence collaborators, returning the ready startup bundle that `ControlServer.start()` assigns to the live instance.

## Scope

- Add one control-local helper under `orchestrator/src/cli/control/`.
- Move ready-instance startup bundle assembly plus startup composition out of `ControlServer.start()`.
- Preserve lifecycle attachment, startup ordering, and failure cleanup behavior.
- Add focused regressions proving unchanged success and fail-closed startup semantics.

## Out of Scope

- Seed loading changes.
- Seeded runtime assembly changes.
- Request-shell binding behavior changes.
- Changes to `controlBootstrapAssembly.ts`.
- Changes to `controlServerStartupSequence.ts`.
- `close()` shutdown ordering changes.

## Proposed Design

### 1. Ready-instance startup helper

Introduce one helper that receives the already-built `server`, `requestContextShared`, `host`, `controlToken`, and a `closeOnFailure` callback, then owns:
- ready-instance startup bundle assembly,
- bootstrap lifecycle attachment over `createControlBootstrapAssembly(...)`,
- final `startControlServerStartupSequence(...)`,
- returning the ready-instance startup bundle that `ControlServer.start()` assigns or returns.

### 2. Thinner `ControlServer.start()`

`ControlServer.start()` should keep:
- token generation,
- seed loading,
- seeded runtime assembly,
- request-shell binding delegation,
- delegation into the ready-instance startup helper,
- returning the ready server host.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- one new helper under `orchestrator/src/cli/control/`
- focused startup-composition tests under `orchestrator/tests/`

## Risks

- Accidentally widening the pre-live window so request readers see stale/null lifecycle state after bind.
- Reordering base URL derivation relative to bootstrap lifecycle start.
- Changing startup failure cleanup semantics by moving instance creation or close-on-failure wiring.

## Validation Plan

- Focused regressions for startup success, lifecycle attachment, and fail-closed startup behavior.
- Standard docs-first guard bundle before implementation.
