# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Orchestration Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1190`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the orchestration-shell seam. Evidence: `docs/findings/1190-orchestrator-run-lifecycle-orchestration-shell-extraction-deliberation.md`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T125616Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Extract the remaining `performRunLifecycle(...)` orchestration shell from `orchestrator.ts`.
- [ ] Move or delegate the current `runLifecycleGuardAndPlanning(...)` and `executeRunLifecycleTask(...)` through the same shell move.
- [ ] Keep focused regressions on privacy-guard reset, guard short-circuit behavior, run-error ordering, and completion semantics.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1190`.
