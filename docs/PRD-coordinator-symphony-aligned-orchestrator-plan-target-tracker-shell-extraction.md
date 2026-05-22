# PRD: Coordinator Symphony-Aligned Orchestrator Plan-Target Tracker Shell Extraction

## Summary

After `1186` moved the execution route-adapter shell out of `orchestrator.ts`, the next truthful remaining seam is the `plan:completed` tracker side-effect shell still embedded beside `createRunLifecycleTaskManager(...)`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns the small but real manifest side-effect bridge that attaches to the TaskManager bus:

- `attachPlanTargetTracker(...)`
- the `plan:completed` listener
- `manifest.plan_target_id` mutation
- `persistManifest(...)` plus warn-only failure handling

That leaves `CodexOrchestrator` holding one remaining tracker/persistence shell even though route adaptation, execution registration, and the surrounding lifecycle stages have already been separated into smaller helpers.

## Goal

Extract one bounded helper that owns the plan-target tracker shell while keeping `createRunLifecycleTaskManager(...)` as the owner of registration assembly and TaskManager creation.

## Non-Goals

- changing `performRunLifecycle(...)`
- changing public `start()` or `resume()` behavior
- changing `createRunLifecycleTaskManager(...)` registration assembly
- changing `createOrchestratorRunLifecycleExecutionRegistration(...)`
- changing router decision or execution-mode policy helpers
- changing cloud or local execution shells
- changing broader control-plane or bootstrap design
- changing `plan_target_id` semantics

## Success Criteria

- one bounded helper owns the `attachPlanTargetTracker(...)` shell currently embedded in `orchestrator.ts`
- `createRunLifecycleTaskManager(...)` remains the owner of execution-registration creation and TaskManager creation
- focused regressions preserve tracker attachment, no-attach-on-manager-failure behavior, unchanged-target skips, and warn-without-throw persistence failure handling
