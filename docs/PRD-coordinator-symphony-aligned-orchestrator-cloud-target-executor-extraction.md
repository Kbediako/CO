# PRD: Coordinator Symphony-Aligned Orchestrator Cloud-Target Executor Extraction

## Summary

After `1156` extracted the shared local/cloud execution lifecycle shell, the next truthful bounded seam is the remaining cloud-only executor body inside `orchestrator.ts`: target-stage resolution, non-target skipping, cloud environment failure shaping, executor/config wiring, and cloud prompt assembly.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns the entire cloud-target command execution body even though the shared lifecycle shell is now factored out. That leaves the cloud-only mutation surface dense and harder to reason about than the local path, and it keeps prompt/config helpers coupled to the top-level orchestrator class.

## Goal

Extract one bounded cloud-target executor service adjacent to `orchestrator.ts`, moving the cloud-only prompt/config helpers with it while preserving the current public behavior, manifest contract, and local/cloud boundary.

## Non-Goals

- Changing runtime selection, cloud preflight, or cloud fallback policy
- Refactoring the local MCP/subpipeline loop
- Refactoring `start`/`resume` bootstrap dedupe
- Refactoring `performRunLifecycle(...)`, control-plane, scheduler, or TaskManager orchestration
- Changing manifest schema or run-event payload contracts

## Success Criteria

- `orchestrator.ts` delegates the cloud-only executor body to one bounded helper/service
- cloud prompt/config helpers move with that seam instead of remaining top-level orchestrator methods
- focused cloud regression coverage stays green
- docs-first + validation artifacts are captured with the normal closeout discipline
