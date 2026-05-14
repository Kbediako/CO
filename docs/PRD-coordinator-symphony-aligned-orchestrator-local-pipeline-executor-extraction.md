# PRD: Coordinator Symphony-Aligned Orchestrator Local-Pipeline Executor Extraction

## Summary

After `1156` extracted the shared local/cloud execution lifecycle shell and `1157` extracted the cloud target executor, the next truthful bounded seam is the remaining non-cloud executor body inside `orchestrator.ts`: the local stage loop, already-completed skip handling, command-stage execution, subpipeline recursion, and child-run shaping.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns the entire local pipeline executor body even though the shared lifecycle shell and cloud executor are already factored out. That keeps the denser local mutation surface inline in the top-level orchestrator and leaves the mode-specific execution shape asymmetrical relative to the current Symphony-aligned direction.

## Goal

Extract one bounded local pipeline executor service adjacent to `orchestrator.ts`, moving the local-only stage loop behavior with it while preserving the current public behavior, manifest contract, and runtime-selection boundary.

## Non-Goals

- Changing runtime selection, cloud preflight, or cloud fallback policy
- Refactoring the cloud target executor or cloud prompt/config helpers
- Refactoring `start`/`resume` bootstrap dedupe
- Refactoring `performRunLifecycle(...)`, control-plane, scheduler, or TaskManager orchestration
- Changing manifest schema or run-event payload contracts

## Success Criteria

- `orchestrator.ts` delegates the remaining non-cloud executor body to one bounded helper/service
- the extracted seam owns the local stage loop, already-completed skip branch, command-stage execution, subpipeline recursion, and child-run shaping
- focused local orchestration regressions stay green
- docs-first + validation artifacts are captured with the normal closeout discipline
