# PRD: Coordinator Symphony-Aligned Delegation Server Remaining Wrapper-Surface Reassessment

## Summary

After `1230` and `1231`, the obvious local delegation-server shell seams are exhausted. The next truthful move is a broader reassessment / freeze lane across the remaining [`orchestrator/src/cli/delegationServer.ts`](/Users/kbediako/Code/CO/orchestrator/src/cli/delegationServer.ts) wrapper surface before forcing another extraction.

## Problem

The recent delegation-server sequence already extracted the nearby cohesive seams:

- RPC transport/runtime plus top-level tool dispatch (`1230`)
- question enqueue/poll plus delegation-token flow (`1231`)

What remains in `delegationServer.ts` is broader host-owned behavior spanning:

- delegate spawn/status/pause/cancel handlers
- GitHub tool handling
- dynamic-tool bridge policy and attestation checks
- control-endpoint loading and retry helpers
- delegation config/tool-profile helpers

Those surfaces may represent substantive handler or policy ownership rather than a remaining shell. Forcing a new implementation slice here without a fresh defect or concrete ownership gap risks creating a synthetic abstraction.

## Goal

Reassess the remaining delegation-server wrapper surface and record whether any truthful bounded implementation seam still exists beyond the closed `1230` and `1231` pockets, or whether the correct result is an explicit broader freeze / no-op conclusion.

## Non-Goals

- reopening the closed transport/tool-dispatch or question/token seams from `1230` and `1231`
- extracting control, GitHub, or dynamic-tool helpers without new evidence of a real boundary
- widening into Telegram, Linear, doctor, diagnostics, or RLM families just because the local delegation-server pocket is nearly exhausted
- changing live delegation-server behavior in a docs-first reassessment lane

## Success Criteria

- docs-first artifacts capture the broader reassessment boundary and likely no-op outcome
- the lane explicitly reinspects the remaining delegation-server wrapper subsystem rather than assuming more local symmetry work exists
- nearby alternatives are rejected concretely when they are policy owners rather than shells
- the lane closes with either:
  - an exact next truthful implementation seam, or
  - an explicit broader freeze / no-op conclusion
