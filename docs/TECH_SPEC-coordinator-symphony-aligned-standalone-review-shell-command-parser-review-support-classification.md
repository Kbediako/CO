# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Shell Command Parser Review-Support Classification

## Problem Statement

The standalone-review support-family classifier still enumerates adjacent extracted helper families but omits the already-extracted shell-command parser family that those helpers depend on.

## Scope

- classify the shell-command parser source and built pair as `review-support`
- preserve the existing support-family touched-path behavior by extending the helper-family exemption to the parser family
- add only the focused regressions needed to pin the parser-family classification contract

## Out of Scope

- changing shell-command parser tokenization, segmentation, or env unwrap semantics
- extracting another helper family from `review-execution-state` or `run-review`
- changing review timeout, telemetry, or termination-boundary behavior
- broader review taxonomy refactors beyond the parser-family parity gap

## Current Hypothesis

The truthful follow-on after `1217` is not another broad helper extraction. The immediate remaining parity gap is that `review-shell-command-parser.ts` is now a shared standalone-review support surface but is still omitted from the `review-support` classifier and touched-family exemptions inside `scripts/lib/review-meta-surface-normalization.ts`.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
