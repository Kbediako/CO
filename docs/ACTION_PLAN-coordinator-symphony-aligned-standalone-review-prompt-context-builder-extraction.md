# ACTION_PLAN: Coordinator Symphony-Aligned Standalone Review Prompt Context Builder Extraction

## Objective

Thin `scripts/run-review.ts` further by extracting the remaining prompt/context support cluster into a dedicated helper without reopening runtime, telemetry, or scope-parsing families.

## Steps

1. Register the lane docs-first with explicit evidence for the remaining `run-review` prompt/context seam.
2. Extract task-context lookup, active closeout provenance, NOTES fallback, and prompt scaffold assembly into a helper under `scripts/lib/`.
3. Rewire `scripts/run-review.ts` to delegate to that helper while keeping the runtime shell, scope collection, and monitoring logic local.
4. Tighten focused prompt/task-context regressions only where the extraction needs direct proof.
5. Run the lane validations, record review/elegance outcomes, and sync closeout mirrors.
