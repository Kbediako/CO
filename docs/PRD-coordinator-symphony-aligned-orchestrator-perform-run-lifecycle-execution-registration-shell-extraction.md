# PRD: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-Registration Shell Extraction

## Summary

After `1159` extracted the execution-routing shell, the next truthful bounded seam in `orchestrator.ts` is the execution-registration cluster inside `performRunLifecycle(...)`: the dedupe map, the `executePipeline` closure, latest-result tracking, and TaskManager assembly/wiring.

## Problem

`performRunLifecycle(...)` still mixes lifecycle orchestration with the local execution-registration mechanics that adapt `PipelineExecutor` inputs into routed pipeline runs. That keeps the dedupe/result-wiring shell coupled to the broader lifecycle method even though the actual execution routing has already been extracted.

## Goal

Extract one bounded execution-registration shell adjacent to `orchestrator.ts`, moving the `executePipeline` registration/dedupe/result-wiring cluster out of `performRunLifecycle(...)` while preserving the current public behavior and keeping lifecycle authority in the orchestrator.

## Non-Goals

- Changing the extracted execution router, local executor, or cloud executor behavior
- Refactoring control-plane guard execution or scheduler planning/finalization
- Refactoring run-summary projection/writeback
- Changing `start()` / `resume()` entrypoints
- Changing manifest schema or run-event payload contracts

## Success Criteria

- `performRunLifecycle(...)` delegates the execution-registration cluster to one bounded helper/service
- the extracted seam owns the dedupe map, routed executor closure assembly, and latest-result/getResult wiring
- focused regressions preserve dedupe behavior, manager wiring, and manifest/result continuity
- docs-first + validation artifacts are captured with the normal closeout discipline
