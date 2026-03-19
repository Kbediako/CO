# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Prompt Context Builder Extraction

## Problem Statement

The standalone-review wrapper still owns one dense local cluster for prompt/context support even after earlier runtime and boundary splits. That cluster now includes task-context lookup, active closeout provenance resolution, NOTES fallback, and prompt scaffolding for the supported review surfaces.

## Scope

- extract the prompt/context support cluster from `scripts/run-review.ts` into a dedicated helper under `scripts/lib/`
- move task index and checklist resolution, task-context assembly, active closeout provenance helpers, and generated NOTES fallback into that helper
- move the surface-specific prompt scaffold assembly into that helper while preserving the current prompt text and architecture-path return contract
- keep `tests/run-review.spec.ts` as the primary behavior lock for the extraction, adding focused coverage only where needed for the new helper boundary

## Out of Scope

- `ReviewExecutionState` and review termination telemetry
- scope-path parsing and git diff metric collection
- runtime/codex command resolution, child-process execution, or monitor loops
- changes to review surface semantics or allowed meta-surface classifications
- new fallback behavior beyond the existing NOTES-generation contract

## Current Hypothesis

The truthful seam is a prompt-context builder helper under `scripts/lib/` that returns prompt scaffold lines plus the existing architecture-path and active-closeout metadata needed by the wrapper. The wrapper should remain responsible for scope collection, runtime configuration, monitoring, telemetry, and final launch arguments.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
