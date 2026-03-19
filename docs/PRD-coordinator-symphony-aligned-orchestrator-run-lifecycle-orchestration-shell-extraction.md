# PRD: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Orchestration Shell Extraction

## Summary

After `1189` moved task-manager composition into a dedicated helper, the next truthful seam in `orchestrator.ts` is the run-lifecycle orchestration envelope around guard/planning, task execution, run-error emission, and completion ordering.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a bounded lifecycle shell:

- `performRunLifecycle(...)`
- `runLifecycleGuardAndPlanning(...)`
- `executeRunLifecycleTask(...)`
- privacy-guard reset before orchestration
- error and completion ordering around the task-manager lifecycle

The adjacent task-manager composition and route-adapter seams are already extracted, but `CodexOrchestrator` still owns the remaining lifecycle envelope locally.

## Goal

Extract the run-lifecycle orchestration shell from `orchestrator.ts` into a bounded service helper while preserving the same public behavior and keeping broader class ownership intact.

## Non-Goals

- changing public `start()` or `resume()` behavior
- changing task-manager composition or registration behavior
- changing routing policy or cloud/local route shells
- changing control-plane or scheduler behavior
- changing run-event payload shapes or completion semantics

## Success Criteria

- `performRunLifecycle(...)` becomes a thin delegate over the extracted lifecycle shell
- privacy-guard reset, guard short-circuit behavior, run-error payload/order, and completion semantics remain unchanged
- focused regressions preserve the lifecycle call order and error-path behavior
