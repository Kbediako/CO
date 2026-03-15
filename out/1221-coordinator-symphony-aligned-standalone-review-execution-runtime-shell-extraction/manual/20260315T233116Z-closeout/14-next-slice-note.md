# 1221 Next Slice Note

- The next truthful standalone-review seam is the remaining launch-attempt orchestration shell in `scripts/run-review.ts`.
- Bounded scope candidate:
  - `ensureReviewCommandAvailable(...)`
  - `resolveReviewRuntimeContext(...)`
  - `buildReviewArgs(...)`
  - `resolveReviewCommand(...)`
  - `prepareReviewArtifacts(...)`
  - `maybeCaptureReviewFailureIssueLog(...)`
  - `shouldRetryWithoutScopeFlags(...)`
- Rationale: prompt/context construction already lives in `scripts/lib/review-prompt-context.ts`, runtime execution now lives in `scripts/lib/review-execution-runtime.ts`, and telemetry shaping already lives in `scripts/lib/review-execution-telemetry.ts`. The remaining large behaviorful cluster is the launch-attempt orchestration shell, not another tiny helper split.
