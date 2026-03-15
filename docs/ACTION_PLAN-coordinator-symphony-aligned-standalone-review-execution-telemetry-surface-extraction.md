# ACTION_PLAN: Coordinator Symphony-Aligned Standalone Review Execution Telemetry Surface Extraction

## Objective

Open the next truthful standalone-review follow-on after `1216` by extracting the deterministic execution telemetry payload/persistence cluster still reused between `review-execution-state` and `run-review`.

## Steps

1. Register `1217` docs-first with explicit evidence that the remaining truthful seam is the telemetry payload/persistence family, not another path-family or policy split.
2. Extract the bounded telemetry helper while preserving live review-state accumulation and boundary policy ownership in `scripts/lib/review-execution-state.ts`.
3. Rewire `scripts/run-review.ts` to the extracted helper without changing persisted telemetry schema, stderr summary wording, or failure-boundary behavior.
4. Add only the focused regressions needed to pin telemetry payload shaping, termination-boundary inference, and stderr summary parity.
5. Run the lane validations and record any truthful docs-review, full-suite, or bounded-review overrides.
