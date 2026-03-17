# PRD: Coordinator Symphony-Aligned Start CLI Remaining Boundary Freeze Reassessment

## Summary

After `1289` extracted `orchestrator/src/cli/startCliRequestShell.ts`, the next truthful nearby move is to reassess whether any real local `start` shell remains in `bin/codex-orchestrator.ts`.

## Problem

Post-`1289`, the remaining local `start` pocket may now be only:

- shared `parseArgs(...)` ownership
- top-level help routing
- a thin handoff into `runStartCliRequestShell(...)`

If that is all that remains, another extraction would be synthetic drift rather than a truthful Symphony-aligned seam.

## Goal

Determine whether the remaining local `start` pocket should freeze explicitly or whether one smaller truthful follow-on seam still exists.

## Non-Goals

- changing lower `start` execution behavior
- reopening lower start lifecycle internals
- forcing symmetry with earlier CLI shell slices

## Success Criteria

- the remaining local `start` pocket is reinspected and a truthful freeze-or-go result is recorded
- if `freeze`, the closeout explains why no real local mixed-ownership seam remains
- if `go`, the next narrower seam is named concretely with bounded ownership
