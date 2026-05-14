# PRD: Coordinator Symphony-Aligned Orchestrator Execution-Routing Shell Extraction

## Summary

After `1156` extracted the shared local/cloud execution lifecycle shell, `1157` extracted the cloud-target executor, and `1158` extracted the local pipeline executor, the next truthful bounded seam is the remaining execution-routing shell inside `orchestrator.ts`: mode policy, runtime selection, effective env merge, cloud preflight/fallback policy, and dispatch into the extracted local/cloud runners.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns the dense routing and policy layer above the extracted execution services. That keeps runtime-selection behavior, cloud fallback shaping, and executor dispatch coupled to the top-level class even though the mode-specific execution bodies now live below it.

## Goal

Extract one bounded execution-routing shell service adjacent to `orchestrator.ts`, moving the routing/policy layer with it while preserving the current public behavior, manifest contract, and lifecycle authority boundary.

## Non-Goals

- Changing the extracted local or cloud executor bodies
- Changing runtime selection semantics, cloud preflight criteria, or fallback policy outcomes
- Refactoring `start` / `resume` orchestration or public lifecycle shells
- Refactoring `performRunLifecycle(...)`, control-plane, scheduler, or TaskManager orchestration
- Redesigning auto-scout behavior beyond passing through the existing callback boundary
- Changing manifest schema or run-event payload contracts

## Success Criteria

- `orchestrator.ts` delegates the remaining execution-routing shell to one bounded helper/service
- the extracted seam owns mode-policy helpers, runtime selection / env merge, cloud preflight / fallback shaping, and local/cloud executor dispatch
- focused routing regressions stay green
- docs-first + validation artifacts are captured with the normal closeout discipline
