# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Run-Review Execution-Boundary Preflight Shell Extraction

## Scope

This lane extracts the remaining execution-boundary preflight shell from [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts) now that prompt context, runtime execution, launch-attempt handling, scope advisory, and telemetry shaping each already live behind dedicated seams.

## In Scope

- the inline runtime/boundary-preflight block before `runCodexReview(...)`
- the smallest directly-related helpers still local to `scripts/run-review.ts` for bounded-mode parsing and timeout/startup-loop env resolution
- the behavior-preserving config handoff from `run-review.ts` into the extracted execution-boundary helper

## Out of Scope

- prompt/task-context assembly in `scripts/lib/review-prompt-context.ts`
- scope/advisory shaping in `scripts/lib/review-scope-advisory.ts`
- child execution, retry behavior, and termination monitoring in `scripts/lib/review-execution-runtime.ts`
- telemetry shaping/persistence in `scripts/lib/review-execution-telemetry.ts`
- final closeout/reporting assembly and CLI/help-text changes

## Requirements

1. Extract the cohesive execution-boundary preflight cluster into a dedicated helper/module.
2. Preserve current bounded-mode and env-driven timeout/startup-loop semantics.
3. Preserve current audit/architecture/diff-mode boundary wiring and launch guidance strings.
4. Keep `run-review.ts` as the broader orchestration owner.
5. Add focused regression coverage for the extracted execution-boundary boundary.
