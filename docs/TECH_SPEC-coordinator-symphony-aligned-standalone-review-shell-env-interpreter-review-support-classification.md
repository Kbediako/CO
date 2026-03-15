# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Shell Env Interpreter Review-Support Classification

## Problem Statement

The standalone-review support-family classifier still points at the older adjacent helper families even though `1209` extracted shell-env interpretation into its own helper module.

## Scope

- classify the shell-env helper family as `review-support`
- preserve the current support-family touched-path behavior by extending the helper-family exemption to the new shell-env helper pair
- add only the focused review-state and wrapper regressions needed to pin the classification contract

## Out of Scope

- changing shell-env interpreter semantics
- extracting another helper from `scripts/lib/review-execution-state.ts`
- changing `scripts/run-review.ts` runtime supervision, monitoring, or termination boundaries
- broader review taxonomy refactors beyond the new helper-family parity gap

## Current Hypothesis

The truthful follow-on after `1209` is not a broader utility extraction. The immediate parity gap is that the newly extracted shell-env helper family is missing from the existing `review-support` classifier and touched-family exemptions inside `scripts/lib/review-execution-state.ts`.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
