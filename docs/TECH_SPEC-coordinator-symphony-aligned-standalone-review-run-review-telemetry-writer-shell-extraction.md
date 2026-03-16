# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Run-Review Telemetry Writer Shell Extraction

## Context

`1225` extracted the post-prompt non-interactive handoff shell, leaving `scripts/run-review.ts` with one remaining inline telemetry-writer callback passed into `runReviewLaunchAttemptShell(...)`.

That callback currently duplicates logic already owned by:

- `ReviewExecutionState.buildTelemetryPayload(...)` in `scripts/lib/review-execution-state.ts`
- telemetry build/persist helpers in `scripts/lib/review-execution-telemetry.ts`

## Requirements

1. Move the telemetry-writer callback behavior out of `scripts/run-review.ts` and into `scripts/lib/review-execution-telemetry.ts`.
2. Reuse `ReviewExecutionState.buildTelemetryPayload(...)` as the canonical payload builder.
3. Preserve success/failure persistence semantics, including explicit termination-boundary passthrough and implicit fallback inference.
4. Preserve the current non-fatal stderr logging when telemetry persistence fails.
5. Keep the sibling `runReview` callback inline in `scripts/run-review.ts`.
6. Add focused regression coverage for the extracted telemetry writer behavior.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- focused telemetry/run-review regressions
- `node scripts/delegation-guard.mjs --task 1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction`
- `npm run build`
- `npm run lint`
- `npm run test`
- `node scripts/diff-budget.mjs`
- `npm run review -- --manifest <manifest>`
- `npm run pack:smoke`
