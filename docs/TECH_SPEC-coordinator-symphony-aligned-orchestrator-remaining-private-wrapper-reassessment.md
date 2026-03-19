# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Remaining Private Wrapper Reassessment

## Problem Statement

`1200` removed the last clear resume-local extraction. The remaining private wrappers in `orchestrator.ts` must be reassessed before another implementation slice is opened.

## Scope

- inspect only the remaining private wrapper surface around `orchestrator.ts`
- compare current ownership with:
  - `orchestrator/src/cli/services/orchestratorRunLifecycleOrchestrationShell.ts`
  - `orchestrator/src/cli/services/orchestratorExecutionRouteAdapterShell.ts`
  - `orchestrator/src/cli/services/orchestratorControlPlaneLifecycleShell.ts`
- determine whether one truthful next seam still exists nearby

## Out of Scope

- code changes to runtime selection, route adapters, or public commands
- reopening `1200`
- broad lifecycle or control-plane refactors
- forcing an extraction for stylistic consistency alone

## Current Hypothesis

The only plausible nearby implementation seam is the `performRunLifecycle(...)` service-binding wrapper. `executePipeline(...)` and `runAutoScout(...)` are likely already thin enough that another extraction would create a fake boundary.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review` for docs-first capture or explicit override
