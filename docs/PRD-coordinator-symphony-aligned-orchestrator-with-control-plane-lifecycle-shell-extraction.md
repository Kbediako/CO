# PRD: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

## Summary

After `1192` removed the remaining pipeline route-entry shell, the next truthful seam is the private control-plane lifecycle envelope still embedded in `withControlPlaneLifecycle(...)`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a bounded control-plane lifecycle shell:

- `withControlPlaneLifecycle(...)`
- `startOrchestratorControlPlaneLifecycle(...)` start/failure/cleanup ordering
- `createRunEventPublisher(...)` assembly
- `runWithLifecycle(...)` handoff of `runEvents`, `eventStream`, and `onEventEntry`

That leaves the public orchestrator class holding the remaining control-plane lifecycle orchestration even though run-lifecycle execution, route-entry behavior, and routing policy have already been separated into smaller helpers.

## Goal

Extract the private control-plane lifecycle shell from `orchestrator.ts` into one bounded service helper while preserving current startup, failure, event-stream, and cleanup behavior.

## Non-Goals

- changing public `start()` / `resume()` preparation flow
- changing run-lifecycle orchestration shell behavior
- changing control-plane validator/service behavior
- changing route execution behavior
- changing run-event publisher semantics

## Success Criteria

- one bounded helper owns the control-plane lifecycle shell currently embedded in `orchestrator.ts`
- `orchestrator.ts` no longer owns the start/failure/cleanup envelope around control-plane lifecycle startup
- focused regressions preserve control-plane lifecycle startup, event publication, and cleanup behavior
