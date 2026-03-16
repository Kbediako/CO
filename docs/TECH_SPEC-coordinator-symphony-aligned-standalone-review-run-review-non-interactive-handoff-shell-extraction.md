# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Run-Review Non-Interactive Handoff Shell Extraction

## Scope

This lane extracts the remaining non-interactive handoff shell from [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts) now that prompt context, scope advisory, execution-boundary preflight, launch-attempt execution, and telemetry shaping each already live behind dedicated seams.

## In Scope

- the inline post-prompt artifact/env/non-interactive handoff block before `prepareReviewExecutionBoundaryPreflight(...)`
- the smallest directly-related helpers still local to `scripts/run-review.ts` for `shouldForceNonInteractive()` and printed-handoff eligibility
- the behavior-preserving handoff from `run-review.ts` into the extracted helper and onward into the existing boundary/launch helpers

## Out of Scope

- prompt/task-context assembly in `scripts/lib/review-prompt-context.ts`
- scope/advisory shaping in `scripts/lib/review-scope-advisory.ts`
- execution-boundary normalization in `scripts/lib/review-execution-boundary-preflight.ts`
- child execution, retry behavior, and termination monitoring in `scripts/lib/review-launch-attempt.ts` / `scripts/lib/review-execution-runtime.ts`
- telemetry shaping/persistence, final closeout/reporting, manifest bootstrap, and CLI/help-text changes

## Requirements

1. Extract the cohesive non-interactive handoff shell into a dedicated helper/module.
2. Preserve current artifact creation, `MANIFEST` / `RUNNER_LOG` / `RUN_LOG` env export, and non-interactive env normalization.
3. Preserve current printed handoff wording and `FORCE_CODEX_REVIEW` suppression semantics.
4. Keep `run-review.ts` as the broader orchestration owner.
5. Add focused regression coverage for the extracted handoff shell.
