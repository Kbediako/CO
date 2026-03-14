# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Local Execution Lifecycle Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1179`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the local execution lifecycle shell seam.

## Implementation

- [x] Extract one bounded helper for the local execution lifecycle wrapper around `runOrchestratorExecutionLifecycle(...)`.
- [x] Keep `executeLocalRoute()` as the router-local boundary while delegating fallback-summary shaping, auto-scout pass-through, local executor wiring, and post-finalize guardrail-summary append.
- [x] Add focused regression coverage for the extracted local lifecycle shell without reopening runtime selection or local executor internals.

## Closeout

- [x] Run the standard gate bundle and capture closeout artifacts under `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T062139Z-closeout/`.
- [x] Run an explicit elegance review.
- [x] Record the next truthful seam after `1179`.
