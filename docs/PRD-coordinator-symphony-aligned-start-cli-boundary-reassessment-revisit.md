# PRD: Coordinator Symphony-Aligned Start CLI Boundary Reassessment Revisit

## Summary

After the earlier `1271` start-shell extraction, the current tree still leaves a broad binary-facing `start` wrapper in `bin/codex-orchestrator.ts`.

## Problem

`handleStart(...)` still appears to own more than thin parse-and-delegate glue:

- format, execution-mode, and runtime-mode resolution
- repo-config policy application
- auto issue-log enablement
- task/goal/parent-run/approval-policy/target-stage selection
- UI wrapping and output/adoption-hint helper injection
- legacy collab warning and runtime env override wiring

If that broader wrapper-local request shaping is real, the older `start` freeze posture would now be stale.

## Goal

Reinspect the current `start` boundary and record a truthful `go` or `freeze` result from the current tree.

## Non-Goals

- changing `start` runtime behavior in this reassessment lane
- reopening lower start pipeline internals
- forcing another extraction unless current ownership proves one exists

## Success Criteria

- the remaining binary-facing `start` pocket is reinspected from current code
- the result is explicitly recorded as `freeze` or `go`
- if `go`, the next narrower seam is named concretely and bounded
