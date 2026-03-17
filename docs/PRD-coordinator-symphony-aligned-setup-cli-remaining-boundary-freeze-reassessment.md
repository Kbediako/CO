# PRD: Coordinator Symphony-Aligned Setup CLI Remaining Boundary Freeze Reassessment

## Summary

After `1283` extracted `orchestrator/src/cli/setupCliShell.ts`, the next truthful nearby move is to reassess whether any real local `setup` shell remains in `bin/codex-orchestrator.ts`.

## Problem

Post-`1283`, the remaining local `setup` pocket may now be only:

- shared `parseArgs(...)` ownership
- top-level command dispatch
- top-level help routing
- a thin handoff into `runSetupCliShell(...)`

If that is all that remains, another extraction would be synthetic drift rather than a truthful Symphony-aligned seam.

## Goal

Determine whether the remaining local `setup` pocket should freeze explicitly or whether one smaller truthful follow-on seam still exists.

## Non-Goals

- changing lower setup bootstrap behavior
- reopening delegation, devtools, or skills internals
- forcing symmetry with earlier CLI shell slices

## Success Criteria

- the remaining local `setup` pocket is reinspected and a truthful freeze-or-go result is recorded
- if `freeze`, the closeout explains why no real local mixed-ownership seam remains
- if `go`, the next narrower seam is named concretely with bounded ownership
