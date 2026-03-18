# PRD: Coordinator Symphony-Aligned Flow CLI Remaining Boundary Freeze Reassessment Revisit

## Summary

After `1292` extracted `orchestrator/src/cli/flowCliRequestShell.ts`, the next truthful nearby move is to reassess whether any real local `flow` shell remains in `bin/codex-orchestrator.ts`.

## Problem

Post-`1292`, the remaining local `flow` pocket may now be only:

- shared `parseArgs(...)` ownership
- top-level help routing
- a thin handoff into `runFlowCliRequestShell(...)`

If that is all that remains, another extraction would be synthetic drift rather than a truthful Symphony-aligned seam.

## Goal

Determine whether the remaining local `flow` pocket should freeze explicitly or whether one smaller truthful follow-on seam still exists.

## Non-Goals

- changing lower `flow` execution behavior
- reopening lower `flow` lifecycle internals
- forcing symmetry with earlier CLI shell slices

## Success Criteria

- the remaining local `flow` pocket is reinspected and a truthful freeze-or-go result is recorded
- if `freeze`, the closeout explains why no real local mixed-ownership seam remains
- if `go`, the next narrower seam is named concretely with bounded ownership
