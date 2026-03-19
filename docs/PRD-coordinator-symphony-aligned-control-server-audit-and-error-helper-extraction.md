# PRD - Coordinator Symphony-Aligned Control Server Audit and Error Helper Extraction

## Summary

After `1087`, `ControlServer.start()` is comparatively thin, but `orchestrator/src/cli/control/controlServer.ts` still owns the local audit-payload shaping and route-error helper cluster that sits beside request entry. This slice extracts that bounded helper surface so the file keeps request entry/orchestration responsibility while control-action, dispatch-pilot, and Linear webhook audit payload shaping plus shared JSON error writes move behind one helper module.

## Problem

The remaining non-minimal `controlServer.ts` surface is no longer startup/runtime assembly. It is the cluster of local helpers that:
- shape Linear webhook audit events,
- shape dispatch-pilot viewed/evaluated audit events,
- shape control-action applied/replayed audit events and trace payloads,
- write shared JSON control errors.

Those helpers are cohesive, but they are not part of startup sequencing or request-shell ownership. Keeping them inline leaves `controlServer.ts` larger than necessary and mixes request entry with transport-payload shaping.

## Goals

- Extract the audit-event payload shaping and shared control-error write helpers into one bounded module.
- Keep `controlServer.ts` focused on request entry, route branching, and wiring helper callbacks into the authenticated route controller.
- Preserve event names, payload fields, and HTTP error response behavior exactly.

## Non-Goals

- Changing route/controller behavior.
- Changing persistence, runtime, or question-resolution semantics.
- Reopening startup/runtime bundle work from `1087`.
- Touching Telegram bridge behavior beyond preserving current tests.

## User Value

- Continues the Symphony-aligned thin-shell direction for the control server.
- Makes future route/controller capability shaping easier by reducing the remaining inline helper cluster.
- Keeps audit payload behavior explicit and easier to test in isolation.

## Acceptance Criteria

- `controlServer.ts` delegates the audit-event and shared JSON error helper cluster to one bounded helper module.
- Linear webhook, dispatch-pilot, and control-action audit payloads remain behaviorally identical.
- Focused regressions prove the extracted helper preserves event payload shape and shared JSON error writes.
