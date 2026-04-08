# ACTION_PLAN - Coordinator Symphony-Aligned Snapshot Reads + Live Linear Dispatch Separation (1024)

## Phase 1. Docs-First Registration
- Register `1024` across PRD/TECH_SPEC/ACTION_PLAN/spec/checklist/agent mirror.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture a findings note grounding the slice in real Symphony snapshot guidance and the current CO live-Linear read mismatch.

## Phase 2. Snapshot/Dispatch Semantic Split
- Introduce a bounded runtime-owned advisory cache/single-flight refresh seam.
- Stop snapshot-state payloads from calling async live Linear evaluation.
- Split snapshot-level dispatch policy/status from explicit dispatch-route live evaluation.
- Make selected-run projection provider-free again.
- Limit snapshot `tracked` payloads to accepted advisory/runtime-owned context only.
- Keep `/api/v1/dispatch` as the explicit live advisory evaluation path.

## Phase 3. Validation
- Run targeted snapshot/dispatch/Linear-ingress regression tests.
- Capture manual simulated/mock evidence that state/issue/UI avoid live provider reads while dispatch remains explicit.
- Run the required validation gates and explicit elegance review.
- Record any review-wrapper, full-suite, or diff-budget overrides explicitly if they recur.

## Phase 4. Closeout
- Sync task/spec/mirror state to completed with evidence.
- Record the next slice only if a concrete async advisory-cache seam still dominates after the semantic split.
- Commit the slice cleanly.
