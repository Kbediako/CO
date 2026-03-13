# Task Checklist - 1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction

- MCP Task ID: `1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`
- TECH_SPEC: `tasks/specs/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`

> This lane follows `1147` from the now-correct public oversight facade. The next bounded Symphony-aligned move is to replace the Telegram-named read adapter underneath that facade with a coordinator-owned read service, without reopening Telegram behavior or control authority.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`, `tasks/specs/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`, `tasks/tasks-1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`, `.agent/task/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`
- [x] Deliberation/findings captured for the coordinator-owned oversight read-service seam. Evidence: `docs/findings/1148-control-oversight-read-service-boundary-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md`, `docs/findings/1148-control-oversight-read-service-boundary-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1148`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/00-summary.md`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/04-docs-review.json`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/04a-delegated-scout.json`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/05-docs-review-override.md`

## Control Oversight Read Service Boundary Extraction

- [ ] One coordinator-owned oversight read service replaces the Telegram-named read adapter beneath the facade.
- [ ] `controlOversightFacade.ts` remains the public coordinator-owned boundary and consumes the new read service.
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
- [ ] Manual/mock oversight read-service evidence captured.
- [ ] Elegance review completed.
