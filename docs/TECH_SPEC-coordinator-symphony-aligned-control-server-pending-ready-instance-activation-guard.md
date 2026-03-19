---
id: 20260312-1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard
title: Coordinator Symphony-Aligned Control Server Pending Ready-Instance Activation Guard
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md
related_tasks:
  - tasks/tasks-1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Pending Ready-Instance Activation Guard

## Summary

Extract the mutable activation guard from `ControlServer.startPendingReadyInstance(...)` so `controlServer.ts` keeps only top-level orchestration, public runtime ownership, and close behavior.

## Current State

After `1121`, `controlServer.ts` still owns one mixed activation shell:

1. create a live `instance` cell for request-shell readers,
2. bind the request shell against that cell,
3. construct the pending `ControlServer`,
4. attach `expiryLifecycle` and `bootstrapLifecycle` through `onBootstrapAssembly`,
5. route `closeOnFailure` back into the pending instance,
6. publish `baseUrl` and return the ready instance.

That is now the next truthful boundary. It is smaller than the old startup-input seam and should be extracted without reopening startup-input preparation or the downstream ready-instance startup helper.

## Symphony Alignment Note

Real Symphony keeps activation/supervision shells distinct from the long-lived runtime they govern. CO should keep its own TypeScript-native authority boundaries, but the same principle applies here: the activation guard should be explicit and isolated from the main class body without broadening the control surface.

## Proposed Design

### 1. One bounded activation-guard helper

Introduce one bounded helper that:
- owns the live `instance` cell,
- binds the request shell against that cell,
- constructs the pending `ControlServer`,
- delegates into `startControlServerReadyInstanceStartup(...)`,
- attaches bootstrap/expiry lifecycle state onto the same instance,
- publishes `baseUrl` and returns the ready instance.

### 2. `ControlServer.start()` stays thin

`ControlServer.start()` should keep:
- delegating into `prepareControlServerStartupInputs(...)`,
- delegating into the extracted activation-guard helper,
- returning the ready instance.

### 3. Explicit exclusions

This slice must not:
- change `prepareControlServerStartupInputs(...)`,
- change `createBoundControlServerRequestShell(...)`,
- change `startControlServerReadyInstanceStartup(...)`,
- change request routing, bootstrap assembly internals, or `ControlServer.close()`,
- broaden into review-wrapper or broader runtime refactors.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- optionally one tiny control-local helper module if same-file/private extraction is not the clearest shape
- focused coverage under `orchestrator/tests/`

## Risks

- Accidentally moving lifecycle ownership out of `ControlServer` instead of only extracting the activation guard.
- Breaking the live `instance` cell dereference contract used by the bound request shell.
- Changing close-on-failure or bootstrap-attachment ordering while trying to isolate the seam.

## Validation Plan

- Add focused regression coverage for the activation-guard seam.
- Preserve existing `ControlServer` startup behavior coverage.
- Run the standard docs-first guard bundle before implementation.
