# 1129 Next Slice Note

- Next truthful slice: explicit boundary provenance for standalone-review failure telemetry and terminal output.
- Why: `1129` fixes the architecture in-bounds timeout path, but the operator still has to infer the exact boundary class from free-form error text and general telemetry counters.
- Bounded seam:
  - `scripts/lib/review-execution-state.ts`
  - `scripts/run-review.ts`
  - `tests/review-execution-state.spec.ts`
  - `tests/run-review.spec.ts`
- Goal: make dwell-boundary / verdict-stability / meta-surface / startup-anchor termination classes first-class and stable in telemetry and user-facing failure output.
