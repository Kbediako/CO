# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Environment Resolution Boundary Extraction

## Problem Statement

Now that prompt assembly is out of `orchestratorCloudTargetExecutor.ts`, the smallest truthful remaining cloud seam is the shared environment-id resolution contract that still lives inside the executor while neighboring services import `resolveCloudEnvironmentId(...)` directly.

## Scope

- extract shared cloud environment-id resolution into one bounded helper/service
- update the executor, cloud-route shell, and auto-scout evidence recorder to consume the shared resolution contract
- preserve current precedence across target metadata, task metadata, env overrides, and process env

## Out of Scope

- cloud prompt assembly
- request env/default parsing and `CloudTaskExecutorInput` construction
- target-stage preflight resolution or sibling skipping
- missing-environment failure contract
- running-state activation, executor updates, or completion handling

## Current Hypothesis

The truthful seam is the exported `resolveCloudEnvironmentId(...)` contract. The likely landing shape is one adjacent service under `orchestrator/src/cli/services/` that exposes the shared environment-id resolution contract for executor, route-shell, and auto-scout callers while leaving unrelated parsing helpers out of scope.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review`
