# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Shell Env Interpreter Extraction

## Problem Statement

The standalone-review execution-state logic still contains a shared shell-env interpreter cluster that is reused by both meta-surface classification and startup-anchor analysis, but that state machine remains inline inside `scripts/lib/review-execution-state.ts`.

## Scope

- extract the shared shell-env interpreter seam from `scripts/lib/review-execution-state.ts`
- preserve current exported-env, nested-shell, `env`, `export`, and `unset` handling for the existing consumers
- add only the focused `review-execution-state` regressions needed to pin the extracted behavior

## Out of Scope

- `scripts/run-review.ts` child-process supervision extraction
- prompt/context or review-support taxonomy changes beyond the interpreter seam
- command-intent launcher normalization or Windows-launcher handling
- broader review reliability fixes not directly required by the interpreter extraction

## Current Hypothesis

The truthful next lane is a local helper extraction inside `scripts/lib/review-execution-state.ts`: the same shell-env interpreter state machine is already shared by multiple review-state analyses, so making it a first-class seam should reduce local duplication without changing runtime ownership or widening review scope.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
