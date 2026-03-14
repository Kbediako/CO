# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1191`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the cloud execution lifecycle shell seam. Evidence: `docs/findings/1191-orchestrator-cloud-execution-lifecycle-shell-extraction-deliberation.md`, `out/1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction/manual/20260314T132545Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Extract the private cloud execution lifecycle shell from `orchestrator.ts`.
- [ ] Keep `executeCloudPipeline(...)` as the thin delegate over the extracted helper.
- [ ] Preserve failure-detail forwarding, env merge behavior, note ordering, and lifecycle passthrough semantics in focused regressions.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1191`.
