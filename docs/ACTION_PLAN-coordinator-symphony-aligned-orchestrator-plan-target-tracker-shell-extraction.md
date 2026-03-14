# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Plan-Target Tracker Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1187`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the plan-target tracker shell. Evidence: `docs/findings/1187-orchestrator-plan-target-tracker-shell-extraction-deliberation.md`, `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/20260314T113555Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Extract one bounded plan-target tracker helper from `orchestrator.ts`.
- [ ] Keep `createRunLifecycleTaskManager(...)` registration assembly, `performRunLifecycle(...)`, public lifecycle entrypoints, and routing shells out of scope.
- [ ] Keep focused regressions on unchanged tracker attachment and `plan_target_id` behavior.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1187`.
