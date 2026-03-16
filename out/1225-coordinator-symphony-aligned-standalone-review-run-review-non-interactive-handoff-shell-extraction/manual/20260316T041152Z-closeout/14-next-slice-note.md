# 1225 Next Slice Note

- After `1225`, the standalone-review helper surface is already split across prompt context, scope advisory, non-interactive handoff, execution-boundary preflight, launch-attempt execution, runtime monitoring, telemetry shaping, and review-support classification.
- The next truthful move is a docs-first reassessment of the remaining orchestration-owned `scripts/run-review.ts` surface, not another forced micro-extraction.
- Candidate reassessment target:
  - the inline `runReview` / `writeTelemetry` adapter pair and whether they represent a real reusable boundary or should freeze as wrapper-owned orchestration glue
- Keep out of scope for the next lane:
  - prompt-context / scope-advisory / handoff / preflight / launch helper reshuffles already closed in prior lanes
  - broader wrapper rewrites without a newly demonstrated cohesive seam
  - speculative review-support family widening without a direct dependency edge
