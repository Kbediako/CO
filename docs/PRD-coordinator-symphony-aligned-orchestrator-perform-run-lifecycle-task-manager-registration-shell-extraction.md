# PRD: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Task-Manager Registration Shell Extraction

## Summary

After `1161` extracted the post-execution completion shell, the next truthful bounded seam in `orchestrator.ts` is the TaskManager-registration harness inside `performRunLifecycle(...)`: execution-registration composition, `TaskManager` creation, and plan-target tracking attachment.

## Problem

`performRunLifecycle(...)` still owns a dense inline harness-assembly cluster before privacy reset, control-plane guard execution, and scheduler planning. That cluster is cohesive and meaningfully stateful, but it remains embedded in the broader lifecycle method alongside separate service boundaries that have already been extracted.

## Goal

Extract one bounded TaskManager-registration helper adjacent to `performRunLifecycle(...)`, moving only the harness assembly block out of the inline body while preserving current lifecycle authority and keeping guard/planning, execution, and completion seams where they already belong.

## Non-Goals

- Refactoring control-plane guard execution or scheduler plan creation
- Refactoring `manager.execute(...)`, error-path emission, or completion handling
- Refactoring public `start()` / `resume()` entrypoints
- Changing mode-policy semantics, `TaskStateStore` / `RunManifestWriter` behavior, or `plan_target_id` persistence semantics
- Reopening Telegram, Linear, or ControlServer work

## Success Criteria

- `performRunLifecycle(...)` delegates the execution-registration composition, `TaskManager` creation, and plan-target tracker attachment to one bounded helper/service
- the extracted seam preserves current mode-policy wiring and `plan_target_id` persistence behavior
- focused regressions preserve manager wiring continuity and plan-target tracking behavior
- docs-first + validation artifacts are captured with the normal closeout discipline
