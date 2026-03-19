# PRD: Coordinator Symphony-Aligned Flow CLI Shell Extraction

## Summary

After `1246` froze the broader doctor command family, the next truthful seam is the inline `flow` command shell in `bin/codex-orchestrator.ts`.

## Problem

The current `flow` surface still keeps command-entry parsing and flow-owned orchestration together inside the top-level CLI file:

- `handleFlow(...)`
- `resolveFlowTargetStageSelection(...)`

That cluster is broader than a same-owner wrapper. It coordinates target-stage selection, docs-review to implementation-gate sequencing, and flow-specific failure handling for the `flow` command.

## Goal

Extract the `flow` CLI shell into a bounded helper/module while preserving the current `flow` contract, output shapes, auto-issue-log behavior, and docs-review to implementation-gate sequencing.

## Non-Goals

- changing which pipelines `flow` runs
- changing flow flag semantics or output format contracts
- widening into unrelated `start`, `review`, `plan`, or `rlm` command shells
- reopening the frozen doctor-family pocket from `1246`

## Success Criteria

- docs-first artifacts capture the bounded `flow` command shell seam
- the lane names the exact inline `flow` helpers to move behind a dedicated shell boundary
- downstream behavior remains defined as parity with existing `tests/cli-command-surface.spec.ts` flow coverage
