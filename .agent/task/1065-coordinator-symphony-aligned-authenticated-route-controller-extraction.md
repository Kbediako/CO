# Task Checklist - 1065-coordinator-symphony-aligned-authenticated-route-controller-extraction

- MCP Task ID: `1065-coordinator-symphony-aligned-authenticated-route-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`

> This lane extracts the post-gate authenticated-route handoff while leaving `controlServer.ts` as the outer public-route/admission/fallback surface.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `tasks/specs/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `tasks/tasks-1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `.agent/task/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1065-authenticated-route-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `docs/findings/1065-authenticated-route-controller-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1065`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/`.

## Authenticated Route Controller Extraction

- [ ] A dedicated authenticated-route controller module is extracted under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/`.
- [ ] `controlServer.ts` is reduced to public-route ordering, authenticated admission, controller handoff, and protected fallback for authenticated routes. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Authenticated-route behavior remains explicit and test-covered. Evidence: `orchestrator/tests/`, `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] `npm run review`.
- [ ] `npm run pack:smoke` not required unless downstream-facing CLI/package/skills/review-wrapper paths change.
- [ ] Manual controller-handoff artifact captured.
- [ ] Elegance review completed.
