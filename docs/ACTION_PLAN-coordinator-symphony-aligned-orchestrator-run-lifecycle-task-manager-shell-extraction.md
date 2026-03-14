# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1189`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the task-manager shell seam. Evidence: `docs/findings/1189-orchestrator-run-lifecycle-task-manager-shell-extraction-deliberation.md`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124000Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Extract the remaining `createRunLifecycleTaskManager(...)` shell from `orchestrator.ts`.
- [ ] Remove the one-call-site local `createTaskManager(...)` forwarding wrapper as part of the same move.
- [ ] Keep focused regressions on manager creation, attach-after-success behavior, and no-attach-on-manager-failure behavior.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1189`.
