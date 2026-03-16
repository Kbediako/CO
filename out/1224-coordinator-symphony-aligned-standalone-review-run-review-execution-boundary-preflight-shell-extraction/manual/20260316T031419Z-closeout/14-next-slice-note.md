# 1224 Next Slice Note

- The next truthful standalone-review move is the remaining `run-review.ts` non-interactive handoff shell, not a broader wrapper reshuffle.
- Candidate seam:
  - the post-prompt block that prepares review artifacts, derives `nonInteractive`, exports `MANIFEST` / `RUNNER_LOG` / `RUN_LOG`, and short-circuits to the printed handoff when live review execution is intentionally suppressed
- Keep out of scope for the next lane:
  - prompt-context assembly
  - execution-boundary preflight and launch-attempt runtime behavior
  - telemetry persistence/reporting and broader adapter extraction around `runReview` / `writeTelemetry`
  - manifest bootstrap, diff-budget plumbing, and CLI/help-text changes
- Rationale: after `1224`, the non-interactive handoff block is the last clearly cohesive island between prompt assembly and the already-extracted execution-boundary / launch helpers.
