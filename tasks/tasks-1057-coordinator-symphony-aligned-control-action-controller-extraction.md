# Task Checklist - 1057-coordinator-symphony-aligned-control-action-controller-extraction

- MCP Task ID: `1057-coordinator-symphony-aligned-control-action-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-extraction.md`

> This lane extracts the remaining `/control/action` route-local controller shell into a dedicated controller module while leaving `controlServer.ts` as the route-matching and dependency-injection surface and preserving CO's explicit side-effect boundary.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-extraction.md`, `tasks/specs/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`, `tasks/tasks-1057-coordinator-symphony-aligned-control-action-controller-extraction.md`, `.agent/task/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1057-control-action-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`, `docs/findings/1057-control-action-controller-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1057`. Evidence: `<pending>`.

## Control Action Controller Extraction

- [ ] A dedicated `/control/action` controller module is extracted under `orchestrator/src/cli/control/`. Evidence: `<pending>`.
- [ ] `controlServer.ts` is reduced to route matching and dependency injection for this surface. Evidence: `<pending>`.
- [ ] Persistence, publish, audit emission, and response/error writes remain explicit and test-covered. Evidence: `<pending>`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `<pending>`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `<pending>`.
- [ ] `npm run build`. Evidence: `<pending>`.
- [ ] `npm run lint`. Evidence: `<pending>`.
- [ ] `npm run test`. Evidence: `<pending>`.
- [ ] `npm run docs:check`. Evidence: `<pending>`.
- [ ] `npm run docs:freshness`. Evidence: `<pending>`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `<pending>`.
- [ ] `npm run review`. Evidence: `<pending>`.
- [ ] `npm run pack:smoke` not required unless downstream-facing CLI/package/skills/review-wrapper paths change. Evidence: `<pending>`.
- [ ] Manual controller artifact captured. Evidence: `<pending>`.
- [ ] Elegance review completed. Evidence: `<pending>`.
