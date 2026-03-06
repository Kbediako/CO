# ACTION_PLAN - Coordinator Symphony-Aligned Observability Presenter/Controller Split (1019)

## Phase 1. Docs-First Registration
- Register `1019` across PRD/TECH_SPEC/ACTION_PLAN/spec/checklist/agent mirror.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture a short findings note grounding the slice in real Symphony’s controller/presenter split and the `1018` closeout recommendation.

## Phase 2. Presenter / Controller Refactor
- Refactor `observabilitySurface.ts` so it returns semantic payloads or presenter-classified outcomes rather than HTTP response objects.
- Refactor `controlServer.ts` so it maps methods, statuses, headers, and compatibility errors for the covered read-only routes.
- Keep `/api/v1/dispatch`, auth/session, webhooks, SSE, and mutations out of the slice.

## Phase 3. Validation
- Run targeted `ControlServer` coverage for the covered routes.
- Run manual simulated/mock route checks for state/issue/refresh/UI coherence.
- Run the required validation gates and explicit elegance review.
- Record any branch-scope diff-budget or review-wrapper overrides explicitly if they persist.

## Phase 4. Closeout
- Sync task/spec/mirror state to completed with evidence.
- Record the next slice recommendation only if a concrete residual coupling remains after implementation.
- Commit the slice cleanly.
