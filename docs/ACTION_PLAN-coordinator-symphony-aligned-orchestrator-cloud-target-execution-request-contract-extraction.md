# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud-Target Execution Request Contract Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1173`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the cloud-target execution request seam.

## Implementation

- [ ] Introduce one bounded same-module helper for the request contract passed into `CodexCloudTaskExecutor.execute(...)`.
- [ ] Rewire `executeOrchestratorCloudTarget(...)` to delegate only request shaping while keeping lifecycle and persistence local.
- [ ] Add focused request-shaping coverage without widening into cloud preflight, fallback, or executor-internal argv behavior.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1173`.
