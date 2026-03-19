# PRD: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Completion Shell Extraction

## Summary

After `1160` extracted the execution-registration shell, the next truthful bounded seam in `orchestrator.ts` is the post-execution completion block inside `performRunLifecycle(...)`: scheduler finalization, run-summary projection/apply steps, summary persistence, completion event emission, and the final `{ manifest, runSummary }` return assembly.

## Problem

`performRunLifecycle(...)` still mixes the actual lifecycle boundary around completed execution with a dense inline completion cluster. That cluster is cohesive and downstream of execution, but it remains embedded in the broader method alongside control-plane, scheduler-plan creation, and execution-registration concerns.

## Goal

Extract one bounded completion shell adjacent to `orchestrator.ts`, moving only the post-execution completion block out of `performRunLifecycle(...)` while preserving current lifecycle authority and keeping upstream planning/execution seams in place.

## Non-Goals

- Changing execution-registration behavior from `1160`
- Refactoring control-plane guard execution or scheduler plan creation
- Refactoring public `start()` / `resume()` entrypoints
- Changing manifest schema, run-event payloads, or run-summary projection semantics
- Reopening Telegram, Linear, or ControlServer work

## Success Criteria

- `performRunLifecycle(...)` delegates the post-execution completion block to one bounded helper/service
- the extracted seam owns scheduler finalization, run-summary apply/projection steps, summary persistence, completion event emission, and the final return assembly
- focused regressions preserve completion ordering, payload continuity, and run-summary persistence behavior
- docs-first + validation artifacts are captured with the normal closeout discipline
