# ACTION_PLAN - Coordinator Symphony-Aligned Dispatch Presenter/Controller Extraction (1020)

## Phase 1. Docs-First Registration
- Register `1020` across PRD/TECH_SPEC/ACTION_PLAN/spec/checklist/agent mirror.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture a short findings note grounding the slice in the `1019` closeout recommendation and real Symphony controller/presenter layering.

## Phase 2. Dispatch Presenter / Controller Refactor
- Extract dispatch payload shaping and failure classification out of the inline `/api/v1/dispatch` route body.
- Keep `controlServer.ts` responsible for `GET` gating, status/header mapping, and dispatch audit emission.
- Keep state/issue/refresh/UI behavior unchanged.

## Phase 3. Validation
- Run targeted dispatch-oriented `ControlServer` coverage.
- Run manual simulated/mock dispatch checks.
- Run the required validation gates and explicit elegance review.
- Record any diff-budget or review-wrapper overrides explicitly if they persist.

## Phase 4. Closeout
- Sync task/spec/mirror state to completed with evidence.
- Record the next slice recommendation only if a concrete read-only seam remains after dispatch extraction.
- Commit the slice cleanly.
