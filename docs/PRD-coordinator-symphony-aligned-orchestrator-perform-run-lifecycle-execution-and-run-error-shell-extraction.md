# PRD: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-and-Run-Error Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction`

## Background

After `1161` extracted completion handling, `1162` extracted TaskManager registration, and `1163` extracted the post-reset guard-and-planning cluster, the only multi-line lifecycle block still inline in `performRunLifecycle(...)` is the execution / error boundary:

- `manager.execute(taskContext)`
- `context.runEvents?.runError(...)`
- the catch / rethrow path

This is thinner than the prior seams, but it is the last remaining ordered execution shell before `performRunLifecycle(...)` collapses to high-level lifecycle composition.

## Goal

Extract one bounded helper adjacent to `performRunLifecycle(...)` that owns only the `manager.execute(...)` plus `runError(...)` catch / rethrow boundary, while preserving the existing ownership of privacy reset, TaskManager registration, guard-and-planning, completion, and public lifecycle entrypoints.

## Non-Goals

- Reopening the `1161` completion seam
- Reopening the `1162` TaskManager registration seam
- Reopening the `1163` guard-and-planning seam
- Moving the explicit privacy reset into the helper
- Changing `runError(...)` payload shape or event semantics
- Touching Telegram / Linear / ControlServer surfaces

## Success Criteria

- `performRunLifecycle(...)` delegates the execute / run-error boundary through one bounded helper
- Success path returns the exact `RunSummary` from `manager.execute(...)`
- Failure path emits `runError({ pipelineId, message, stageId: null })` once and rethrows the original error
- Focused regressions cover both the success and failure paths without retesting surrounding lifecycle seams
