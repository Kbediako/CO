# PRD: Coordinator Symphony-Aligned Control Request and Action Dispatch Boundary Reassessment

## Summary

After `1232` froze the remaining local delegation-server wrapper surface, the next truthful broader subsystem is the control request/action dispatch family around the control server route/controller layers.

## Problem

The control subsystem is already split across many extracted helpers, but the request/action dispatch path still spans a dense multi-file boundary:

- `orchestrator/src/cli/control/controlRequestController.ts`
- `orchestrator/src/cli/control/controlRequestRouteDispatch.ts`
- `orchestrator/src/cli/control/controlActionController.ts`
- adjacent request/authenticated-route and action-sequencing helpers they coordinate

That path sits on an important authority boundary: request admission, action normalization, confirmation validation, sequencing, persistence, and runtime publication all meet there. Before forcing another implementation slice, we need to determine whether a truthful bounded boundary still exists across those route/controller layers, or whether the current split is already the stable Symphony-aligned shape.

## Goal

Reassess the broader control request/action dispatch family and record whether an exact bounded implementation seam still exists there, or whether the correct result is an explicit no-op freeze.

## Non-Goals

- widening into Telegram, Linear, oversight projection, or control bootstrap/startup families
- reopening already-extracted control lifecycle shells without a new ownership gap
- changing live control action behavior in a docs-first reassessment lane
- treating delegation-server freeze work as evidence that the control family must also freeze

## Success Criteria

- docs-first artifacts capture the broader control request/action dispatch reassessment boundary
- the lane identifies either:
  - an exact next truthful implementation seam, or
  - an explicit no-op freeze with concrete reasons
- the reassessment keeps security/authority validation and control-state sequencing as first-class evaluation risks
