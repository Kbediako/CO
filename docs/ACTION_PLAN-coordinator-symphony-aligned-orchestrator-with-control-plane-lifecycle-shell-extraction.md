# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1193`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the control-plane lifecycle shell seam. Evidence: `docs/findings/1193-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`, `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260314T144615Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Extract the remaining `withControlPlaneLifecycle(...)` shell from `orchestrator.ts`.
- [ ] Keep control-plane startup, failure handling, run-event publication, and cleanup ordering exact.
- [ ] Preserve focused regressions around control-plane lifecycle and run-event publisher behavior.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1193`.
