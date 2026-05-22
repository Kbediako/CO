# PRD: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Shell Extraction

## Summary

After `1188` removed the final local tracker wrapper, the next truthful seam in `orchestrator.ts` is the remaining `createRunLifecycleTaskManager(...)` composition plus its one-call-site `createTaskManager(...)` forwarding wrapper.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a bounded composition shell:

- `createRunLifecycleTaskManager(...)`
- local `createTaskManager(...)` forwarding
- registration creation through `createOrchestratorRunLifecycleExecutionRegistration(...)`
- manager construction through `createOrchestratorTaskManager(...)`
- tracker attachment through `attachOrchestratorPlanTargetTracker(...)`

The adjacent behaviors are already split into service helpers, but `CodexOrchestrator` still assembles them locally.

## Goal

Extract the remaining task-manager composition shell from `orchestrator.ts` into a bounded service helper while keeping broader run-lifecycle ownership in `CodexOrchestrator`.

## Non-Goals

- changing `performRunLifecycle(...)`
- changing public `start()` or `resume()` behavior
- changing routing policy or cloud/local execution shells
- changing execution-registration logic itself
- changing tracker helper behavior

## Success Criteria

- `orchestrator.ts` no longer owns the local `createRunLifecycleTaskManager(...)` composition shell
- the one-call-site `createTaskManager(...)` forwarding wrapper is removed with that extraction
- focused regressions preserve manager creation, attach-after-success behavior, and no-attach-on-manager-failure behavior
