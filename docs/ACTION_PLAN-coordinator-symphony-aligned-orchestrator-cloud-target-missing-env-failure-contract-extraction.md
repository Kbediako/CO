# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud-Target Missing-Env Failure Contract Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1174`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the missing-env contract seam.

## Implementation

- [ ] Introduce one bounded same-module helper for the missing-environment hard-fail projection in `orchestratorCloudTargetExecutor.ts`.
- [ ] Keep environment-id resolution, return-path control flow, and non-missing-env lifecycle behavior in `executeOrchestratorCloudTarget(...)`.
- [ ] Add focused missing-env coverage without widening into executor handoff, `onUpdate`, or post-execution result shaping.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1174`.
