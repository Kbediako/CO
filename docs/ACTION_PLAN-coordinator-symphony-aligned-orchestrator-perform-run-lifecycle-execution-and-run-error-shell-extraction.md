# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-and-Run-Error Shell Extraction

## Prep

- [ ] Capture local deliberation plus docs-review approval or explicit override for the execution / run-error seam.
- [ ] Keep the docs/index/task mirrors synchronized for `1164`.

## Implementation

- [ ] Introduce one bounded class-local execution / run-error helper adjacent to `performRunLifecycle(...)`.
- [ ] Rewire `performRunLifecycle(...)` to delegate `manager.execute(...)` plus `runError(...)` catch / rethrow behavior through that helper without changing surrounding lifecycle ownership.
- [ ] Keep focused success/failure regressions green.

## Validation

- [ ] Run the deterministic gate bundle for the final tree.
- [ ] Run a bounded review pass plus an explicit elegance review.
- [ ] Capture manual/mock execution / run-error evidence and the next-slice note before closeout.
