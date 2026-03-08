# Task Checklist - 1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction

- MCP Task ID: `1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`
- TECH_SPEC: `tasks/specs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`

> This lane extracts a single review execution state/monitor owner from `scripts/run-review.ts` so standalone review reliability becomes structurally closer to the real Symphony pattern of one state owner plus thin controller/projection layers.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `tasks/specs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `tasks/tasks-1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `.agent/task/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1058-standalone-review-execution-state-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `docs/findings/1058-standalone-review-execution-state-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1058`. Evidence: `<pending>`.

## Standalone Review Execution State Extraction

- [ ] A dedicated review execution state/monitor module is extracted adjacent to `scripts/run-review.ts`. Evidence: `<pending>`.
- [ ] `scripts/run-review.ts` becomes a thinner shell over prompt/runtime/launch orchestration. Evidence: `<pending>`.
- [ ] Telemetry persistence, checkpoint logging, and failure summaries are driven from the shared runtime snapshot. Evidence: `<pending>`.

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
- [ ] `npm run pack:smoke`. Evidence: `<pending>`.
- [ ] Manual review-wrapper/runtime artifact captured. Evidence: `<pending>`.
- [ ] Elegance review completed. Evidence: `<pending>`.
