# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Launch-Attempt Orchestration Shell Extraction

## Scope

This lane extracts the cohesive launch-attempt orchestration shell from [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts) after `1221` removed the lower-level execution runtime boundary.

## In Scope

- `ensureReviewCommandAvailable(...)`
- `resolveReviewRuntimeContext(...)`
- `buildReviewArgs(...)`
- `resolveReviewCommand(...)`
- `prepareReviewArtifacts(...)`
- `maybeCaptureReviewFailureIssueLog(...)`
- `shouldRetryWithoutScopeFlags(...)`
- the smallest directly-related types/helpers those functions need when they are launch-attempt-local

## Out of Scope

- prompt/task-context assembly
- non-interactive handoff gating
- child process execution and termination monitoring in `scripts/lib/review-execution-runtime.ts`
- final telemetry shaping and persistence in `scripts/lib/review-execution-telemetry.ts`

## Requirements

1. Extract the launch-attempt orchestration cluster into a dedicated helper/module.
2. Preserve current runtime command resolution, scope-flag retry, and doctor issue-log capture semantics.
3. Keep `run-review.ts` as the higher-level orchestration owner.
4. Add focused regression coverage for the extracted launch-attempt boundary.
