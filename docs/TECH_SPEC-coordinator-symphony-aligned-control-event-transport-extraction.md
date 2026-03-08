---
id: 20260308-1071-coordinator-symphony-aligned-control-event-transport-extraction
title: Coordinator Symphony-Aligned Control Event Transport Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-event-transport-extraction.md
related_tasks:
  - tasks/tasks-1071-coordinator-symphony-aligned-control-event-transport-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Event Transport Extraction

## Summary

Extract the remaining control-event transport ownership cluster from `controlServer.ts` into a dedicated module. The extracted owner should handle event stream append plus SSE/runtime fan-out, while `controlServer.ts` keeps HTTP admission, route dispatch, and request-context assembly explicit.

## Scope

- Add a control-local event transport module under `orchestrator/src/cli/control/`.
- Move `emitControlEvent(...)`, `broadcast(...)`, and the associated SSE/runtime fan-out logic out of `controlServer.ts`.
- Add focused event-transport regressions.

## Out of Scope

- Request-context composition extraction.
- Route/controller rewiring.
- Expiry lifecycle behavior.
- Post-bind bootstrap lifecycle behavior.
- Generic event bus or runtime container abstractions.

## Proposed Design

### 1. Introduce a dedicated control event transport owner

Create a new control-local module, likely something like `controlEventTransport.ts`, that owns:

- event stream append,
- SSE payload serialization,
- SSE client fan-out,
- dead-client pruning,
- runtime publish fan-out for emitted entries.

The target interface should stay small and explicit, for example:

- `emitControlEvent(...)`
- `broadcast(...)`

with internal helpers kept private to the module.

### 2. Keep `controlServer.ts` as the outer shell

`controlServer.ts` should continue to own:

- store/runtime construction,
- raw HTTP server creation,
- bind/listen handling,
- request handling and authenticated dispatch,
- request-context assembly,
- server close ownership.

### 3. Preserve current semantics

The extraction must keep:

- event stream append failure behavior,
- JSON `data: ...\n\n` SSE framing,
- dead-client pruning on write error,
- runtime publish on broadcast,
- existing route/controller call patterns.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new event transport owner under `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`
- optional new dedicated transport test file under `orchestrator/tests/`

## Risks

- Widening into request-context extraction or a generic event bus.
- Regressing SSE dead-client pruning.
- Dropping runtime publish on broadcast.
- Changing event payload framing or append failure semantics.

## Validation Plan

- Focused regressions for:
  - event append behavior,
  - SSE broadcast fan-out,
  - dead-client pruning,
  - runtime publish behavior,
  - unchanged request/route behavior around emitted events.
- Standard docs-first guard bundle before implementation.
