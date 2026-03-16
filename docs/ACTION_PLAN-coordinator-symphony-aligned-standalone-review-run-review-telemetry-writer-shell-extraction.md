# ACTION_PLAN: Coordinator Symphony-Aligned Standalone Review Run-Review Telemetry Writer Shell Extraction

1. Register `1226` docs-first around the remaining inline telemetry-writer callback in `scripts/run-review.ts`, explicitly keeping the sibling `runReview` adapter inline and out of scope.
2. Move the callback behavior into `scripts/lib/review-execution-telemetry.ts` using `ReviewExecutionState.buildTelemetryPayload(...)` as the canonical payload source while preserving persistence-failure logging.
3. Add focused regressions, run the deterministic validation lane, and record the truthful next-slice note based on whether any real `run-review.ts` extraction remains after the telemetry writer moves.
