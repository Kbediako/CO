# ACTION_PLAN - Coordinator Symphony-Aligned Control Runtime Boundary Extraction (1023)

## Phase 1. Docs-First Registration
- Register `1023` across PRD/TECH_SPEC/ACTION_PLAN/spec/checklist/agent mirror.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture a findings note grounding the slice in the real Symphony orchestrator/presenter boundary and the current `controlServer.ts` runtime concentration.

## Phase 2. Runtime Boundary Extraction
- Introduce a dedicated internal control runtime module.
- Repoint `controlServer.ts`, HTTP/UI reads, and Telegram read adapter wiring to use that runtime boundary.
- Rewire compatibility refresh to invalidate and warm the shared runtime boundary instead of acknowledging only at the route layer.
- Preserve shared selected-run/advisory/read payload behavior and observability publish/subscribe behavior.

## Phase 3. Validation
- Run targeted runtime-boundary, control-surface, and Telegram/coherence tests.
- Include explicit refresh invalidation/warm-path coverage.
- Run manual simulated/mock verification for shared runtime reads and observability update subscription coherence.
- Run the required validation gates and explicit elegance review.
- Record any review-wrapper or branch-scope overrides explicitly if they recur.

## Phase 4. Closeout
- Sync task/spec/mirror state to completed with evidence.
- Record the next slice only if a concrete remaining Linear cache/ingress or protocol seam still dominates after runtime extraction.
- Commit the slice cleanly.
