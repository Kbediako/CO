# ACTION_PLAN - Coordinator Symphony-Aligned Projection Boundary + Live Linear Refresh (1017)

## Summary
- Goal: extract the selected-run projection boundary from `controlServer.ts` while keeping async live Linear evaluation and all read surfaces coherent.
- Scope: one docs-first task registration, one delegated scout/docs-review loop, one projection-module extraction, and the smallest validation/closeout set required for a clean slice.
- Assumptions:
  - `1015` and `1016` behavior is the functional baseline,
  - the real `openai/symphony` repo is a read-only reference for layering and poll-and-project discipline,
  - webhook ingress and Telegram push behavior should remain functionally stable in this slice.

## Milestones & Sequencing
1) Register `1017` docs-first artifacts, findings, and task mirrors.
2) Capture delegated scout evidence and top-level docs-review before runtime edits.
3) Extract the selected-run projection boundary into a dedicated control module and rewire `controlServer.ts` to use it.
4) Run targeted coherence validation plus the required repo gate chain.
5) Run explicit elegance review, sync task/docs mirrors, and commit the coherent `1017` slice.

## Dependencies
- `1015`
- `1016`
- `out/symphony-research/20260306T080156Z-real-upstream-alignment/00-summary.md`

## Validation
- Checks / tests:
  - delegated scout manifest for `1017-...-scout`,
  - top-level `docs-review`,
  - targeted selected-run/read-surface tests,
  - `node scripts/delegation-guard.mjs`,
  - `node scripts/spec-guard.mjs --dry-run`,
  - `npm run build`,
  - `npm run lint`,
  - `npm run test`,
  - `npm run docs:check`,
  - `npm run docs:freshness`,
  - `node scripts/diff-budget.mjs`,
  - `npm run review`,
  - `npm run pack:smoke` if downstream-facing paths require it.
- Rollback plan:
  - restore the extracted projection helpers back into `controlServer.ts`,
  - remove the new projection module,
  - confirm state/issue/UI/dispatch fall back to the `1016` baseline.

## Risks & Mitigations
- Risk: the extraction subtly changes payload shape or selected-run coherence.
  - Mitigation: keep function signatures narrow, add targeted regression tests, and validate all affected surfaces together.
- Risk: async live Linear evaluation gets duplicated or detached from the shared projection.
  - Mitigation: keep evaluation inside the extracted boundary and test for repeated render-path calls explicitly.
- Risk: the slice grows into a broader Telegram or webhook refactor.
  - Mitigation: treat those as explicit non-goals and keep runtime changes centered on the projection boundary only.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
