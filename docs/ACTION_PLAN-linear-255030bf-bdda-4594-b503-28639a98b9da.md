# ACTION_PLAN - CO: shift Linear intake to webhook-first targeted reconcile with slow full recovery sweeps
## Goal
- Reduce ordinary Linear request burn without regressing recovery behavior or operator-budget truth.
## Steps
1. Keep the docs-first packet registered and reviewed.
2. Split ordinary lifecycle behavior into targeted reconcile plus deferred bounded discovery.
3. Keep startup recovery and slower periodic recovery sweeps on full reconcile.
4. Trim discovery reads, add bounded eligible-target stopping, and preserve dispatch ordering.
5. Capture request-burn evidence, run validation, and hand off only after PR checks and review drain are clean.
## Validation
- `linear child-stream --pipeline docs-review`
- focused Vitest coverage for lifecycle, handoff, and dispatch source
- repo validation floor, standalone review, elegance pass, and `pack:smoke`
