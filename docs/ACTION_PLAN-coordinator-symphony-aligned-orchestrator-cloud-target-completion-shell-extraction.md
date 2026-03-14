# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud-Target Completion Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1176`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the completion shell seam.

## Implementation

- [ ] Introduce one bounded same-module helper for the post-executor completion shell in `orchestratorCloudTargetExecutor.ts`.
- [ ] Keep resolution, missing-env handling, request shaping, executor invocation, and return-path control flow in `executeOrchestratorCloudTarget(...)`.
- [ ] Add focused success/failure completion coverage without widening into the broader executor lifecycle.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1176`.
