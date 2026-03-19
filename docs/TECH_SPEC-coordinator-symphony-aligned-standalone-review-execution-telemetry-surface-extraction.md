# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Execution Telemetry Surface Extraction

## Problem Statement

After `1216`, the remaining deterministic helper cluster still inline in `scripts/lib/review-execution-state.ts` is the execution telemetry surface: payload shaping, payload persistence, stderr summary logging, and failure-boundary inference used by `scripts/run-review.ts`.

## Scope

- extract the execution telemetry payload/persistence family from `scripts/lib/review-execution-state.ts`
- preserve telemetry payload schema, redaction behavior, persisted output-log paths, and termination-boundary persistence behavior
- preserve stderr telemetry summary behavior consumed by `scripts/run-review.ts`
- keep live review-state accumulation, counters, drift/boundary policy, and command/meta-surface analyzers local to `review-execution-state`
- add only the focused regressions needed to pin telemetry payload shaping, boundary inference, and stderr summary parity

## Out of Scope

- command-probe, command-intent, inspection-target, or meta-surface helper families already extracted in earlier lanes
- startup-anchor, active-closeout, relevant-reinspection, low-signal, verdict-stability, or timeout-policy changes
- prompt building, manifest/task resolution, review runtime selection, or issue-log capture changes in `scripts/run-review.ts`
- docs or runtime changes unrelated to the telemetry handoff boundary

## Current Hypothesis

The next truthful seam is the cluster around `buildTelemetryPayload(...)`, `getTerminationBoundaryRecord(...)`, `persistReviewTelemetry(...)`, `logReviewTelemetrySummary(...)`, `inferTerminationBoundaryKindsFromErrorMessage(...)`, `sanitizeTerminationBoundaryForPersistence(...)`, `sanitizeTelemetrySummaryForPersistence(...)`, and related redaction helpers still embedded in `scripts/lib/review-execution-state.ts`, with `scripts/run-review.ts` as the adjacent consumer.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npm run lint`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run test`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
