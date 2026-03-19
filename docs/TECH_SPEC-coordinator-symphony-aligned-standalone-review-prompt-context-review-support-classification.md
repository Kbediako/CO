# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Prompt Context Review-Support Classification

## Problem Statement

`1207` moved prompt/context support into `scripts/lib/review-prompt-context.ts`, but the review meta-surface classifier still enumerates only the older standalone-review support files. The new helper family is therefore missing from the adjacent `review-support` boundary contract.

## Scope

- update `scripts/lib/review-execution-state.ts` so the prompt-context helper family is classified as `review-support`
- include the source helper, emitted dist helper, and direct focused spec in that family
- add focused regression coverage in the existing review-state / review-wrapper tests only where needed to pin the classification

## Out of Scope

- prompt/context behavior changes
- `run-review` runtime, scope, monitor, or telemetry changes
- new review-support families beyond the prompt-context helper seam
- docs/review wrapper taxonomy changes unrelated to the classification omission

## Current Hypothesis

The truthful seam is a narrow support-family classification update inside `scripts/lib/review-execution-state.ts` plus focused tests proving the newly extracted prompt-context helper is treated the same way as the other adjacent standalone-review support files.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
