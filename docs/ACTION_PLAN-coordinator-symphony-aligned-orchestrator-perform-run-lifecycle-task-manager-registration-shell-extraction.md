# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Task-Manager Registration Shell Extraction

## Docs-first

- [ ] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1162`.
- [ ] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Capture local deliberation plus docs-review approval or explicit override for the TaskManager-registration seam.

## Implementation

- [ ] Introduce one bounded TaskManager-registration shell adjacent to `orchestrator.ts`.
- [ ] Rewire `performRunLifecycle(...)` to delegate execution-registration composition, `TaskManager` creation, and plan-target tracker attachment through that helper without changing lifecycle authority.
- [ ] Keep focused manager-wiring / plan-target tracking regressions green.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1162`.
