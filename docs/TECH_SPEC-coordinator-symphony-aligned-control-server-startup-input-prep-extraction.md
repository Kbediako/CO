---
id: 20260312-1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction
title: Coordinator Symphony-Aligned Control Server Startup Input Prep Extraction
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md
related_tasks:
  - tasks/tasks-1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Startup Input Prep Extraction

## Summary

Extract the remaining startup-input preparation from `ControlServer.start()` into one bounded helper so the method keeps only top-level orchestration and ready-instance return. The helper should own control-token generation, seed-loading delegation, seeded-runtime assembly delegation, and the assembly of inputs passed into `startPendingReadyInstance(...)`.

## Current State

After `1106`, `ControlServer.start()` is only:

1. generating a control token,
2. reading the control/runtime seed bundle,
3. creating the seeded runtime assembly,
4. delegating to `startPendingReadyInstance(...)`.

That is already a weak shell, but it still mixes startup-input preparation with orchestration inside the class entrypoint.

## Symphony Alignment Note

The real upstream Symphony structure keeps startup orchestration distinct from long-lived runtime/request handling and supervisor-managed services. CO should stay TypeScript-native and hardened for its own authority model, but the same boundary principle applies: startup input preparation should be explicit and isolated from request handling and lifecycle ownership.

## Proposed Design

### 1. One bounded startup-input helper

Introduce one helper, preferably same-file/private unless implementation proves a tiny control-local module is clearer, that:
- generates the control token,
- calls `readControlServerSeeds(...)`,
- calls `createControlServerSeededRuntimeAssembly(...)`,
- returns the prepared `requestContextShared` plus the `controlToken` needed by `startPendingReadyInstance(...)`.

### 2. `ControlServer.start()` becomes a thin entrypoint

`ControlServer.start()` should keep:
- delegating into the startup-input helper,
- delegating into `startPendingReadyInstance(...)`,
- returning the ready `ControlServer`.

It should stop performing the startup-input prep inline.

### 3. Explicit exclusions

This slice must not:
- modify seed-loading semantics,
- modify seeded-runtime assembly semantics,
- reopen `startPendingReadyInstance(...)`,
- change request shell or bootstrap lifecycle wiring,
- widen the control surface with a new exported public adapter unless implementation proves that is the smallest correct shape.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- optionally one tiny control-local helper module if same-file private extraction is not the clearest shape
- focused coverage under `orchestrator/tests/`

## Risks

- Accidentally splitting token generation away from the exact runtime assembly inputs consumed by startup.
- Reopening already-extracted seams by moving behavior out of scope for this slice.
- Introducing an exported helper that widens surface area for what should remain an internal startup composition concern.

## Validation Plan

- Add focused regression coverage for the extracted startup-input seam.
- Preserve existing `ControlServer` startup coverage.
- Run the standard docs-first guard bundle before implementation.
