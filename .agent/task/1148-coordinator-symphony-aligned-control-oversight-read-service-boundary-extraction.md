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
- [x] docs-review approval or explicit override captured for registered `1148`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/00-summary.md`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/05-docs-review-override.md`, `.runs/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction-scout/cli/2026-03-13T03-37-26-053Z-78fcb1b5/manifest.json`, `.runs/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/cli/2026-03-13T03-39-45-410Z-5ea75c4e/manifest.json`

## Control Oversight Read Service Boundary Extraction

- [x] One coordinator-owned oversight read service replaces the Telegram-named read adapter beneath the facade. Evidence: `orchestrator/src/cli/control/controlOversightReadService.ts`, `orchestrator/src/cli/control/controlOversightFacade.ts`
- [x] `controlOversightFacade.ts` remains the public coordinator-owned boundary and consumes the new read service. Evidence: `orchestrator/src/cli/control/controlOversightFacade.ts`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/11-manual-oversight-read-service-check.json`
- [x] Focused coordinator and Telegram regressions preserve the existing consumer behavior. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/05b-targeted-tests.log`, `orchestrator/tests/ControlOversightReadService.test.ts`, `orchestrator/tests/ControlOversightFacade.test.ts`, `orchestrator/tests/ControlTelegramBridgeBootstrapLifecycle.test.ts`, `orchestrator/tests/ControlTelegramBridgeLifecycle.test.ts`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/05-test.log`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/13-override-notes.md`
- [x] `npm run docs:check`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/08-diff-budget.log`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/13-override-notes.md`
- [x] `npm run review`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/09-review.log`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/10-pack-smoke.log`
- [x] Manual/mock oversight read-service evidence captured. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/11-manual-oversight-read-service-check.json`
- [x] Elegance review completed. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/12-elegance-review.md`
