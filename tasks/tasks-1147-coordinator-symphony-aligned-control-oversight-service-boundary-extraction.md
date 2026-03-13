# Task Checklist - 1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction

- MCP Task ID: `1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`
- TECH_SPEC: `tasks/specs/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`

> This lane follows `1146` from the now-thinned Telegram baseline. The next bounded Symphony-aligned move is a coordinator-owned oversight facade that exposes the current Telegram consumer contract without reopening Telegram internals, config/env parsing, or broader authority boundaries.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`, `tasks/specs/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`, `tasks/tasks-1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`, `.agent/task/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`
- [x] Deliberation/findings captured for the coordinator-owned oversight seam. Evidence: `docs/findings/1147-control-oversight-service-boundary-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md`, `docs/findings/1147-control-oversight-service-boundary-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1147`. Evidence: `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T023133Z-docs-first/00-summary.md`, `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T023133Z-docs-first/04-docs-review.json`, `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T023133Z-docs-first/04a-delegated-scout.json`, `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T023133Z-docs-first/05-docs-review.json`, `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T023133Z-docs-first/05-docs-review-override.md`

## Control Oversight Service Boundary Extraction

- [ ] One coordinator-owned oversight facade exposes the current Telegram consumer contract.
- [ ] Telegram bootstrap/lifecycle consume the facade instead of stitching runtime/read helpers directly.
- [ ] Focused coordinator and Telegram regressions preserve the existing consumer behavior.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock oversight-facade evidence captured.
- [ ] Elegance review completed.
