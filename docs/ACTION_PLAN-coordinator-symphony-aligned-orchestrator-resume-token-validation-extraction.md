# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Resume Token Validation Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1199`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Capture local deliberation plus docs-review approval or explicit override for the resume-token validation seam.

## Implementation

- [ ] Extract the real `validateResumeToken(...)` behavior from `orchestrator.ts`.
- [ ] Keep file-read, missing-token, and mismatch semantics exact.
- [ ] Preserve focused regressions around the resume-token validation contract without widening into broader resume preparation or lifecycle behavior.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1199`.
