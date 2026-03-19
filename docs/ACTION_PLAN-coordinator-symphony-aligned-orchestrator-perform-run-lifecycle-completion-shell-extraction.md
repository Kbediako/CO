# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Completion Shell Extraction

## Docs-first

- [ ] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1161`.
- [ ] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Capture local deliberation plus docs-review approval or explicit override for the completion shell seam.

## Implementation

- [ ] Introduce one bounded completion shell adjacent to `orchestrator.ts`.
- [ ] Rewire `performRunLifecycle(...)` to delegate scheduler finalization, run-summary apply/persist, completion event emission, and return assembly through that helper without changing lifecycle authority.
- [ ] Keep focused completion regressions green across finalize/apply ordering, persistence continuity, and completion payload continuity.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1161`.
