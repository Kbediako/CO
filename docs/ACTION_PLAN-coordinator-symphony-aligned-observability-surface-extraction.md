# ACTION_PLAN - Coordinator Symphony-Aligned Observability Surface Extraction (1018)

## Phase 1. Docs-First Registration
- Register `1018` across PRD/TECH_SPEC/ACTION_PLAN/spec/checklist/agent mirror.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture a short findings note grounding the slice in real Symphony’s controller/presenter split and CO’s stricter authority constraints.

## Phase 2. Observability-Surface Extraction
- Add a dedicated observability-surface module under `orchestrator/src/cli/control/`.
- Move read-only payload shaping for state/issue/refresh/UI routes behind that module.
- Keep `controlServer.ts` focused on route dispatch, auth, webhooks, and mutations.

## Phase 3. Validation
- Run targeted tests for affected read-only surfaces.
- Run manual simulated/mock usage checks for route coherence.
- Run the required validation gates and explicit elegance review.
- Record any diff-budget or review-wrapper overrides explicitly if the branch-level noise persists.

## Phase 4. Closeout
- Sync task/spec/mirror state to completed with evidence.
- Record the next slice recommendation from the new baseline.
- Commit the slice cleanly.
