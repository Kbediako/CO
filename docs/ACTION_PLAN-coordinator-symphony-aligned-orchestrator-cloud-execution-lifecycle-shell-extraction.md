# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1178`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the cloud execution lifecycle shell seam.

## Implementation

- [x] Extract one bounded helper for the cloud execution lifecycle wrapper around `runOrchestratorExecutionLifecycle(...)`.
- [x] Keep `executeCloudPipeline()` as the public orchestrator boundary while delegating the inline `executeBody` note/success wiring.
- [x] Add focused regression coverage for lifecycle-shell delegation and note propagation without reopening cloud-target internals.

## Closeout

- [x] Run the standard gate bundle and capture closeout artifacts under `out/1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction/manual/20260314T060306Z-closeout/`.
- [x] Run an explicit elegance review.
- [x] Record the next truthful seam after `1178`.
