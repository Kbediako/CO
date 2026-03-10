---
id: 20260310-1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction
title: Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
related_tasks:
  - tasks/tasks-1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction

## Summary

Extract the remaining pending-instance host shell out of `ControlServer.start()` into one same-file `private static async` helper on `ControlServer`. The helper should own construction of the pending instance around the bound request shell plus the bootstrap-attachment and failure-close callbacks consumed by the already-extracted ready-instance startup helper, and return the fully started `ControlServer`.

## Scope

- Add one same-file `private static` helper inside `orchestrator/src/cli/control/controlServer.ts`.
- Move pending instance construction plus callback assembly out of `ControlServer.start()`.
- Preserve live request-shell reader semantics, bootstrap lifecycle attachment ordering, and fail-closed cleanup behavior.
- Add focused regressions for the extracted host-shell seam.

## Out of Scope

- Seed loading changes.
- Seeded runtime assembly changes.
- Request-shell binding behavior changes.
- Ready-instance startup helper behavior changes.
- `close()` shutdown ordering changes.
- New exported helpers under `orchestrator/src/cli/control/`.

## Proposed Design

### 1. Same-file pending host-shell helper

Introduce a `private static` helper on `ControlServer` that:
- creates the bound request shell with live readers over a nullable `instance`,
- constructs the pending `ControlServer`,
- calls `startControlServerReadyInstanceStartup(...)` with an `onBootstrapAssembly(...)` callback that mutates that instance and a `closeOnFailure()` callback that closes that same instance,
- stores the returned `baseUrl`,
- returns the fully started `ControlServer`.

Keeping the helper inside `ControlServer` preserves private-field access and avoids widening the surface with an unnecessary exported adapter.

### 2. Thinner `ControlServer.start()`

`ControlServer.start()` should keep:
- token generation,
- seed loading,
- seeded runtime assembly,
- delegation into the private pending host-shell helper,
- returning the ready `ControlServer`.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- focused host-shell regressions under `orchestrator/tests/`

## Risks

- Accidentally snapshotting `expiryLifecycle` instead of reading it from the live instance.
- Rebinding bootstrap callbacks to a different instance than the request shell uses.
- Breaking fail-closed cleanup by closing the wrong instance or closing before lifecycle attachment is visible.

## Validation Plan

- Focused regressions for live request-shell reads before and after bootstrap attachment.
- Focused regressions for `closeOnFailure()` targeting the same pending instance.
- Preserve existing broader `ControlServer` startup coverage.
- Standard docs-first guard bundle before implementation.
