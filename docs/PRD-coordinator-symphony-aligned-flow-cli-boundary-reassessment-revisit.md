# PRD: Coordinator Symphony-Aligned Flow CLI Boundary Reassessment Revisit

## Summary

After the earlier `1247` flow-shell extraction, the current tree still leaves a broad binary-facing `flow` wrapper in `bin/codex-orchestrator.ts`.

## Problem

`handleFlow(...)` still appears to own more than thin parse/help glue:

- format, execution-mode, and runtime-mode resolution
- repo-config policy application
- auto issue-log enablement
- task/parent-run/approval-policy/target-stage shaping
- UI wrapping and helper injection

If that broader wrapper-local request shaping is real, the older local `flow` freeze posture would now be stale.

## Goal

Reinspect the current `flow` boundary and record a truthful `go` or `freeze` result from the current tree.
