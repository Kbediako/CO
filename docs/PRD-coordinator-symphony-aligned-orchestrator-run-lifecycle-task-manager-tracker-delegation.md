# PRD: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Tracker Delegation

## Summary

After `1187` extracted the `plan:completed` tracker side-effect shell into `orchestratorPlanTargetTracker.ts`, the next truthful remaining seam is the one-line local wrapper that still sits between `createRunLifecycleTaskManager(...)` and that helper.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a tiny private shell:

- `attachPlanTargetTracker(...)`
- direct forwarding of `manager`, `manifest`, `paths`, and `persister`
- one remaining local indirection inside `createRunLifecycleTaskManager(...)`

That wrapper no longer adds behavior. It is just a local forwarding seam left behind by `1187`.

## Goal

Remove the remaining local tracker wrapper from `CodexOrchestrator` and delegate directly to the existing tracker helper from `createRunLifecycleTaskManager(...)`.

## Non-Goals

- changing tracker semantics in `orchestratorPlanTargetTracker.ts`
- changing `createRunLifecycleTaskManager(...)` registration assembly
- changing `performRunLifecycle(...)`
- changing public `start()` or `resume()` behavior
- changing routing, execution policy, cloud/local lifecycle shells, or control-plane ownership

## Success Criteria

- `orchestrator.ts` no longer defines a private `attachPlanTargetTracker(...)` wrapper
- `createRunLifecycleTaskManager(...)` delegates directly to `attachOrchestratorPlanTargetTracker(...)`
- focused regressions prove tracker delegation still happens after successful manager creation and is skipped when manager creation throws
