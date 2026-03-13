# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-Registration Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1160`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the execution-registration shell seam. Evidence: `docs/findings/1160-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction-deliberation.md`, `out/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction/manual/20260313T150927Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Introduce one bounded execution-registration shell adjacent to `orchestrator.ts`.
- [ ] Rewire `performRunLifecycle(...)` to delegate dedupe/result-wiring/TaskManager registration through that helper without changing lifecycle authority.
- [ ] Keep focused lifecycle/registration regressions green across dedupe behavior, routed executor forwarding, and result continuity.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1160`.
