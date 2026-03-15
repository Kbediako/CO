# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Branch Resolution Boundary Extraction

## Problem Statement

Now that `1203` extracted shared environment-id resolution, the smallest truthful remaining cloud-resolution seam is the duplicated `CODEX_CLOUD_BRANCH` precedence still owned inline by the cloud executor request contract, cloud-route preflight request builder, and auto-scout evidence recorder.

## Scope

- extract shared cloud branch resolution into one bounded helper/service
- update the cloud executor, cloud-route shell, and auto-scout evidence recorder to consume the shared branch contract
- preserve current precedence across target metadata, env overrides, and process env

## Out of Scope

- shared environment-id resolution after `1203`
- prompt assembly
- request env/default parsing and `CloudTaskExecutorInput` construction
- preflight target-stage resolution, sibling skipping, or missing-environment failure handling
- running-state activation, executor updates, or completion handling

## Current Hypothesis

The truthful seam is the shared branch-resolution contract currently duplicated across the three cloud callers. The likely landing shape is one adjacent service under `orchestrator/src/cli/services/` that exposes `resolveCloudBranch(...)` while leaving sibling parsing helpers and lifecycle behavior out of scope.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review`
