---
id: 20260308-1072-coordinator-symphony-aligned-control-request-context-assembly-extraction
title: Coordinator Symphony-Aligned Control Request Context Assembly Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-request-context-assembly-extraction.md
related_tasks:
  - tasks/tasks-1072-coordinator-symphony-aligned-control-request-context-assembly-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Request Context Assembly Extraction

## Summary

Extract the remaining request-context assembly ownership cluster from `controlServer.ts` into a dedicated module. The extracted owner should handle shared request-context and internal-context composition, while `controlServer.ts` keeps HTTP admission, route dispatch, SSE client registration, and server close ownership explicit.

## Scope

- Add a control-local request-context builder module under `orchestrator/src/cli/control/`.
- Move `buildContext(...)`, `buildInternalContext(...)`, and the nearby shared context composition logic out of `controlServer.ts`.
- Add focused regressions for the extracted builder seam.

## Out of Scope

- Route/controller rewiring.
- Event transport changes.
- SSE admission/bootstrap extraction.
- Telegram provider behavior.
- Generic service-container abstractions.

## Proposed Design

### 1. Introduce a dedicated control request-context builder

Create a new control-local module, likely something like `controlRequestContext.ts`, that owns:

- shared request-context field assembly,
- internal-context construction for non-HTTP helper paths,
- nearby presenter/runtime snapshot composition that currently rethreads the same dependencies.

The target surface should stay small and explicit, for example:

- `buildContext(...)`
- `buildInternalContext(...)`
- optional tiny presenter/runtime composition helpers if they are required to remove duplication cleanly

with internal helpers kept private to the module.

### 2. Keep `controlServer.ts` as the outer shell

`controlServer.ts` should continue to own:

- store/runtime construction,
- raw HTTP server creation,
- bind/listen handling,
- request handling and authenticated dispatch,
- SSE client registration/bootstrap,
- server close ownership.

### 3. Preserve current semantics

The extraction must keep:

- current request-context fields,
- internal-context behavior for non-HTTP helpers,
- presenter/runtime snapshot composition behavior,
- existing route/controller/helper call patterns.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new request-context builder under `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`
- optional new dedicated request-context builder test file under `orchestrator/tests/`

## Risks

- Widening into route/controller extraction.
- Regressing helper flows that depend on internal contexts.
- Accidentally changing presenter/runtime snapshot composition.
- Introducing a generic container abstraction instead of a bounded builder seam.

## Validation Plan

- Focused regressions for:
  - shared request-context field assembly,
  - internal-context behavior,
  - unchanged helper call patterns around Telegram oversight and request handling,
  - unchanged route behavior around the extracted seam.
- Standard docs-first guard bundle before implementation.
